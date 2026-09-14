# 术语表

贯穿本文档与代码库的术语速查。遇到陌生术语时，先在这里查。

## 产品与领域术语

| 术语（英文原文） | 中文译名 | 解释 |
| --- | --- | --- |
| **Design job** | 设计任务 | 一个独立的异步工作单元，把输入图片/音频 + prompt 变成一个或多个 AI 生成的输出（效果图、HTML 报告或 markdown 总结）。每个功能都实现为一个设计任务。 |
| **Design job type / Catalog** | 设计任务类型 / 计费目录 | 后端编目好的任务类型清单（`GET /v1/billing/catalog`）：键、展示名、积分成本、所需图片、结果类型。前端据此决定首页展示什么。 |
| **Result kind** | 结果类型 | 设计任务产出什么：`IMAGE`、`HTML_REPORT` 或 `MARKDOWN`。 |
| **Feature** | 功能 | 产品的功能流程之一：室内、局部、家具、厨房、卫生间、彩平图、语音总结、报告。 |
| **Voice summary** | 录音需求总结 | 一个 `voice_summary` 设计任务，接收 1–3 段录音，返回 markdown 需求总结。 |
| **Design report** | 方案汇报 | 由一个设计任务加报告素材（封面、情绪板、效果图等）组装成的专业 HTML 文档。服务端渲染；在 `web-view` 中查看。 |
| **Token** | 积分 | 用于支付设计任务的内部货币。每种任务类型都有积分成本。用户购买积分包或订阅。 |
| **Token ledger** | 积分台账 | 每一笔积分增减的只追加记录（初始赠送、任务预留、消耗、释放、购买、订阅购买/到期、推荐奖励、人工调整）。 |
| **Token precheck / preflight** | 积分预检 | 功能打开或任务提交前的客户端余额检查（`personalCatalogTokenShortage`、`assertPersonalTokenBalance`）。准入仍由服务端原子执行。 |
| **Workspace** | 工作空间 | 设计任务与成员的容器。每个用户都有一个**个人工作空间**；也可能属于**企业工作空间**。 |
| **Personal workspace** | 个人工作空间 | 为每个账号自动创建的私有工作空间。 |
| **Enterprise** | 企业空间 | 带所有者与成员的共享工作空间。所有者管理席位、邀请、成员与所有方案。 |
| **Seat** | 席位 | 企业工作空间中的一个成员名额。 |
| **Subscription** | 订阅 | 一种权益，授予积分额度和/或功能访问权；本版本中它是一次性购买、**手动续订**（无自动扣费）。 |
| **Client info** | 客户信息 | 附加到任务上的可选原木风品牌字段：`last_name`、`salutation`（先生/女士）、`project_name`。 |
| **Share invitation** | 分享邀请 | 所有者签发的令牌，让另一个用户加入企业工作空间。 |
| **Referral invitation / Reward** | 推荐邀请 / 奖励 | 一种推荐归因令牌；奖励（例如首购积分赠送）在"奖励"页领取。 |

## 前端术语

| 术语（英文原文） | 中文译名 | 解释 |
| --- | --- | --- |
| **uni-app** | uni-app | 用于构建小程序的跨平台框架（基于 Vue）；可编译到微信/其他小程序平台与 H5。 |
| **Subpackage** | 分包 | 微信小程序按需加载的分块。本项目有 `pkg-features`、`pkg-plans`、`pkg-account`。 |
| **Main package** | 主包 | 始终加载的分块：启动页、首页、联系我们、方案、个人中心与 tabBar。 |
| **Repository layer** | 仓库层 | 前端的数据访问抽象。页面只依赖异步仓库，绝不直接发 HTTP。 |
| **DTO** | DTO（数据传输对象） | 数据传输对象——前端与 REST API 之间的带类型契约（`src/api/dto/*`）。 |
| **Normalizer** | 规整化函数 | 把原始 JSON（`unknown`）校验成带类型领域对象的函数，遇到漂移即抛 `*RESPONSE_INVALID`（例如 `mapDesignJobResponseMedia`）。 |
| **Mock mode** | Mock 模式 | 前端的编译期模式（`VITE_DATA_SOURCE=mock`），无后端依赖，一切在内存中模拟。 |
| **API mode** | API 模式 | 前端的编译期模式（`VITE_DATA_SOURCE=api`），调用位于 `/api/v1` 的真实后端。 |
| **Runtime alias** | 运行时别名 | Vite 的 `resolve.alias`，在构建期把抽象模块名（例如 `WechatCodeRuntime`）换成 mock 或真实实现。 |
| **Logical job id / idempotency key** | 逻辑任务 id / 幂等键 | 由 `{ scope, ownerId, actionId }` 推导的客户端密钥，让重试安全：同一逻辑动作提交两次只产生一个任务。作为 `Idempotency-Key` 请求头发送。 |
| **Poll scheduler** | 轮询调度器 | 前端辅助函数，轮询后端查询设计任务状态，遵守 `poll_after_seconds` / `Retry-After`，页面隐藏时暂停。 |
| **Recorder manager** | 录音管理器 | `uni.getRecorderManager()`；语音页面录制 MP3/16 kHz/单声道/48 kbps，单次最长 10 分钟。 |
| **Resumable playback** | 可续播 | markdown 总结页按素材记住每段录音的播放位置，通过 `InnerAudioContext.startTime` 续播。 |
| **Token pair** | 令牌对 | access + refresh 令牌对，持久化在 `yuanzhu.session.tokens.v1` 下。 |

