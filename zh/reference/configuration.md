# 配置参考

每个后端设置都是 `app/config.py` 中 `Settings` 类读取的环境变量（pydantic-settings）。带注释的权威清单是
`.env.example`；本页记录**每个**变量、其默认值、含义以及是否必需。

::: tip
当本页与 `.env.example` 不一致时，以 `.env.example` 和
`app/config.py` 为准。切勿提交真实密钥——使用
`<your-app-secret>` 或 `********` 之类的占位符。
:::

## 设置如何加载

`Settings` 从进程环境（开发中还有本地 `.env`）读取。当
`ENVIRONMENT=production` 时，危险组合在启动时被拒绝（如 mock 提供商或假微信端点）。密钥值包装在 Pydantic
`SecretStr` 中，绝不记录。

## 核心服务

| 变量 | 默认值 | 必需 | 含义 |
| --- | --- | --- | --- |
| `ENVIRONMENT` | `development` | 否 | `development` / `production`；生产环境拒绝 mock/假端点 |
| `APP_VERSION` | `development` | 否 | 版本标签（SAE 设置 Git SHA） |
| `DATABASE_URL` | `postgresql+asyncpg://floorplan:floorplan@db:5432/floorplan` | 是 | 异步 PostgreSQL DSN |
| `DATABASE_POOL_SIZE` | `10` | 否 | 引擎池大小 |
| `DATABASE_MAX_OVERFLOW` | `5` | 否 | 额外池连接 |
| `DATABASE_POOL_TIMEOUT_SECONDS` | `30` | 否 | 池检出超时 |
| `DATABASE_AUTO_CREATE` | `false` | 否 | 自动创建 schema（仅开发） |
| `REDIS_URL` | `redis://redis:6379/0` | 是 | Redis DSN（队列 + 缓存 + 会话） |
| `JOB_TTL_SECONDS` | `86400` | 否 | ARQ 作业结果保留 |
| `WORKER_JOB_COMPLETION_WAIT_SECONDS` | `270` | 否 | 优雅停机排空窗口（必须 < 容器宽限） |
| `ACCOUNT_DEACTIVATION_GRACE_DAYS` | `7` | 否 | 停用 → 匿名化宽限期 |
| `MAX_UPLOAD_BYTES` | `20971520`（20 MiB） | 否 | 最大上传资产大小 |
| `MAX_REQUEST_BYTES` | `23068672`（约 22 MiB） | 否 | 最大请求 body |
| `MAX_IMAGE_PIXELS` | `40000000`（40 MP） | 否 | 解码图片像素上限 |
| `LOCAL_STORAGE_PATH` | `/data` | 否 | 本地工作/暂存路径 |

## 认证与安全

| 变量 | 默认值 | 必需 | 含义 |
| --- | --- | --- | --- |
| `JWT_SECRET` | — | **是（生产）** | 签名 access/refresh JWT；≥32 随机字节 |
| `ACCESS_TOKEN_SECONDS` | `900`（15 分钟） | 否 | 访问令牌生命周期 |
| `REFRESH_TOKEN_SECONDS` | `2592000`（30 天） | 否 | 刷新令牌生命周期 |
| `REPORT_VIEW_TOKEN_SECONDS` | `300` | 否 | 签名报告查看令牌生命周期 |
| `AUTH_RATE_LIMIT_ATTEMPTS` | `10` | 否 | 每窗口认证暴力破解限制 |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | `300` | 否 | 认证限制窗口 |
| `ADMIN_SESSION_SECRET` | — | **是** | 签名管理后台浏览器会话 Cookie |
| `ADMIN_SESSION_HTTPS_ONLY` | `false` | 否 | 生产设 `true`（Cookie `Secure`） |
| `ADMIN_PHONE` | `+8613800000000` | **是** | 管理员登录手机号 |
| `ADMIN_PASSWORD` | — | **是** | 管理员登录密码 |
| `ADMIN_DISPLAY_NAME` | `Administrator` | 否 | 管理员显示名 |
| `CONFIG_ENCRYPTION_KEY` | — | **是** | 加密管理员保存的提供商 API 密钥；保持稳定 |

