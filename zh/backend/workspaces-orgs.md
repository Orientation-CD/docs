# 工作区、企业与成员关系

每个已认证用户都在一个**工作区**内操作。工作区分两种——**个人**和
**企业**——它们决定一个请求能接触哪些资产、设计作业、报告和积分余额。本页解释工作区模型、企业成员关系与角色、邀请，以及推荐系统如何挂到账号上。代码在
`app/workspaces.py` 和 `app/workspace_api.py`；表在
[数据模型](/reference/data-model)页。

## `Workspace` 层级

`Workspace` 是共享基表。存在两种（`WorkspaceKind`）：

| 类型 | 行 | 所有者 | 积分钱包 |
| --- | --- | --- | --- |
| `PERSONAL` | `personal_workspaces` | 恰好一个 `User` | 用户个人 `User` 钱包 |
| `ENTERPRISE` | `enterprises` | 一组成员 | 共享 `Enterprise` 钱包 |

个人工作区在用户首次登录时**自动**创建（`workspaces.create_personal_workspace`，命名为 `个人空间`），并被设为用户的
`current_workspace_id`。它永远不能被移除。

## 访问规则

`workspaces.accessible_workspace(db, user, workspace_id)` 是每个工作区级端点调用的唯一门：

- 如果 ID 解析为 `user` 拥有的 `personal_workspaces` 行，则授予访问（无需成员关系）。
- 否则查找用户在该企业的 `enterprise_memberships` 行；无成员关系 →
  `403 WORKSPACE_ACCESS_DENIED`。
- 如果企业不活跃或软删除（`removed_at` 已设置）→
  `409 WORKSPACE_INACTIVE`。

对于写入，`lock_accessible_workspace` 按固定顺序（企业 → 成员关系）加行锁以避免死锁。

## 角色

企业成员关系携带一个 `EnterpriseRole`：

| 角色 | 能做什么 |
| --- | --- |
| `OWNER` | 管理成员、邀请/移除成员、解散企业、为企业钱包充值、编辑报告配置 |
| `MEMBER` | 使用企业积分、创建作业、读取共享资产/报告 |

`require_workspace_owner(membership)` 强制仅所有者变更（`403 WORKSPACE_OWNER_REQUIRED`）。

## 当前工作区与所属工作区额度

`User.current_workspace_id` 指向活跃工作区。
`ensure_current_workspace` 修复过期指针：如果保存的 ID 不再可访问，回退到用户的个人工作区。

一个用户可以拥有有限数量的工作区。`owned_workspace_count` 计算个人工作区加上用户作为 `OWNER` 的活跃企业；上限为
`INITIAL_USER_ALLOWED_WORKSPACES`（默认 **2**，即个人 + 一个所属企业）。加入的成员关系**不**计入此额度。

## 列表与详情

`list_workspace_summaries` 先返回个人工作区，再返回用户所属的所有活跃企业（按 `joined_at` 排序）。每个摘要报告
`remaining_tokens`、`reserved_tokens`、成员数/上限，以及（对个人工作区）当前订阅权益。`workspace_detail` 返回企业的成员列表。

## 邀请

存在两套邀请系统：

### 企业邀请

`enterprise_invitations` 行将邮箱/手机号绑定到企业 + 角色，带令牌和过期时间（`ENTERPRISE_INVITATION_HOURS`，默认 72）。所有者创建一个
（`create_enterprise_invitation`），接收者接受
（`accept_enterprise_invitation_by_id`），后者由
`ensure_enterprise_member_capacity` 对照 `Enterprise.member_limit` 限制。所有者可以撤销（`revoke_enterprise_invitation`）或拒绝/移除成员
（`decline_enterprise_invitation`、`remove_enterprise_member`）。

### 工作区分享邀请

`workspace_share_invitations`（外加
`share_invitation_idempotency`）支持分享链接，有自己的预览/接受限流
（`SHARE_INVITATION_PREVIEW_RATE_LIMIT_ATTEMPTS`、
`SHARE_INVITATION_ACCEPT_RATE_LIMIT_ATTEMPTS`，窗口 300s）。

