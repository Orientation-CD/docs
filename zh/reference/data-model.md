# 数据模型

PostgreSQL 保存身份、私有 Project/工作区关系、财务状态与持久 Workflow 执行。本页是当前 ORM 的关系导读；精确列、约束和索引以固定版本模型及前向 Alembic 迁移为准。

## 领域映射

| 领域 | 当前表 | 主要约束 |
| --- | --- | --- |
| 身份 | `users`、`auth_sessions` | 平台身份归并应用用户；refresh session 可持久撤销 |
| 法律同意 | `legal_documents`、`current_legal_documents`、`legal_document_acceptances` | 同意引用不可变文档 ID，不引用可变 URL/正文 |
| Asset 基类/子类 | `assets`、`images`、`audio_assets`、`documents`、`asset_display_metadata` | 真实二进制绑定对象版本，子类型元数据与字节一致 |
| 上传/复制意图 | `asset_upload_intents`、`asset_copy_intents` | owner、role、约束和幂等不可变；复制形成独立输入 Asset |
| 工作区 | `workspaces`、`personal_workspaces`、`enterprises`、`enterprise_memberships`、`enterprise_membership_history` | 个人/企业钱包和访问分离，离开历史不是活跃成员资格 |
| Project | `projects`、`project_preferences`、`project_activity_state` | 创建者私有、原工作区不变，默认项目与活动可信状态持久化 |
| 邀请 | `enterprise_invitations`、`workspace_share_invitations`、`share_invitation_idempotency` | 手机定向邀请与可转发卡片是不同协议 |
| 执行配置 | `operation_definitions`、`workflow_definitions`、`features`、`workflow_node_configurations` | Feature 资格/价格/激活来自有效图和所选 Operation/模型 |
| 执行图 | `design_jobs`、`workflow_runs`、`operation_runs`、`operation_run_inputs`、`operation_run_dependencies`、`operation_run_outputs` | 公开 Job 投影聚合，有序输入与持久依赖驱动执行 |
| 调用/重试 | `design_job_submissions`、`operation_provider_calls`、`design_job_retry_requests` | 冻结调用身份，不盲目重复不确定的付费派发 |
| 发布/调度 | `design_job_outputs`、`workflow_generated_sources`、`workflow_outbox_events` | 类型化发布 Asset、事务调度可跨重启恢复 |
| 本地转换 | `pptx_export_attempts`、`pptx_export_reservations`、`video_render_attempts`、`video_render_reservations` | 有界资源预留与可恢复尝试 |
| provider | `provider_connections`、`provider_model_configs` | 连接秘密与模型模态/传输设置分离、版本化；积分价格属于 Feature |
| 财务 | `token_ledger_entries`、`subscription_plans`、`token_packages`、`user_subscriptions`、`payment_orders`、`purchased_token_batches`、`refund_orders` | 权威金融证据与冻结权益决定余额，不信任客户端价格 |
| 营销/成本 | `campaign_configurations`、`referral_*`、`reward_*`、`finance_cost_entries` | 归因、显式领取、履约/outbox、成本分别保存 |
| 平台事件/提示词 | `wechat_payment_events`、`douyin_payment_events`、`douyin_trade_configurations`、`prompt_templates`、`prompt_presets`、`prompt_variables`、`prompt_options` | 已验证回调与产品/提示词配置有独立审计边界 |

## Project 与项目成败

每个创建者/工作区只有一个 scratch Project（`临时项目`）；普通 Project 包含客户、地址、状态。Job 必须保持创建者/工作区/项目身份一致。省略 `project_id` 时落入 scratch，显式项目必须属于所请求工作区且可访问。共享工作区不会让所有人的 Project 可互相编辑。

主状态为 `NEW`、`REQUIREMENTS_CAPTURED`、`REPORT_PRODUCED`；启用 outcomes 后增加 `WON`/`LOST`、来源状态、关闭时间和流失信息。客户端读取 `/v1/project-statuses`，不自建状态标签/顺序或固定状态数量。`project_activity_state` 保存可信 epoch 和 incident reference，不是面向用户的开关。

## Job 与 Asset 状态

公开 Job 为 `pending`、`running`、`completed`、`failed`；积分状态独立为 `unreserved`、`reserved`、`settled`、`released`。provider 派发有 `PREPARED`、`DISPATCHING`、`STAGED`、`TERMINAL`，以及接受确定性和重试处置。相关状态机不能相互替代。

Workflow 响应采用类型化 `inputs`/`outputs`。`result_kind` 仅保留兼容投影（`IMAGE`、`HTML_REPORT`、`MARKDOWN`、`VIDEO`），不能定位所有输出端口或演示文件。产物身份是 Asset ID/已验证元数据，不是会过期的签名 URL。provider payload 快照与凭据保持加密/私有。

## 已退休 schema

旧文档中的 image-only `image_provider_configs`、Catalog 级 provider 选择和旧输出列，已由连接/模型归一化、Workflow 节点选择与类型化输出替换。历史迁移提到旧表，不代表当前运行依赖它；不要补建旧表或恢复旧应用快照修复当前部署。

成败或兼容边界激活后，迁移可能明确拒绝降级。应用回滚保留前向 schema，只能选择兼容镜像，见[生产恢复](/zh/deploy/production)。

## 源码依据

已按[记录的源码版本](/zh/reference/source-revisions)核对。

- [当前 ORM 与约束](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/persistence/db_models.py)
- [公开响应模型](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py)
- [项目状态词汇](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/project_statuses.py)
