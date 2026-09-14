# 数据模型

本页记录 `app/db_models.py` 中的每个 SQLAlchemy 模型（约 2,660 行，
52 张表）。它是 PostgreSQL schema 的唯一事实来源。下表中的表名和列名与 ORM 完全一致；迁移在 `alembic/`。

约定：除非注明，每行都有 `id`（UUID 主键）和 `created_at` /
`updated_at` 时间戳。字符串枚举存储其 `.value`，而非 Python 成员名。

## 枚举（参考）

| 枚举 | 值 |
| --- | --- |
| `DesignJobStatus` | `pending`, `running`, `completed`, `failed` |
| `DesignJobSubmissionStatus` | `pending`, `running`, `completed`, `failed` |
| `ProviderDispatchState` | `PREPARED`, `DISPATCHING`, `STAGED`, `TERMINAL` |
| `ProviderAcceptanceCertainty` | `NOT_SENT`, `REJECTED`, `UNKNOWN` |
| `ProviderRetryDisposition` | `SAFE_AUTOMATIC`, `CLIENT_AFTER_CHANGE_OR_DELAY`, `NEVER` |
| `DesignJobResultKind` | `IMAGE`, `HTML_REPORT`, `MARKDOWN` |
| `ReportContentSource` | `PROVIDER_RENDER`, `OSS_LIBRARY` |
| `DesignReportItemStatus` | `pending`, `ready`, `failed` |
| `ReportTemplateScopeKind` | `global`, `enterprise` |
| `UserType` | `personal`, `enterprise`, `admin` |
| `AccountStatus` | `active`, `deactivated`, `suspended`, `anonymized` |
| `EnterpriseRole` | `owner`, `member` |
| `WorkspaceKind` | `personal`, `enterprise` |
| `JobTokenState` | `unreserved`, `reserved`, `settled`, `released` |
| `TokenSource` | `personal`, `enterprise` |
| `TokenDetailType` | `INITIAL_TOKEN_GRANT`, `TOKEN_PURCHASE`, `DESIGN_JOB_RESERVE`, `DESIGN_JOB_CONSUMED`, `DESIGN_JOB_RELEASE`, `SUBSCRIPTION_PURCHASE`, `SUBSCRIPTION_EXPIRATION`, `REFUND_DEDUCTION`, `TOKEN_ADJUSTMENT_CREDIT`, `TOKEN_ADJUSTMENT_DEDUCTION`, `GLOBAL_TOKEN_PURCHASE`, `GLOBAL_TOKEN_ADJUSTMENT_CREDIT`, `GLOBAL_TOKEN_ADJUSTMENT_DEDUCTION`, `REFERRAL_REWARD`, `REFERRAL_REWARD_CLAWBACK` |
| `SubscriptionInterval` | `monthly`, `quarterly`, `yearly` |
| `SubscriptionStatus` | `pending`, `active`, `expired` |
| `PaymentType` | `app`, `jsapi` |
| `PaymentKind` | `subscription`, `token_purchase` |
| `PaymentStatus` | `pending`, `paid`, `closed`, `refunded` |
| `RewardGrantStatus` | `holding`, `claimable`, `claimed`, `expired` |
| `CampaignCode` | `NEW_USER_REGISTRATION` |
| `RefundStatus` | `pending`, `succeeded`, `failed` |
| `FinanceCostCategory` | `cloud`, `model_provider` |
| `LegalDocumentType` | `terms`, `privacy` |
| `AssetType` | `IMAGE`, `DOCUMENT`, `AUDIO` |
| `AssetVisibility` | `PRIVATE`, `PUBLIC` |
| `AssetStatus` | `PENDING_UPLOAD`, `READY`, `RESERVED`, `ACTIVE` |
| `AssetUploadPurpose` | `DESIGN_JOB_INPUT`, `ADMIN_IMAGE`, `LEGAL_DOCUMENT` |
| `DesignJobAssetRole` | `image`, `masked_image`, `reference_image`, `result_image`, `recording` |

## 身份与访问

### `users`

注册账号。

