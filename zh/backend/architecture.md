# 架构与组件

本页是后端如何组装的深度导览。它从一个进来的 HTTP 请求开始，追踪其穿过中间件、依赖和数据库的全过程；然后解释 worker 拓扑以及拥有各业务领域的模块。如果你还没看过宏观图景，请先阅读[概览](/backend/overview)。

## 进程模型

代码库是一个镜像，作为三种逻辑进程类型启动：

| 进程 | 入口 | 负责 |
| --- | --- | --- |
| **API** | `uvicorn app.main:app` | 全部 HTTP：`/api/v1/*`、`/admin/*`、`/metrics`、健康检查、OpenAPI |
| **Submit worker** | `arq app.worker.SubmitWorkerSettings` | 出站提供商提交 + 短期维护任务 |
| **Poll worker** | `arq app.worker.PollWorkerSettings` | 提供商轮询、结果持久化、长期清理/对齐任务 |

队列名定义在 `app/queue_names.py`：

```python
SUBMIT_JOB_QUEUE = "submit_provider_job"
POLL_JOB_QUEUE = "poll_provider_job"
```

`SubmitWorkerSettings.queues` 只列出 `submit_provider_job`；
`PollWorkerSettings.queues` 只列出 `poll_provider_job`。每个 worker 类还声明它导入的确切函数集合，因此放在错误队列上的函数绝不会被意外认领。

## 应用启动（`app/main.py`）

`app/main.py` 在 `create_app()` 中构建 FastAPI 应用：

1. 加载 `Settings`（环境变量），并在 `ENVIRONMENT=production` 时校验危险组合（例如拒绝 mock 提供商 / 假端点）。
2. 打开异步 SQLAlchemy 引擎和 Redis 连接。
3. 挂载中间件：请求 ID 传播、有界并发（`MAX_CONCURRENT_REQUESTS_PER_PROCESS`）、gzip、CORS 以及 `http_safety` 指标/错误中间件。
4. 挂载路由：
   - `api.router` 位于 `/api/v1`（核心 API），
   - `asset_api.router` 位于 `/api/v1/assets`，
   - `billing_api.router` 位于 `/api/v1`，
   - `workspace_api.router` 位于 `/api/v1`，
   - `referral_api.router` 位于 `/api/v1`，
   - `account_lifecycle_api.router`（自身 + 恢复端点），
   - `config_export.router`（`/admin/config-export.json`），
   - 管理后台 `admin.router` 位于 `/admin`，
   - 健康端点 `/health/live`、`/health/ready`，
   - `/metrics` 性能快照。
5. 运行启动/生命周期任务：schema 创建或 Alembic 升级、幂等种子默认值、worker 任务注册。

## 中间件与安全（`app/http_safety.py`）

每个请求都经过一层薄中间件，它会：

- 分配或传播一个 32 位十六进制字符的请求 ID（记录日志并返回），
- 给请求计时，
- 按**已注册路由模板**记录一条有界指标（绝不记录原始 URL 路径，以保持基数低），
- 将未捕获异常归一化为稳定的 JSON 错误信封，带机器可读的 `code`，
- 通过每分钟预算（`_UNHANDLED_ERROR_LOG_BUDGET`）抑制重复的错误日志噪声。

排除在指标之外的路径包括 `/health/live`、`/health/ready` 和管理后台性能端点。

## 典型请求生命周期

以 `POST /api/v1/design-jobs`（创建设计作业）为例：

1. **路由与校验。** FastAPI 匹配路径并将 body 解析为 Pydantic `DesignJobCreate` 模型（`app/models.py`）。
2. **认证依赖。** `Depends(get_current_user)`（`app/auth.py`）读取 `Authorization: Bearer <jwt>` 头，用 PyJWT 解码，检查 `typ == "access"` 声明，加载活跃 `User`，并立即提交读事务，避免用户对象被钉在一个连接上。
3. **限流。** 来自 `rate_limit.py` 的 Redis 滑动窗口限制（例如每个窗口 `DESIGN_RATE_LIMIT_JOBS`、`MAX_ACTIVE_DESIGN_JOBS_PER_USER`）。
4. **工作区准入。** 该端点通过 `app/workspaces.py` 解析调用者的当前工作区（个人或企业），按需锁定行。
5. **积分预留。** `app/billing.py:reserve_design_tokens` 原子地将积分从 `remaining_tokens` 移入 `reserved_tokens`，并写一行 `TokenLedgerEntries` —— 扣费被挂起，尚未最终确认。
6. **资产预留。** `app/design_job.py:reserve_design_job_assets` 校验被引用的已上传资产，锁定它们，并以非终态创建 `DesignJob` 行。
7. **入队。** API 将 `submit_design_job` 入队到 `submit_provider_job`，并立即返回 `202 Accepted`（或等价的已创建 payload）。
8. **后台工作。** submit worker 取出任务，通过选中的提供商适配器组装提供商请求，调用提供商，然后入队一个轮询任务。poll worker 稍后下载结果、存储并结算积分。

API 请求从不等待模型。这种拆分是核心架构思想：**API 是持久事务 + 入队；workers 是慢的一侧。**

## 模块地图

### 核心 / 横切关注点

