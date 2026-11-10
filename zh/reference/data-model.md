# 数据模型：身份、耐久输入与账务

本页解释当前 ORM 的关系，不替代 DDL。精确列、索引和约束以固定版本模型及打包的前向迁移为准。公开 Workflow ID 就是 `design_jobs.id`；WorkflowRun、OperationRun、提交代次和供应商任务是不同身份。

## 领域地图

| 领域 | 当前记录 | 不变量 |
| --- | --- | --- |
| 身份／同意 | `users`、`auth_sessions`、`legal_documents`、`legal_document_acceptances` | 可撤销会话与已接受文档的不可变 ID |
| Asset 类型层次 | `assets`、`images`、`audio_assets`、`documents`、`video_assets` | 已核验内容、类型、hash、大小和精确对象版本一致 |
| 上传／复制 | `asset_upload_intents`、`asset_copy_intents` | 所有者、角色、上限与动作身份不可变 |
| 输入归档 | `asset_input_archives` | Asset 自有迁移 receipt、精确源／目标版本、复制 lease 和回执可恢复 |
| 工作区 | `workspaces`、`personal_workspaces`、`enterprises`、成员关系及历史 | 钱包归属、当前权限与曾经成员身份不同 |
| 成员额度 | `enterprise_member_token_limits`、`enterprise_member_token_limit_audits`、企业默认值列 | 持久自定义配置和不可变配置审计；财务用量来自账本 |
| 项目 | `projects`、`project_preferences`、`project_activity_state` | 不变创建者、当前 `assignee_user_id`、指派 generation 与负责人默认项目 |
| 执行 | `design_jobs`、`workflow_runs`、`operation_runs`、输入／依赖／输出行 | 冻结执行图与物理输入 pins |
| 尝试／调度 | `design_job_submissions`、`operation_provider_calls`、重试 receipt、`workflow_outbox_events` | 代次保护与事务性交接 |
| 发布 | `design_job_outputs`、`workflow_generated_sources` | 类型化不可变产物、保留依赖及精确发布身份 |
| 本地转换 | PPTX／视频 attempts 与 reservations | 有界资源和可恢复暂存／发布 |
| 配置 | Feature、Workflow／Operation 定义、节点配置、连接／模型、提示词模板 | 定价／权益、执行图／模型、提示词用途／参考媒体彼此独立 |
| 账务 | `token_ledger_entries`、套餐、订阅、积分包、支付／退款订单 | 持久财务证据，不是 UI 余额计算 |
| 协作／营销 | 企业／分享／推荐邀请、奖励、财务成本记录 | 入企业、推荐归因和奖励履约是独立协议 |

## 上传完成不等于输入激活

```mermaid
flowchart LR
  U[签名上传] --> R[READY Asset / 有过期时间]
  R --> C[提交归档 claim]
  C --> O[SQL事务外复制精确对象版本]
  O --> A[归档 receipt COMPLETED / Asset可能仍READY]
  A --> G{最终准入成功?}
  G -->|是| X[ACTIVE / 不过期 / Job归属 / pins / 预留 / outbox]
  G -->|否| R2[无已接受Job / 保留暂存证据并正常清理]
```

迁移不改变 Asset UUID 或文件字节，只把 locator 移到耐久输入存储。归档 receipt `COMPLETED` 不代表 Job 已接受，权益、企业余额或成员额度仍可能拒绝准入。最终激活锁定并复核证据，把归属、pins、资金及调度状态一起提交。借用的 ACTIVE 依赖保留原归属。见[Asset 生命周期](/zh/reference/flows/asset-upload-flow)。

归档 `id` 稳定，Asset 删除后其可空 FK 可以变 null，保留的 tombstone 仍负责迟到的复制回执。删除 receipt 来“清除卡住的上传”可能丢失对象回收及恢复依据。

## 月额度不是第二个钱包

企业 `remaining_tokens - reserved_tokens` 是共享可用余额。成员额度字段 `used` 对已提交预留和消耗只计一次，额度字段 `reserved` 是其中待结算子集，二者相加会重复计数。释放计零。按 Asia/Shanghai 的预留月份记账，跨月结算仍归原月；没有预留历史的消耗才按结算月归属。

没有 override 表示继承企业默认值；保存 null override 表示明确不限额；保存零表示暂停该成员。企业全局默认值不能是零。配置审计不产生财务流水。owner 豁免、离职历史及全局保存清空 override 见[成员额度](/zh/reference/flows/member-quota-flow)。

## 权限和状态是不同维度

项目创建者、当前负责人和原始 Job 提交者是不同身份。普通项目导航跟随当前负责人，企业 owner 另有受限读取。授权按 ID 详情返回类型化输入，集合隐藏他人输入。写操作独立核对提交者／责任；交接保留历史提交者和账务归属，见[项目指派](/zh/reference/flows/project-assignment-flow)。

任务状态、资金状态、提交确定性、Asset 状态及归档 receipt 状态是不同状态机。短期 URL 是访问能力，不是耐久 Asset 身份。Redis 的有界性能历史不能替代 SQL 账务／执行记录。

选择回滚镜像前看[恢复流程](/zh/deploy/production)：应用回滚保留前向 schema，不能恢复已移除表或逆转兼容边界。

源码：[app/persistence/db_models.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/persistence/db_models.py) · [app/assets/asset_input_archival.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/assets/asset_input_archival.py) · [app/billing/member_token_quotas.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/billing/member_token_quotas.py) · [app/core/models.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/core/models.py)

## 协作、SDK 与结果不确定的执行记录

| 记录 | 关联与恢复含义 |
| --- | --- |
| `project_stage_sources`、`project_stage_events`、`project_sales_stage_state` | 当前独立阶段证据、不可变事件快照及持久激活；删除 Job 不会抹去阶段历史证据 |
| 日报记录与成员关系身份 | 日报属于企业成员期间及北京时间日期；保存版本、owner 已读／批注、成员批注已阅分别记录 |
| `floor_plan_works` | 按 SDK 配置及不透明供应商 Group 保存本地归属；实时标题／封面／户型仍是供应商元数据 |
| `three_vjia_releases`、`three_vjia_sdk_configurations` | 已发布契约／H5 身份与选定执行配置分开；不再有持久化编辑器会话表 |
| `video_billing_config` 与已接受商业快照 | 当前版本费率规则与不可变的已接受模型／时长／收费分开 |
| Submission／provider UNKNOWN 字段 | 持久化起始／截止／下次查询／次数；重启 worker 不会重新开始恢复计时 |

```mermaid
erDiagram
  PROJECT ||--o{ DESIGN_JOB : groups
  PROJECT ||--o{ PROJECT_STAGE_SOURCE : evidences
  PROJECT ||--o{ PROJECT_STAGE_EVENT : audits
  USER ||--o{ PROJECT : currently_assigned
  USER ||--o{ DESIGN_JOB : originally_submitted
  SDK_CONFIGURATION ||--o{ FLOOR_PLAN_WORK : owns_namespace
  FLOOR_PLAN_WORK ||--o{ DESIGN_JOB : related_group
  DESIGN_JOB ||--|| WORKFLOW_RUN : public_identity
  WORKFLOW_RUN ||--o{ SUBMISSION : attempts
```

图中是逻辑关系，不是新增 SQL 外键。作品可以先于 Job 存在，关联 Workflow 数量不等于供应商身份。各自事务边界见[户型归属](/zh/reference/flows/floor-plan-flow)、[阶段](/zh/reference/flows/project-stages-flow)与[日报](/zh/reference/flows/daily-report-flow)。
