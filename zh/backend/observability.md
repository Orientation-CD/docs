# 可观测性

后端在生产环境中设计为可观测，且不泄露密钥或无界指标基数。本页覆盖结构化日志、进程内指标管道、性能报告、管理后台性能看板，以及记录什么（和不记录什么）的安全保证。代码位于
`app/performance.py`、`app/http_safety.py`、`app/overview.py` 和
`app/maintenance_jobs.py`。

## 请求 ID 与结构化日志

每个请求获得一个 32 位十六进制字符的**请求 ID**（`http_safety.py`）：如果客户端未发送则生成，附加到响应，并在处理该请求时发出的每条日志行中用作关联 ID。日志路径经过净化：原始 UUID 路径段被归一化为 `/{id}`，任何非安全字符被替换，因此用户提供的路径文本永远不能注入日志输出。

## 什么绝不记录

环境变量注释中记录的硬性安全规则：**指标中不存储 payload、凭证、手机号或原始未注册 URL 路径。**指标管道只记录已注册路由模板、状态码、持续时间和错误代码——绝不记录查询字符串或 body 内容。

## HTTP 性能指标

`app/performance.py` 在**内存中**聚合每个请求，然后每
`PERFORMANCE_METRICS_FLUSH_SECONDS`（默认 10s）向 Redis 刷新一个紧凑快照。

| 设置 | 默认值 | 含义 |
| --- | --- | --- |
| `REQUEST_SLOW_LOG_SECONDS` | 2 | 比这更慢的请求被追踪 |
| `REQUEST_TRACE_SAMPLE_RATE` | 0.001 | 采样 0.1% 的健康请求 |
| `REQUEST_TRACE_LOG_BUDGET_PER_MINUTE` | 30 | 每分钟追踪行上限 |
| `PERFORMANCE_METRICS_FLUSH_SECONDS` | 10 | 向 Redis 刷新频率 |
| `PERFORMANCE_METRICS_STREAM_MAX_ENTRIES` | 5000 | 原始持续时间样本上限 |

只有**慢/失败**请求被完整追踪；健康请求按 0.1% 采样。重复的相同错误由每分钟预算（`_UNHANDLED_ERROR_LOG_BUDGET`）抑制，因此失控失败模式不会淹没日志。

排除在指标之外：`/health/live`、`/health/ready`、
`/admin/performance/live`、`/admin/performance/refresh`。

## 设计作业性能

作业级追踪由单独阈值控制：

| 设置 | 默认值 | 含义 |
| --- | --- | --- |
| `DESIGN_JOB_QUEUE_SLOW_LOG_SECONDS` | 30 | 标记慢的提供商队列等待 |
| `DESIGN_JOB_SLOW_LOG_SECONDS` | 120 | 标记慢的端到端作业 |
| `DESIGN_JOB_TRACE_LOG_BUDGET_PER_MINUTE` | 20 | 每分钟作业追踪行上限 |

成功的作业仅在其队列或端到端时间异常时记录；**失败始终符合条件**（受预算约束）。
`record_job_performance_event` 喂给作业性能报告使用的有界事件流。

## 暴露的指标与报告

| 端点 | 认证 | 用途 |
| --- | --- | --- |
| `/metrics` | 内部 | 紧凑性能快照 |
| `/health/live` | 公开 | 存活 |
| `/health/ready` | 公开 | 就绪（Postgres + Redis 可达） |
| `/admin/performance/live` | 管理员 | 实时 HTTP + 作业性能报告 |
| `/admin/performance/refresh` | 管理员 | 强制刷新指标 |

`build_http_performance_report` 在滚动窗口上聚合按路由的请求率、错误率和延迟百分位。`build_job_performance_report` 结合
`DurationMetric`、`JobMinuteMetric`、`ActiveJobSnapshot` 和
`TerminalOutcomeSummary`。`build_runtime_bottleneck_report` 突出 worker 卡在哪里（队列深度、活跃作业快照、终态结果分布）。

管理后台概览页（`app/overview.py`）将这些聚合呈现给运营人员。
`ADMIN_REPORT_CACHE_SECONDS`（默认 10）短暂缓存渲染的管理报告。

## 周期性维护作业

`app/maintenance_jobs.py` 注册同时兼作可观测性触点的 ARQ 任务：

| 作业 | 池 | 用途 |
| --- | --- | --- |
| `process_expire_user_subscriptions` | 两者 | 翻转过期个人订阅 |
| `process_expire_locked_user_subscriptions` | 两者 | 持锁过期 |
| `process_anonymize_due_user_accounts` | 两者 | 不可逆地匿名化过宽限期账号 |
| `process_reconcile_stale_design_jobs` | 两者 | 重新驱动中途丢失的作业 |
| `process_cleanup_temporary_assets` | 两者 | 删除过期未完成上传 |
| `process_cleanup_provider_staging_artifacts` | 两者 | 移除提供商暂存对象 |
| `process_cleanup_report_result_artifacts` | poll | 垃圾回收旧报告结果 |
| `process_reconcile_report_templates` | poll | 对齐存储报告与当前模板 |
| `process_record_provider_job_performance_events` | 两者 | 刷新作业性能事件 |
| `process_record_runtime_bottleneck_metrics` | 两者 | 刷新瓶颈报告 |

Worker 详细日志默认关闭（`WORKER_VERBOSE_LOGS=false`）；仅在调试特定流水线问题时开启。

## 典型日志行

请求携带请求 ID 作为结构化字段，因此单个用户操作可从 API 穿过两个 worker 追踪。错误行包含稳定的
`error_code`（从 PostgreSQL `sqlstate` 和领域异常归一化而来），但绝不包含问题 SQL、payload、手机号或原始 URL 路径。慢请求额外携带有界路由模板、状态、持续时间以及哪个依赖慢。这保持日志对分类有用，而不成为数据泄露向量。

## 安全与恢复姿态

- **PostgreSQL 快照恢复**（#238）：系统记录源是 PostgreSQL；恢复程序依赖拍摄和恢复数据库快照，而非从日志重建，因此持久状态始终在数据库中，绝不只在 Redis 或日志中。
- **幂等 worker** 使维护任务可安全重试；清理和对齐任务刻意幂等且受批次大小限制。
- **处处有界预算**（每分钟日志预算、流条目上限、批次大小）意味着故障风暴优雅降级日志记录，而非压垮存储。

## 延伸阅读

- [架构](/backend/architecture) —— 中间件和 worker 拓扑。
- [快速开始](/backend/getting-started) —— 健康检查。