| 模块 | 职责 |
| --- | --- |
| `config.py` | `Settings`（pydantic-settings BaseSettings），所有环境变量的唯一类型化视图；校验器拒绝危险的生产组合 |
| `database.py` | 异步引擎、`get_db` 会话依赖、PostgreSQL 咨询锁助手 |
| `db_models.py` | 全部 SQLAlchemy ORM 模型（52 张表）和枚举 |
| `models.py` | Pydantic 请求/响应 schema（API 契约） |
| `rate_limit.py` | Redis 滑动窗口限流，用于认证、上传、设计作业、推荐 |
| `http_safety.py` / `http_errors.py` | 中间件、请求 ID、指标聚合、带编码的错误信封 |
| `performance.py` | 内存中 HTTP 聚合，刷新到 Redis，作业性能事件流，瓶颈报告 |
| `overview.py` | 管理后台概览页使用的聚合数据 |

### 业务领域模块

| 领域 | 模块 | 说明 |
| --- | --- | --- |
| 认证 | `auth.py`、`wechat_auth.py` | JWT 签发/解码、Argon2id 密码哈希、微信 `code2session` + 手机号换取 |
| 设计作业 | `design_job.py`、`design_job_types` | 预留 → 提交 → 轮询 → 结算；对齐过期作业 |
| 提供商 | `providers/`、`provider_configuration.py` | 适配器 + 数据库驱动的连接/模型/目录配置 |
| 计费与积分 | `billing.py`、`billing_api.py`、`wechat_pay.py` | 积分台账、订阅、积分包、支付订单、退款 |
| 权益 | `entitlements.py`、`subscription_entitlements.py` | 个人订阅投影与权益展示 |
| 资产与存储 | `assets.py`、`asset_api.py`、`asset_*.py`、`storage.py` | 上传意向、直传、完成、清理 |
| 报告 | `report_config.py`、`report_discovery.py`、`report_library.py`、`report_render*.py`、`report_view.py` | 按工作区的报告配置、HTML 报告渲染、签名查看令牌 |
| 工作区与组织 | `workspaces.py`、`workspace_api.py`、`share_invitations.py` | 个人工作区、企业、成员关系、邀请 |
| 提示词模板 | `prompt_templates.py` | 管理员维护的带变量/选项提示词，归档导入/导出 |
| 活动 | `campaign_configuration.py` | 运行期活动积分额度，带乐观版本控制 |
| 摘要 | `summary_catalog.py`、`summary_prompt.py` | 录音 → Markdown 摘要作业类型 + 系统提示词（#208） |
| 推荐 | `referral_api.py`、`referral_rewards.py`、`referral_attribution.py` 等 | 一次性邀请凭证、奖励发放、发件箱事件 |
| 账号生命周期 | `account_lifecycle_api.py`、`billing.py` deactivate/anonymize | 停用 → 宽限 → 匿名化；管理员暂停/恢复/归档 |
| 管理后台 | `admin.py`、`admin_sessions.py` | 服务端渲染管理网站、签名会话、CSRF |

## Worker 拓扑详解

两个 worker 共享辅助函数（过期订阅、匿名化到期账号、记录性能事件、对齐过期作业、清理临时资产），但它们的**主**队列和各自角色独有的作业不同。

**Submit worker**（`SubmitWorkerSettings`）额外运行驱动出站提供商调用的函数：

- `submit_design_job` —— 预留作业、构建提供商请求、提交、入队轮询。
- `process_terminate_design_job` —— 管理员强制失败卡住的作业。
- `process_reconcile_stale_design_jobs` —— 重新驱动中途丢失的作业。
- 加上共享维护：`process_cleanup_temporary_assets`、
  `process_cleanup_provider_staging_artifacts`、`process_expire_user_subscriptions`、
  `process_expire_locked_user_subscriptions`、`process_anonymize_due_user_accounts`、
  `process_record_provider_job_performance_events`、
  `process_record_runtime_bottleneck_metrics`。

**Poll worker**（`PollWorkerSettings`）额外运行：

- `poll_design_job` —— 轮询提供商、下载结果、持久化、结算。
- `process_cleanup_report_result_artifacts`、
  `process_reconcile_report_templates` —— 报告专属的日常维护。
- 与 submit worker 相同的共享维护函数。

Worker 优雅停机遵循 `WORKER_JOB_COMPLETION_WAIT_SECONDS`（默认 270s）：收到 `SIGTERM` 后，worker 停止认领新工作，让在途作业完成。部署的容器终止宽限必须大于此值。

## 一致性与锁定

代码库使用一组少量、一致的并发原语：

- **PostgreSQL 行锁**（`SELECT ... FOR UPDATE`）用于工作区和积分变更，并有严格的加锁顺序（例如企业 → 用户 → 成员关系）以避免死锁。
- **事务咨询锁**（`acquire_transaction_advisory_lock`）用于无法映射到单行的逻辑串行化更新，如活动配置保存。
- **带租约 + 续期的 Redis 短锁**（`design_job.py: _acquire_short_lock` / `_renew_short_lock`）环绕提供商操作，确保两个 worker 绝不会重复提交同一作业。
- **幂等键**（`Idempotency-Key` HTTP 头，8–128 字符）用于上传意向、推荐邀请、奖励认领和支付操作。

## 延伸阅读

- [设计作业](/backend/design-jobs) —— 流水线与提供商目录。
- [认证](/backend/authentication) —— JWT、微信、管理后台会话。
- [可观测性](/backend/observability) —— 日志、指标、性能。