## 可观测性与背压

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `MAX_CONCURRENT_REQUESTS_PER_PROCESS` | `100` | 依赖前的异步背压上限 |
| `REGISTRATION_CONCURRENT_REQUESTS_PER_PROCESS` | `20` | 注册并发 |
| `REQUEST_SLOW_LOG_SECONDS` | `2` | 追踪比这更慢的请求 |
| `REQUEST_TRACE_SAMPLE_RATE` | `0.001` | 采样 0.1% 健康请求 |
| `REQUEST_TRACE_LOG_BUDGET_PER_MINUTE` | `30` | 每分钟追踪行上限 |
| `PERFORMANCE_METRICS_FLUSH_SECONDS` | `10` | 将内存指标刷新到 Redis |
| `PERFORMANCE_METRICS_STREAM_MAX_ENTRIES` | `5000` | 原始持续时间样本上限 |
| `DESIGN_JOB_QUEUE_SLOW_LOG_SECONDS` | `30` | 标记慢的提供商队列等待 |
| `DESIGN_JOB_SLOW_LOG_SECONDS` | `120` | 标记慢的端到端作业 |
| `DESIGN_JOB_TRACE_LOG_BUDGET_PER_MINUTE` | `20` | 每分钟作业追踪行上限 |
| `WORKER_VERBOSE_LOGS` | `false` | worker 详细日志 |
| `ADMIN_REPORT_CACHE_SECONDS` | `10` | 管理报告渲染缓存 |

## 设计作业与限流

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `DESIGN_RATE_LIMIT_JOBS` | `20` | 每用户每小时设计提交数 |
| `DESIGN_RATE_LIMIT_WINDOW_SECONDS` | `3600` | 设计限流窗口 |
| `MAX_ACTIVE_DESIGN_JOBS_PER_USER` | `5` | 每用户并发活跃作业数 |
| `DESIGN_PROGRESS_DEFAULT_DURATION_SECONDS` | `120` | 进度条回退 ETA |
| `DESIGN_PROGRESS_MINIMUM_SAMPLES` | `5` | 使用历史前的最小样本数 |
| `DESIGN_PROGRESS_SAMPLE_SIZE` | `200` | ETA 保留的样本数 |
| `DESIGN_PROGRESS_HISTORY_DAYS` | `30` | ETA 回溯天数 |

## 积分、权益与邀请

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `INITIAL_USER_TOKENS` | `1000` | 首次登录初始余额（生产除非有意否则设 `0`） |
| `INITIAL_USER_ALLOWED_WORKSPACES` | `2` | 允许的所属工作区（个人 + 所属企业） |
| `SEED_DEMO_BILLING_CATALOG` | `true` | 本地播种示例价格 |
| `ENTERPRISE_INVITATION_HOURS` | `72` | 企业邀请过期时间 |
| `SHARE_INVITATION_PREVIEW_RATE_LIMIT_ATTEMPTS` | `60` | 分享预览限制 |
| `SHARE_INVITATION_ACCEPT_RATE_LIMIT_ATTEMPTS` | `30` | 分享接受限制 |
| `SHARE_INVITATION_RATE_LIMIT_WINDOW_SECONDS` | `300` | 分享限制窗口 |

## 推荐

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `REFERRAL_CAMPAIGN_CODE` | `REFERRAL_FIRST_PURCHASE` | 活跃活动 |
| `REFERRAL_CAMPAIGN_VERSION` | `1` | 预期配置版本 |
| `REFERRAL_CAMPAIGN_REQUIRES_NEW_REGISTRATION` | `true` | 仅奖励新被邀请人 |
| `REFERRAL_REWARD_TOKENS` | `1000` | 每个合格推荐的积分数 |
| `REFERRAL_REWARD_GLOBAL_CAP` | `10000` | 全局奖励上限 |
| `REFERRAL_MINIMUM_PURCHASE_FEN` | `990` | 最小不可退款购买（人民币 9.90） |
| `REFERRAL_INVITATION_LIFETIME_SECONDS` | `2592000` | 邀请凭证 TTL（30 天） |
| `REFERRAL_IDENTITY_RETENTION_SECONDS` | `31536000` | 身份证据保留（1 年） |
| `REFERRAL_REWARD_CLAIM_EXPIRY_SECONDS` | `604800` | 认领窗口（7 天） |
| `REFERRAL_IDEMPOTENCY_SECONDS` | `604800` | 幂等保留 |
| `REFERRAL_RATE_LIMIT_ATTEMPTS` | `30` | 推荐操作限制 |
| `REFERRAL_RATE_LIMIT_WINDOW_SECONDS` | `300` | 推荐限制窗口 |

## 法律与公开 URL

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `LEGAL_DOCUMENTS_LOCALE` | `zh-CN` | 法律文档语言 |
| `LEGAL_DOCUMENTS_REQUIRED` | `true` | 注册时要求接受 |
| `PUBLIC_API_BASE_URL` | _未设置_ | API/报告/法律链接的外部 HTTPS 源 |
| `LEGAL_DOCUMENTS_PUBLIC_BASE_URL` | _未设置_ | 单独的公开法律文档源（可选） |