## 访问流程

以请求 `workspace_id = <X>` 为例。`accessible_workspace` 依次运行以下检查：

1. `<X>` 是否为当前用户拥有的 `personal_workspaces` 行？如果是，授予（用户拥有它）。
2. 否则，查找 `(user_id, enterprise_id = X)` 的
   `enterprise_memberships`。如果没有，返回 `403 WORKSPACE_ACCESS_DENIED`。
3. 加载关联的 `Enterprise`。如果 `is_active = false` 或
   `removed_at` 已设置，返回 `409 WORKSPACE_INACTIVE`。
4. 否则授予并返回 `(enterprise, membership)`，暴露调用者的
   `role`，使端点可以决定操作是否仅所有者可用。

这同一个门支撑资产读取、设计作业创建、报告读取和积分花费——没有单独的按资源 ACL 表；成员关系加上工作区行就是授权。

## 创建、切换和离开

- 用户用 `POST /v1/workspaces` 创建企业。他们成为第一个
  `OWNER`；这消耗 `INITIAL_USER_ALLOWED_WORKSPACES` 的一个名额。
- `GET /v1/me/workspaces` 先返回个人工作区，再返回每个活跃企业成员关系（按
  `joined_at` 排序），外加持久化的
  `current_workspace_id`。
- 成员用 `DELETE /v1/workspaces/{id}/membership` 离开；所有者用
  `DELETE /v1/workspaces/{id}/members/{user_id}` 移除另一成员。
- 所有者用 `dissolve_enterprise` 解散企业，这会终止成员关系但不销毁计费/审计历史。

## 解散与账号生命周期

所有者可以解散企业（`dissolve_enterprise`），这会终止其成员关系和关联但不删除工作区行。用户侧，停用流程在
[认证](/backend/authentication#account-lifecycle-endpoints)中描述：
`/me/deactivate` 开启宽限期（`ACCOUNT_DEACTIVATION_GRACE_DAYS`，
默认 7），之后 worker 匿名化账号。管理员操作可以暂停、恢复或归档用户。

## 推荐系统

推荐在注册时挂载邀请人 → 被邀请人关系。相关表：

| 表 | 用途 |
| --- | --- |
| `referral_invitations` | 用户创建的一次性邀请凭证（存储摘要，创建后不再返回令牌） |
| `referral_attributions` | 不可变的**先到先得**邀请人→被邀请人归因 |
| `referral_identity_claims` | 用于滥用审查的 IP/设备身份证据 |
| `reward_grants` / `reward_grant_items` | 承诺的积分奖励 |
| `reward_claims` / `reward_fulfillments` | 显式认领 → 积分发放 |
| `referral_reward_sources` | 哪个购买触发了奖励 |
| `reward_outbox_events` | 下游奖励副作用的事务性发件箱 |
| `reward_operation_idempotency` | 奖励变更的幂等性 |

流程（`app/referral_api.py`）：

- `POST /v1/referral-invitations` —— 创建凭证（幂等）。
- `POST /v1/referral-invitations/preview` —— 公开预览（IP 限制）。
- `POST /v1/referral-invitations/accept` —— 新注册被邀请人绑定归因（幂等，先到先得）。
- `GET /v1/rewards` —— 列出用户的奖励。
- `POST /v1/rewards/claim` —— 认领奖励积分到个人钱包。

默认活动（`REFERRAL_CAMPAIGN_CODE=REFERRAL_FIRST_PURCHASE`）仅在被邀请人首次不可退款购买至少
`REFERRAL_MINIMUM_PURCHASE_FEN`（990 分）后奖励邀请人。运行期奖励额度存放在
`campaign_configurations` 中，带乐观版本控制。参见
[计费与积分](/backend/billing-tokens#referral--campaign-token-grants)。

## 延伸阅读

- [认证](/backend/authentication) —— 登录和管理后台会话。
- [计费与积分](/backend/billing-tokens) —— 企业钱包充值。
- [数据模型](/reference/data-model) —— 所有工作区/企业表。
