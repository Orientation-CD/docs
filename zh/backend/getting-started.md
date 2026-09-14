# 快速开始

本页带领一位全新开发者从零开始，在自己的机器上把后端跑起来。假设你从未见过这份代码库。读完之后，你将拥有运行中的 API、两个 ARQ worker、PostgreSQL、Redis、对象存储以及内置的 mock 提供商，并且知道如何发出第一个带认证的请求。

下面每个设置项的权威来源是 `.env.example` 和
`app/config.py` 中的 `Settings` 类。如果本页的某个值与那些文件不一致，以文件为准。

## 前置条件

| 工具 | 用途 | 典型版本 |
| --- | --- | --- |
| Docker + Docker Compose | 运行 PostgreSQL、Redis、MinIO、mock 提供商 | 较新版本 |
| Python 3.12 | 本地直接运行 API 和 workers（可选，不使用 Compose 时） | 3.12.x |
| `uv` 或 `pip` | 安装 Python 依赖 | 较新版本 |

最快的本地路径是 **Docker Compose**，因为它用一条命令就能启动所有外部依赖（数据库、缓存、存储以及 mock 的微信/支付/图片服务）。

## 1. 克隆并进入仓库

```bash
git clone <your-fork-or-upstream-url> YuanZhu-AI
cd YuanZhu-AI
```

## 2. 创建本地环境文件

复制示例文件并按需修改：

```bash
cp .env.example .env
```

该示例已经为本地开发调优。首次运行时最关键的几行：

```dotenv
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://floorplan:floorplan@db:5432/floorplan
REDIS_URL=redis://redis:6379/0

# 用于签名 access/refresh JWT。改为任意足够长的随机字符串。
JWT_SECRET=replace-with-at-least-32-random-bytes

# 管理网站登录（/admin）。
ADMIN_PHONE=+8613800000000
ADMIN_PASSWORD=replace-with-a-strong-admin-password

# 在内置 mock 提供商中保存真实提供商之前，默认使用它。
PROVIDER_ADAPTER=mock_async
PROVIDER_BASE_URL=http://mock-image-provider:8082
MOCK_IMAGE_PROVIDER_CONTROLS_ENABLED=true

# 存储。本地 Compose 使用隔离的 MinIO overlay。
STORAGE_BACKEND=s3

# 微信 / 支付在本地跑内置 mock。
WECHAT_PAY_MODE=mock
MOCK_PAYMENT_ENDPOINTS_ENABLED=true
MOCK_WECHAT_IDENTITY_ENDPOINTS_ENABLED=true
```

::: warning 切勿提交真实密钥
不要把真实的微信 AppSecret、微信支付商户私钥、阿里云
AccessKey 或生产 JWT 密钥放入被 git 跟踪的 `.env`。真实密钥存放在仓库之外（部署脚本期望它们放在
`~/.config/yuanzhuai/wechat-pay/` 之类的路径下）。在文档和示例中，我们始终写
`<your-app-secret>` 或 `********`。
:::

## 3. 用 Docker Compose 启动技术栈

`docker-compose.yml` 定义了以下服务：

| 服务 | 镜像 / 命令 | 端口 |
| --- | --- | --- |
| `db` | `postgres:16` | 5432 |
| `redis` | `redis:7` | 6379 |
| `api` | `uvicorn app.main:app` | 8000 |
| `submit-worker` | 消费 `submit_provider_job` 队列的 ARQ worker | — |
| `poll-worker` | 消费 `poll_provider_job` 队列的 ARQ worker | — |
| `mock-wechat-identity-provider` | 本地微信 `code2session` mock | 8083 |
| `mock-payment-provider` | 本地微信支付 mock | 8081 |
| `mock-image-provider` | 本地图片生成 mock | 8082 |
| `cloudflared` | 可选的微信回调隧道 | — |

启动：

```bash
docker compose up --build
```

首次启动时，API 会运行其启动生命周期（见 `app/main.py`），它会：

- 连接 PostgreSQL 和 Redis；
- 根据 `DATABASE_AUTO_CREATE` 创建 schema 或应用 Alembic 迁移；
- 幂等地播种默认值（当 `SEED_DEMO_BILLING_CATALOG=true` 时播种演示计费目录，以及内置设计作业类型、报告提示词模板、语音摘要模板、提供商引导回退）。

## 4. 对 API 做冒烟测试

健康检查无需认证：

```bash
curl http://localhost:8000/health/live
curl http://localhost:8000/health/ready
```

- `/health/live` —— 进程存活（轻量存活探针）。
- `/health/ready` —— 进程能连通 PostgreSQL **和** Redis（就绪探针）。

交互式 OpenAPI playground 由 FastAPI 提供：

```
http://localhost:8000/docs          # Swagger UI
http://localhost:8000/openapi.json # 原始 schema
```

那里发布了什么、没发布什么，参见 [OpenAPI](/reference/openapi)。

## 5. 不用 Docker 运行 API + workers（可选）

如果你更喜欢直接运行 Python（例如调试器），先启动依赖，再在不同终端里启动应用进程：

```bash
# 1. 安装依赖
uv sync            # 或：pip install -e .

# 2. Postgres + Redis（Compose 服务名通过 Compose 网络解析；
#    如果你在宿主机运行，把 DATABASE_URL/REDIS_URL 指向 localhost）

# 3. 应用 / 创建 schema
uv run alembic upgrade head

# 4. API（一个终端）
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 5. Submit worker（另一个终端）
python -m arq app.worker.SubmitWorkerSettings

# 6. Poll worker（第三个终端）
python -m arq app.worker.PollWorkerSettings
```

两个 worker 类位于 `app/worker.py`。它们刻意认领**不同的队列**
（`submit_provider_job` 与 `poll_provider_job`）和不同的函数集合，因此可以独立扩缩容。

## 6. 你的第一个带认证的请求

小程序流程中没有用户名/密码注册。认证以微信优先。本地环境下，内置的
`mock-wechat-identity-provider` 接受任意登录 code 并返回一个假 OpenID，因此你可以跑通整个流程：

1. 发送 `POST /v1/auth/wechat-login`，body 为 `{ "code": "<any-code>" }`。
   服务器用 code 向微信（或其本地 mock）换取 `openid`，upsert/创建 `User`，并返回一个**访问令牌**和一个**刷新令牌**。
2. 用 bearer 令牌调用任意受保护端点：

```bash
curl http://localhost:8000/v1/me \
  -H "Authorization: Bearer <access_token>"
```

3. 当访问令牌过期（默认 `ACCESS_TOKEN_SECONDS=900`，即 15 分钟）时，用刷新令牌调用
   `POST /v1/auth/refresh` 轮换。

密码登录（`/v1/auth/login`）面向设置了手机号 + 密码的账号存在；参见
[认证](/backend/authentication)。

## 7. 打开管理网站

用浏览器访问：

```
http://localhost:8000/admin
```

用 `.env` 中的 `ADMIN_PHONE` / `ADMIN_PASSWORD` 登录。管理网站是你管理多提供商模型目录、提示词模板、计费目录、用户和性能看板的地方。它使用签名浏览器会话 + CSRF 令牌，而不是 bearer JWT；参见
[认证](/backend/authentication#admin-sessions-and-csrf)。

## 下一步去哪

- [架构与组件](/backend/architecture) —— 每个模块做什么、请求如何流经它们。
- [配置参考](/reference/configuration) —— 每个环境变量，分组列出，含默认值与是否必需。
- [REST API](/reference/rest-api) —— 完整路由表。
- [数据模型](/reference/data-model) —— 每张 SQLAlchemy 表。