## 报告

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `REPORT_GLOBAL_ASSET_PREFIX` | `global` | 共享报告资产前缀 |
| `REPORT_WORKSPACE_ASSET_PREFIX` | `workspaces` | 按工作区报告前缀 |
| `REPORT_LIBRARY_MAX_OBJECTS_PER_ITEM` | `1000` | 每章节列出的最大库对象数 |
| `REPORT_ITEMS` | _注释掉_ | 覆盖内置报告菜单（JSON 数组） |
| `REPORT_TEMPLATE_CACHE_TTL_SECONDS` | `300` | 报告渲染缓存 |
| `REPORT_TEMPLATE_RECONCILE_SCHEDULE_MINUTE` | `5` | 模板对齐频率 |
| `REPORT_TEMPLATE_RECONCILE_BATCH_SIZE` / `_MAX_BATCHES` | `100` / `10` | 对齐批次 |
| `REPORT_RESULT_CLEANUP_MINIMUM_AGE_SECONDS` | `3600` | 清理前最小年龄 |
| `REPORT_RESULT_CLEANUP_BATCH_SIZE` / `_MAX_BATCHES` | `100` / `10` | 清理批次 |

## 提供商（多提供商目录引导）

这些在没有管理员行时播种回退；数据库行覆盖它们。

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `PROVIDER_ADAPTER` | `mock_async` | 适配器键（`mock_async`、`seedream`、`doubao_text`、`gpt_image`） |
| `PROVIDER_BASE_URL` | `http://mock-image-provider:8082` | 提供商端点 |
| `PROVIDER_MODEL` | _空_ | 模型 ID（空 = GPT 图片适配器关闭） |
| `PROVIDER_IMAGE_SIZE` | `1.5K` | 默认输出尺寸 |
| `PROVIDER_OUTPUT_FORMAT` | `jpeg` | 输出格式 |
| `PROVIDER_WATERMARK` | `false` | 输出水印 |
| `PROVIDER_SUBMIT_PATH` | `/v1/renders` | 提交路径 |
| `PROVIDER_STATUS_PATH` | `/v1/renders/{job_id}` | 状态路径 |
| `PROVIDER_API_KEY` | _空_ | 引导密钥（管理员行覆盖） |
| `PROVIDER_OUTPUT_HOSTS` | `["object-storage.example.com"]` | 结果主机允许列表 |
| `PROVIDER_ALLOW_HTTP` | `true` | 非生产允许 HTTP |
| `PROVIDER_REQUEST_TIMEOUT_SECONDS` | `300` | 每次调用超时 |
| `PROVIDER_POLL_INTERVAL_SECONDS` | `10` | 轮询频率 |
| `PROVIDER_MAX_WAIT_SECONDS` | `900` | 轮询放弃 |
| `PROVIDER_MAX_RETRIES` | `4` | 重试次数 |
| `PROVIDER_HTTP_MAX_CONNECTIONS` | `20` | 连接池 |
| `PROVIDER_HTTP_MAX_KEEPALIVE_CONNECTIONS` | `10` | keepalive 池 |
| `PROVIDER_HTTP_KEEPALIVE_EXPIRY_SECONDS` | `30` | keepalive TTL |
| `MOCK_IMAGE_PROVIDER_CONTROLS_ENABLED` | `false` | 接受 mock 提供商控制（仅本地） |

## 微信登录与支付

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `WECHAT_PAY_MODE` | `mock` | `disabled` / `mock` / `live` |
| `WECHAT_PAYMENT_EXPIRE_SECONDS` | `1800` | 订单支付窗口 |
| `WECHAT_PAYMENT_CLOSE_GRACE_SECONDS` | `10` | 关闭宽限 |
| `WECHAT_TOKEN_PURCHASE_PENDING_LIMIT` | `3` | 每用户最大待处理订单 |
| `MOCK_PAYMENT_ENDPOINTS_ENABLED` | `true` | 启用 `/mock/*` 支付助手 |
| `WECHAT_PAY_BASE_URL` | `http://mock-payment-provider:8081/mock/wechat-pay` | 支付基础 URL |
| `WECHAT_APP_ID` | `wxmocknativeapp0001` | 小程序 App ID |
| `WECHAT_MINI_PROGRAM_APP_SECRET` | `mock-mini-program-secret` | **密钥** —— 生产替换 |
| `MOCK_WECHAT_IDENTITY_ENDPOINTS_ENABLED` | `true` | 登录指向本地 mock |
| `WECHAT_CODE_TO_SESSION_URL` | 本地 mock | `jscode2session` URL |
| `WECHAT_STABLE_ACCESS_TOKEN_URL` | 本地 mock | 稳定令牌 URL |
| `WECHAT_PHONE_NUMBER_URL` | 本地 mock | 手机号 URL |
| `WECHAT_AUTH_REQUEST_TIMEOUT_SECONDS` | `30` | 微信 HTTP 超时 |
| `WECHAT_PAY_MERCHANT_ID` | `1900000109` | 商户号 |
| `WECHAT_PAY_API_V3_KEY` | _mock_ | **密钥** —— APIv3 密钥 |
| `WECHAT_PAY_MERCHANT_SERIAL` | _mock_ | 商户证书序列号 |
| `WECHAT_PAY_MERCHANT_PRIVATE_KEY` | _空_ | **密钥** —— 商户私钥 |
| `WECHAT_PAY_MERCHANT_PRIVATE_KEY_FILE` | mock 路径 | 生产只读挂载 |
| `WECHAT_PAY_PUBLIC_KEY_ID` | _mock_ | 平台公钥 ID |
| `WECHAT_PAY_PUBLIC_KEY` / `_FILE` | _mock_ | 平台公钥 |
| `WECHAT_PAYMENT_NOTIFY_URL` | _空_ | 支付通知回调 URL |