| 列 | 说明 |
| --- | --- |
| `id` | 主键 |
| `wechat_openid` | 唯一微信 OpenID（纯密码账号可空） |
| `phone_e164` | 唯一归一化手机号 |
| `password_hash` | Argon2id 哈希（纯微信账号可空） |
| `display_name`, `avatar_url` | 资料 |
| `user_type` | `UserType` |
| `account_status` | `AccountStatus`（active/deactivated/suspended/anonymized） |
| `is_active` | 反规范化快速过滤 |
| `remaining_tokens`, `reserved_tokens` | 个人钱包 |
| `current_workspace_id` | 外键 → `workspaces.id` |
| `deactivated_at`, `anonymized_at` | 生命周期时间戳 |

### `auth_sessions`

持久刷新令牌会话。每行支撑一个刷新令牌（`sid` 声明），支持服务端吊销。

## 工作区与组织

### `workspaces`

共享工作区基表（按表继承）。

| 列 | 说明 |
| --- | --- |
| `id` | 主键 |
| `kind` | `WorkspaceKind` |
| `name` | 显示名 |
| `is_active`, `removed_at` | 软删除 / 启用 |
| `remaining_tokens`, `reserved_tokens` | 企业钱包（个人使用用户的） |
| `report_config` | JSON 报告章节配置（企业） |
| `is_default_report_config` | 标记为个人工作区默认的企业 |

### `personal_workspaces`

`workspaces` 的一对一子表；`user_id` → `users.id`。命名 `个人空间`。

### `enterprises`

`workspaces` 的一对一子表；增加 `member_limit`。

### `enterprise_memberships`

| 列 | 说明 |
| --- | --- |
| `enterprise_id` | 外键 → `enterprises` |
| `user_id` | 外键 → `users` |
| `role` | `EnterpriseRole`（owner/member） |
| `joined_at` | 成员关系时间戳 |

### `enterprise_invitations`

邮箱/手机号 → 企业 + 角色，令牌、过期时间（`ENTERPRISE_INVITATION_HOURS`）。

### `workspace_share_invitations` / `share_invitation_idempotency`

分享链接邀请及其幂等记录。

## 资产与存储

### `assets`

基础资产行（按表继承）。

| 列 | 说明 |
| --- | --- |
| `type` | `AssetType` |
| `status` | `AssetStatus` |
| `visibility` | `AssetVisibility` |
| `owner_user_id`, `workspace_id` | 所有权 |
| `object_key`, `content_type`, `size_bytes`, `sha256` | 存储元数据 |
| `upload_intent_id` | 反向引用 |

### `images` / `audio_assets` / `documents`

类型专属子表（尺寸/像素、时长、MIME 等）。

### `asset_display_metadata`

资产的缓存显示标签。

### `asset_upload_intents`

每个 `POST /upload-intents` 一行：声明的类型/用途/角色、幂等键、预签名过期、临时版本。

## 设计作业与提供商

### `design_job_types`

作业类型目录。`key` 也是
`provider_model_catalogs` 的**目录绑定键**。

| 列 | 说明 |
| --- | --- |
| `key` | 主键（如 `室内设计`、`voice_summary`、`html_report`） |
| `display_name` | 标签 |
| `token_cost` | 完成时收取的积分数 |
| `result_kind` | `DesignJobResultKind` |
| `is_active` | 是否可选？ |

### `design_jobs`

核心作业。

| 列 | 说明 |
| --- | --- |
| `user_id`, `workspace_id`, `job_type_key` | 所有权 + 类型 |
| `status` | `DesignJobStatus` |
| `token_state` | `JobTokenState` |
| `token_source` | `TokenSource`（personal/enterprise） |
| `prompt_selection` | 所选提示词模板 + 字段值的 JSON |
| `provider_dispatch_state` | `ProviderDispatchState` |
| `provider_connection_id`, `provider_model_config_id` | 已解析提供商 |
| `provider_job_id`, `provider_result_url` | 外部交接 |
| `progress`, `error_code`, `result_kind` | 结果 |

### `design_job_submissions`

持久子提交（可重试的提供商尝试），有自己的
`DesignJobSubmissionStatus`、接受确定性和重试处置。

### `design_job_assets`

连接作业与其输入/输出资产的连接表，带
`DesignJobAssetRole`。

### **`provider_connections`**（提供商连接，新增）

每个厂商/账号一行。

