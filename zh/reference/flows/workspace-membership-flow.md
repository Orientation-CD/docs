# 工作区与成员关系流程（端到端）

这是**工作区**的完整链路——用户首次登录时个人工作区如何创建、
如何通过邀请链接加入企业工作区，以及每次设计作业上如何强制访问/角色。

## 工作区模型

每个用户恰好有一个**个人工作区**，在首次登录时自动创建：

```
User (users) ───1:1──► Workspace (workspaces) ───1:1──► PersonalWorkspace (personal_workspaces)
                          │
                          ├──1:N──► WorkspaceMembership (workspace_memberships)
                          │
                          └──► Enterprise (enterprises)  (workspace_kind = enterprise)
                                  ├──1:N──► EnterpriseMembership (enterprise_memberships)
                                  └──1:N──► EnterpriseInvitation (enterprise_invitations)
```

- `workspaces` 是多态根（kind：`personal` | `enterprise`）。
- 个人工作区积分持存在 `users` 行上（`remaining_tokens`）。
- 企业积分持存在 `enterprises` 行上；成员关系携带角色（`owner` / `member`）
  和权益。

## 第 0 部分——首次登录时的个人工作区

```
WeChat login (new user)
  → create_personal_workspace(db, user)
      • INSERT workspaces (kind=personal, owner_id=user.id)
      • INSERT personal_workspaces (workspace_id)
      • INSERT workspace_membership (user_id, role=owner, is_primary=true)
```

这与用户创建在同一个事务中运行，因此新用户在令牌对返回前就一定已有一个可用的
工作区。

## 第 1 部分——列出 / 切换工作区

```
GET  /v1/workspaces
  workspace_api.py → list_workspace_summaries(...)
    personal_workspace_summary(user) + enterprise_workspace_summary(ent)
    → [WorkspaceSummary]  (id, name, kind, role, token balance, active)

GET  /v1/workspaces/{workspace_id}
  workspace_api.py → workspace_detail(...)
    • accessible_workspace(db, user, id) enforces membership
    • roles, member count, entitlements, plan

PATCH /v1/workspaces/{workspace_id}
  workspace_api.py → update
    • require_workspace_owner(user, workspace)  (app/workspaces.py)
    • update name / settings
```

每个设计作业 / 计费 / 资源请求都通过 `accessible_workspace(db, user, workspace_id)`
（写操作用 `lock_accessible_workspace`）解析其工作区：先查成员关系、
工作区是否活跃，再走业务规则。

## 第 2 部分——创建企业工作区

```
POST /v1/workspaces
  body: { name }
        │
        ▼
workspace_api.py → create_workspace
  1. get_current_user; owned_workspace_count(user)
  2. INITIAL_USER_ALLOWED_WORKSPACES limits how many enterprises a user can own
  3. INSERT workspaces (kind=enterprise)
       + enterprises row (name, token pool, capacity)
       + enterprise_memberships (user_id, role=owner)
  4. return WorkspaceDetailResponse
```

## 第 3 部分——所有者邀请成员

```
POST /v1/workspaces/{workspace_id}/invitations
  body: { phone_e164?, role? }          (direct invitation)
        │
        ▼
billing_api.py / workspace_api.py
  create_enterprise_invitation(...)
    • require_workspace_owner
    • ensure_enterprise_member_capacity(...)
    • INSERT enterprise_invitations
        (workspace_id, phone_e164?, role, status=PENDING, token)
```

或通过可分享链接：

```
POST /v1/workspaces/{workspace_id}/share-invitations
  → workspace_share_invitations row (token, expires_at, role)
  → returns a link the owner copies into WeChat
```

## 第 4 部分——被邀请人预览并接受

```
Invitee opens the link in the mini program (must already be logged in)
        │
        ▼
POST /v1/share-invitations/preview
  body: { token }
  → { workspace_name, inviter_name, role, expires_at }
    (does NOT consume the invitation)
        │
        ▼
User taps "加入"
        ▼
POST /v1/share-invitations/accept
  body: { token }
        │
        ▼
app/billing.py: accept_enterprise_invitation_by_id(...)
  1. load invitation (row lock, enterprise lock)
  2. validate status=PENDING, not expired, not already a member
  3. _validate_pending_invitation(user, invitation)
  4. INSERT enterprise_memberships (user_id, enterprise_id, role)
  5. mark invitation ACCEPTED
  6. return membership summary
```

直接（非链接）邀请通过 `POST /v1/workspace/invitations/{invitation_id}/accept`
接受；通过 `POST /v1/workspace/invitations/{invitation_id}/decline` 拒绝；
通过 `DELETE /v1/workspace/invitations/{invitation_id}` 撤销。

## 第 5 部分——角色与权限

| 操作 | 所需角色 |
| --- | --- |
| 提交设计作业、花积分 | 成员或所有者（该工作区） |
| 查看工作区详情、列出成员 | 任意成员 |
| 重命名工作区、编辑设置 | 所有者 |
| 邀请 / 撤销邀请 | 所有者 |
| 移除其他成员 | 所有者 |
| 退出工作区（自己） | 成员（`DELETE /v1/workspaces/{id}/membership`） |
| 解散企业 | 所有者 |

强制点：

- `accessible_workspace(...)`——读路径：成员关系存在、工作区活跃。
- `lock_accessible_workspace(...)`——写路径：相同，在锁下。
- `require_workspace_owner(...)`——仅所有者的变更。
- 在企业上花积分从**企业**池扣（而非个人余额）；`_locked_token_account(db, design_job)`
  在 `User` 或 `Enterprise` 之间选择。

## 第 6 部分——清理

- `remove_enterprise_member(...)`——所有者驱逐某成员；其成员关系行被归档。
- `DELETE /v1/workspaces/{id}/members/{member_user_id}`——同上。
- `dissolve_enterprise(...)`——所有者解散；`_retire_user_relationships` 归档
  成员关系，让工作区进入安全状态。

## 写入的数据

| 表 | 内容 |
| --- | --- |
| `workspaces` + `personal_workspaces` | 首次登录每用户一个 |
| `workspace_memberships` | 个人工作区成员关系 |
| `enterprises` + `enterprise_memberships` | 企业 + 所有者/成员行 |
| `enterprise_invitations` / `workspace_share_invitations` | 待处理/已接受邀请 |

## 相关调用链

- [微信登录流程](/reference/flows/wechat-login-flow)——创建个人工作区。
- [设计作业生命周期](/reference/flows/design-job-lifecycle)——每个作业携带通过
  `accessible_workspace` 解析的 `workspace_id`。
- [支付流程](/reference/flows/payment-flow)——企业 vs 个人积分池。