## Cloudflare 隧道（可选）

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `CLOUDFLARE_TUNNEL_TOKEN` | _空_ | 命名隧道令牌 |
| `CLOUDFLARED_IMAGE` | `cloudflare/cloudflared:latest` | 固定镜像覆盖 |

## 对象存储（S3 兼容）

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `STORAGE_BACKEND` | `s3` | `local` 或 `s3` |
| `S3_BUCKET` | _替换_ | 私有 bucket |
| `S3_REGION` | `cn-chengdu` | 区域 |
| `S3_ENDPOINT` | OSS 内网 | 服务端端点 |
| `S3_PRESIGN_ENDPOINT` | OSS 公网 | 浏览器可见预签名端点 |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | _空_ | **密钥** |
| `S3_SIGNATURE_VERSION` | `s3` | OSS 用 `s3`，AWS/MinIO 用 `s3v4` |
| `S3_PRESIGN_SECONDS` | `3600` | 预签名读取 URL TTL |
| `S3_UPLOAD_FORM_SECONDS` | `900` | 上传意向表单 TTL |
| `S3_SERVER_SIDE_ENCRYPTION` | `AES256` | SSE |
| `S3_FORCE_PATH_STYLE` | `false` | MinIO 设 true |
| `S3_MULTIPART_THRESHOLD_BYTES` | `8388608` | 多分片阈值 |
| `S3_TRANSFER_CHUNK_BYTES` | `8388608` | 块大小 |

## 资产与暂存清理

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `ASSET_TEMPORARY_RETENTION_SECONDS` | `259200`（3 天） | 未完成上传保留 |
| `ASSET_CLEANUP_SCHEDULE_MINUTE` | `0` | 清理分钟 |
| `ASSET_CLEANUP_BATCH_SIZE` / `_MAX_BATCHES` | `100` / `10` | 清理批次 |
| `PROVIDER_STAGING_RETENTION_SECONDS` | `259200` | 提供商暂存保留 |
| `PROVIDER_STAGING_CLEANUP_BATCH_SIZE` | `100` | 暂存批次大小 |
| `ASSET_UPLOAD_INTENT_RATE_LIMIT_ATTEMPTS` / `_WINDOW_SECONDS` | `60` / `3600` | 意向限制 |
| `ASSET_UPLOAD_COMPLETION_RATE_LIMIT_ATTEMPTS` / `_WINDOW_SECONDS` | `120` / `3600` | 完成限制 |
| `MOCK_IMAGE_PROVIDER_BUCKET` / `OBJECT_KEY` | _替换_ | mock 提供商输出 |

## 云端 E2E 与部署（仅运营人员）

| 变量 | 含义 |
| --- | --- |
| `CLOUD_API_URL` | 云端测试 API URL |
| `CLOUD_ADMIN_USERNAME` / `CLOUD_ADMIN_PASSWORD` | 云端测试管理员凭证 |
| `ACR_REGISTRY` / `ACR_NAMESPACE` / `ACR_REPOSITORY` | 容器镜像仓库 |
| `ACR_USERNAME` / `ACR_PASSWORD` | **密钥** —— 仓库凭证 |
| `ALIYUN_ACCESS_KEY_ID` / `ALIYUN_ACCESS_KEY_SECRET` | **密钥** —— 部署凭证 |
| `SAE_REGION` / `SAE_API_ENDPOINT` | SAE 部署目标 |

## 延伸阅读

- [REST API](/reference/rest-api) —— 这些变量门控什么。
- [快速开始](/backend/getting-started) —— 本地运行的最小 `.env`。