| 列 | 说明 |
| --- | --- |
| `adapter` | 如 `mock_async`、`seedream`、`doubao_text`、`gpt_image` |
| `base_url` | 提供商端点 |
| `api_key_ciphertext`, `encryption_key_id` | 加密凭证 |
| `request_timeout_seconds`、轮询/重试旋钮 | 运行时 |
| `output_hosts` | 结果主机允许列表 |
| `allow_http`, `is_active` | 安全标志 |

### **`provider_model_configs`**（提供商模型配置，新增）

一个连接下的每个具体模型一行。

| 列 | 说明 |
| --- | --- |
| `provider_connection_id` | 父级 |
| `model_id` | 厂商模型名 |
| `image_size`, `output_format`, `watermark` | 输出控制 |
| `request_shapes` | 有序多模态输入/输出形态 |

### **`provider_model_catalogs`**（提供商模型目录，新增）

将模型绑定到作业类型的连接表：

| 列 | 说明 |
| --- | --- |
| `provider_model_config_id` | 外键 → `provider_model_configs` |
| `catalog_key` | **外键 / 值 = `design_job_types.key`** |

这就是提供商分配给设计作业类型的方式。

## 提示词模板

### **`prompt_templates`**（新增）

| 列 | 说明 |
| --- | --- |
| `name` | 唯一公开名 |
| `description` | 管理员备注 |
| `system_prompt`, `template_text`, `negative_prompt` | 提示词通道 |
| `is_active` | 是否可选？ |

### **`prompt_variables`**（新增）

可配置的 `{variable}` 字段：`template_id`、`key`、`default_value`、
显示顺序。

### **`prompt_options`**（新增）

变量的预定义可选值：`template_id`、`variable_key`、
`label`、`value`、排序。

## 报告

### `design_reports`

一份组装好的报告：`workspace_id`、状态、渲染 HTML 位置、冻结模板范围
（`ReportTemplateScopeKind`）。

### `design_report_items`

一个选中章节：`report_id`、`key`、状态（`DesignReportItemStatus`）、
内容来源。

### `design_report_item_assets` / `design_report_item_objects`

属于报告条目的资产和选中的 OSS 库对象。

## 计费与积分

### `token_ledger_entries`

追加审计追踪。`user_id`/`enterprise_id`（一侧）、带符号
`amount`、`detail_type`（`TokenDetailType`）、关联引用、余额快照。

### `subscription_plans` / `token_packages`

目录：套餐代码/名称/周期/价格/赠送积分/权益项；积分包价格 + 赠送积分数。

### `user_subscriptions`

每个用户一条活跃付费周期：`plan_code`、`plan_name`、`status`
（`SubscriptionStatus`）、`current_period_start/end`、反规范化
`benefit_items`。

### `payment_orders` / `purchased_token_batches`

带商户 `out_trade_no`、`kind`（`PaymentKind`）、`type`
（`PaymentType`）、`status`（`PaymentStatus`）、金额（分）的订单；批次记录成功时入账的赠送积分。

### `refund_orders` / `finance_cost_entries` / `wechat_payment_events`

退款生命周期、运营成本分类和原始微信支付通知记录。

## 推荐与活动

### `referral_invitations`

一次性凭证：`inviter_user_id`、令牌摘要、过期时间
（`REFERRAL_INVITATION_LIFETIME_SECONDS`）。

### `campaign_configurations`（新增）

运行期奖励额度：`code`（主键，如 `NEW_USER_REGISTRATION`）、
`token_amount`、乐观 `version`、`updated_by_user_id`。

### `referral_attributions` / `referral_identity_claims`

不可变的先到先得邀请人→被邀请人归因和 IP/设备证据。

### `reward_grants` / `reward_grant_items`

承诺的奖励（`RewardGrantStatus`）及其明细行。

### `reward_claims` / `reward_fulfillments`

显式认领 → 原子发放到个人积分。

### `referral_reward_sources` / `reward_outbox_events` / `reward_operation_idempotency`

哪个购买触发了奖励、事务性发件箱和幂等性。

## 法律

### `legal_documents` / `current_legal_documents` / `legal_document_acceptances`

版本化条款/隐私文档、当前活跃指针和按用户接受记录。

## 延伸阅读

- [REST API](/reference/rest-api) —— 哪些路由读写这些表。
- [设计作业](/backend/design-jobs) —— `design_jobs` / 提供商目录流程。
- [计费与积分](/backend/billing-tokens) —— 台账语义。