## 后端术语

| 术语（英文原文） | 中文译名 | 解释 |
| --- | --- | --- |
| **FastAPI** | FastAPI | 用于 REST API 的 Python Web 框架。 |
| **ARQ** | ARQ | 基于 Redis 的异步任务队列，用于后台工作。 |
| **Submit worker** | 提交 worker | 把任务提交给 AI/语音提供方的 ARQ worker。 |
| **Poll worker** | 轮询 worker | 轮询提供方直到任务完成的 ARQ worker。 |
| **Provider** | 提供方 | AI/语音后端（`app/providers/`）。主图像提供方是 Seedream；本地用 mock 提供方。 |
| **Provider job** | 提供方任务 | 由 `provider_job_id` 标识的提供方侧任务。 |
| **SQLAlchemy / Alembic** | SQLAlchemy / Alembic | 用于 PostgreSQL 的 Python ORM 及其迁移工具。 |
| **Object storage / S3** | 对象存储 / S3 | S3 兼容存储，用于图片、音频与报告素材。本地：MinIO。生产：阿里云 OSS。 |
| **Upload intent** | 上传意图 | 后端签发的短时效许可，允许把一个素材直接上传到对象存储（`POST /v1/assets/upload-intents`）。 |
| **Asset completion** | 素材完成确认 | 后端确认一次上传已完成（`POST /v1/assets/{id}/complete`），返回 sha256、etag 与尺寸。 |
| **Presigned URL** | 预签名 URL | 有时效限制的 URL，让客户端直接上传/下载对象。 |
| **OpenID / phone code** | OpenID / 手机号 code | 微信身份原语：`openid` 标识用户；`phone_code` 证明手机号。 |
| **JWT** | JWT | JSON Web Token——access/refresh 令牌的格式。 |
| **JSAPI Pay** | JSAPI 支付 | 小程序发起支付所用的微信支付方式（`uni.requestPayment`）。 |
| **Payment notify** | 支付回调 | 微信支付的服务端到服务端 webhook，用于确认一笔支付。 |

## 部署术语

| 术语（英文原文） | 中文译名 | 解释 |
| --- | --- | --- |
| **Local stack** | 本地栈 | 用于本地开发的 Docker Compose 拓扑（`create_stack.sh`）。 |
| **SAE** | SAE | 阿里云**Serverless App Engine**，后端生产运行于此。 |
| **ACR** | ACR | 阿里云容器镜像服务，后端镜像发布于此。 |
| **Immutable image** | 不可变镜像 | 每个 Git 提交一个镜像，以完整 SHA 打标签，部署前解析为仓库摘要。 |
| **Migration Job** | 迁移任务 | 一个 SAE Job，在应用滚动发布前运行 `alembic upgrade head`。 |
| **GitHub Pages** | GitHub Pages | 本文档站自动发布到的地方。 |

## 领域（功能）术语

| 术语（英文原文） | 中文译名 | 解释 |
| --- | --- | --- |
| **Masked image** | 蒙版图 | 用户在输入照片上手绘的蒙版，家居试搭使用。 |
| **Reference image** | 参考图 | 某些任务类型使用的可选第二张图（例如家具或风格参考）。 |
| **Prompt template / Prompt selection** | Prompt 模板 / Prompt 选择 | 服务端模板，把用户的选择转成最终发给提供方的 prompt。 |
| **Report item** | 报告条目 | 设计报告中的一个章节（项目封面、效果图、情绪板等），在服务端配置。 |
