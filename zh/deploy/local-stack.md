# 本地开发环境（Local Stack）

后端仓库（`YuanZhu-AI`）附带一个 Docker Compose 文件（`docker-compose.yml`），
完整描述了*全部*本地拓扑——数据库、缓存、对象存储、API、两个 ARQ worker，
以及三个假的外部服务（微信身份、微信支付、AI 图像提供商）。你几乎不需要
直接调用 `docker compose`，而是使用启动脚本 `scripts/create_stack.sh`：
它会自动推导不冲突的端口、注入密钥并等待服务就绪。

本页逐一说明每个服务、端口和环境变量，让你能够放心地运行、调试和扩展本地环境。

## 前置条件

- 安装了 Compose 插件的 Docker Desktop。
- 位于 `.venv/` 的 Python 3.12 虚拟环境（启动脚本使用 `.venv/bin/python`
  解析你的 `.env`；若不存在则回退到 `python3`）。
- 一份 `.env` 副本（从 `.env.example` 复制）。缺少它启动脚本会拒绝启动。

## 快速开始

在仓库根目录执行：

```bash
cp .env.example .env
./scripts/create_stack.sh
```

不带任何参数时，它会启动**默认栈**：API 监听宿主机端口 `9090`，
Mock 微信、Mock 支付、Mock 图像提供商，以及本地 MinIO 对象存储。
启动完成后会打印 API 地址、浏览器可访问的局域网 API 地址和浏览器资源端点，
然后运行 `docker compose exec api alembic current`，方便你确认当前 schema 版本。

## Compose 服务——完整清单

下面每个服务名都是 `docker-compose.yml` 中使用的确切名称。运行时服务构建
同一个项目镜像（`Dockerfile`，`runtime` 阶段）；测试运行器构建 `e2e` 阶段。

| 服务（容器） | 镜像 / 目标 | 作用 | 容器内端口 | 宿主机端口 |
| --- | --- | --- | --- | --- |
| `db` | `postgres:16-alpine` | PostgreSQL 16，命名卷 `postgres-data` | 5432 | 仅内部 |
| `redis` | `redis:7-alpine` | Redis 7，开启 AOF，命名卷 `redis-data` | 6379 | 仅内部 |
| `minio` | `quay.io/minio/minio` | S3 兼容存储（profile `minio`） | 9000 / 9001 | 自动推导端口段（见下文） |
| `minio-init` | `quay.io/minio/mc` | 创建 bucket、开启版本管理、写入 Mock 图像 | — | — |
| `migrate` | 项目 `runtime` | 运行 `alembic upgrade head` 后退出 | — | — |
| `mock-image-provider` | 项目 `runtime` | 模拟 AI 提供商（`app.mock_image_server`） | 8082 | 仅内部 |
| `mock-payment-provider` | 项目 `runtime` | 模拟微信支付（`app.mock_payment_server`） | 8081 | 仅内部 |
| `mock-wechat-identity-provider` | 项目 `runtime` | 模拟微信登录（`app.mock_wechat_identity_server`） | 8083 | 仅内部 |
| `api` | 项目 `runtime` | FastAPI / uvicorn（6 个 worker） | 9090 | `${API_PORT:-9090}` |
| `submit-worker` | 项目 `runtime` | ARQ，`app.worker.SubmitWorkerSettings` | — | — |
| `poll-worker` | 项目 `runtime` | ARQ，`app.worker.PollWorkerSettings` | — | — |
| `cloudflared-named` | `cloudflare/cloudflared` | 命名式 Cloudflare 隧道（profile `real-wechat-named`） | — | — |
| `cloudflared-quick` | `cloudflare/cloudflared` | 临时式 Cloudflare 隧道（profile `real-wechat-quick`） | — | — |
| `smoke` | 项目 `e2e` | 运行 `pytest smoke_tests -m smoke`（profile `smoke`） | — | — |
| `e2e-admin` | 项目 `e2e` | E2E 管理员角色（profile `e2e`） | — | — |
| `e2e-user` | 项目 `e2e` | E2E 普通用户角色（profile `e2e`） | — | — |

### Profiles（配置剖面）

服务由 Compose profile 控制开关，因此直接 `docker compose up` 只会启动开发所需的最小集合：

| Profile | 由谁拉起 | 新增的服务 |
| --- | --- | --- |
| （默认） | `create_stack.sh` | `db`、`redis`、`migrate`、`mock-image-provider`、`api`、`submit-worker`、`poll-worker` |
| `minio` | `--storage minio` | `minio`、`minio-init` |
| `mock-wechat` | `--wechat mock` | `mock-payment-provider`、`mock-wechat-identity-provider` |
| `real-wechat-named` | `--wechat real --tunnel named` | `cloudflared-named` |
| `real-wechat-quick` | `--wechat real --tunnel quick` | `cloudflared-quick` |
| `smoke` | 手动 / CI | `smoke` |
| `e2e` | CI / 耐久压测 | `e2e-admin`、`e2e-user` |

## 并行开发会话（用户自选端口）

启动脚本会从你选择的**一个 API 端口**推导出所有对外发布的端口。
正是这一点让多位开发者（或一台机器上的多个栈）可以并行运行而互不冲突。

```bash
# 开发者 A 使用默认端口
./scripts/create_stack.sh --port 9090

# 开发者 B 选另一个 API 端口
./scripts/create_stack.sh --port 9100
```

API 端口必须在 `1024` 到 `22527` 之间。MinIO 端口由 `scripts/stack_ports.py`
计算到三个互不重叠的端口段（每段宽 `(65535 - 1024 + 1) / 3 = 21504`）：

| API 端口 | MinIO API 端口 | MinIO 控制台端口 | Compose 项目名 |
| --- | --- | --- | --- |
| `9090`（默认） | `30594` | `52098` | `yuanzhu-9090` |
| `9100` | `30604` | `52108` | `yuanzhu-9100` |
| `1024` | `22528` | `43056` | `yuanzhu-1024` |

启动脚本强制执行以下规则：

- Compose 项目默认名为 `yuanzhu-<API_PORT>`（可用 `--project` 覆盖）。
- 若该 API 端口已被本仓库的**另一个** YuanZhu 栈占用，旧栈会被移除
 （但其命名卷会保留）。
- 若端口属于**无关**容器或宿主机进程，启动脚本会停止并要求你释放该端口
  或另选端口——它绝不会擅自杀掉外部进程。
- 推导出来的 MinIO 端口若与另一个栈冲突会直接硬失败；端口绝不会动态重新分配。

## 启动脚本（`scripts/create_stack.sh`）

```text
./scripts/create_stack.sh [options]

  --port PORT        宿主机/API 端口（默认：9090，范围 1024-22527）
  --ip HOST          浏览器可见的主机名；省略时自动探测局域网 IPv4
  --wechat mock|real 微信身份模式（默认：mock）
  --tunnel named|quick  真实微信所需的公网回调隧道（默认：named）
  --storage minio|oss   对象存储模式（默认：minio）
  --secret FILE      Dotenv 文件（默认：.env）
  --project NAME     Compose 项目名（默认：yuanzhu-PORT）
```

它按顺序执行以下操作：

1. 校验参数并确认 `--secret` 文件存在。
2. 自动探测局域网 IPv4（除非指定了 `--ip`），使 `S3_PRESIGN_ENDPOINT` 和
   `PUBLIC_API_BASE_URL` 可被浏览器访问。
3. 通过 `scripts/stack_ports.py` 推导 MinIO 端口并检查冲突。
4. 移除本仓库中冲突的 YuanZhu 栈（保留卷）。
5. 拉起 MinIO（若选中），等待其健康后运行 `minio-init`。
6. 在 `mock` 模式下启动 Mock 微信/支付服务器。
7. 强制重建 `db`、`redis`、`migrate`、`mock-image-provider`、`api`、
   `submit-worker`、`poll-worker`。
8. 轮询 `http://127.0.0.1:<port>/health/ready` 直到就绪
   （最长 `STACK_READY_TIMEOUT_SECONDS`，默认 300 秒）。
9. 在 `real` 模式下，拉起 Cloudflare 隧道并探测微信支付回调，
   直到返回预期的 `401`。

## 微信与存储模式

| 模式 | `.env` 中所需的密钥 |
| --- | --- |
| `--wechat mock` | 无（使用内置 Mock 凭据） |
| `--wechat real` | `WECHAT_APP_ID`、`WECHAT_MINI_PROGRAM_APP_SECRET`、`WECHAT_PAY_MERCHANT_ID`、`WECHAT_PAY_API_V3_KEY`、`WECHAT_PAY_MERCHANT_SERIAL`、`WECHAT_PAY_MERCHANT_PRIVATE_KEY_FILE`、`WECHAT_PAY_PUBLIC_KEY_ID`、`WECHAT_PAY_PUBLIC_KEY_FILE`；`--tunnel named` 还需 `WECHAT_PAYMENT_NOTIFY_URL`、`CLOUDFLARE_TUNNEL_TOKEN` |
| `--storage minio` | 无（本地 MinIO 默认值） |
| `--storage oss` | `S3_BUCKET`、`S3_REGION`、`S3_PRESIGN_ENDPOINT`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`，可选 `S3_SIGNATURE_VERSION` |

对于 `--storage oss`，`S3_PRESIGN_ENDPOINT` 必须可被浏览器访问，且**不能**
包含 `-internal.aliyuncs.com`（本地机器无法访问仅 VPC 可达的端点）。
OSS bucket 需要开启版本管理，并配置 CORS 允许局域网前端来源。
阿里云 OSS 兼容端点请使用 `S3_SIGNATURE_VERSION=s3`。

## 关键环境变量

Compose 文件通过 `x-app-environment` YAML 锚点共享配置。以下是你实际会
改动的变量（完整列表见 `.env.example`）：

| 变量 | Compose 中的默认值 | 含义 |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://floorplan:floorplan@db:5432/floorplan` | 异步 SQLAlchemy 数据库 URL |
| `REDIS_URL` | `redis://redis:6379/0` | ARQ 队列 + 缓存 |
| `PUBLIC_API_BASE_URL` | `http://<client-host>:<port>` | 浏览器使用的公开 API 来源 |
| `ENVIRONMENT` | `development` | 应用环境（云上按命名空间设置） |
| `STORAGE_BACKEND` | `s3` | `local` 或 `s3` |
| `S3_BUCKET` | `backend` | 对象 bucket |
| `S3_ENDPOINT` | `http://minio:9000` | 服务端 S3 端点 |
| `S3_PRESIGN_ENDPOINT` | `http://<client-host>:<minio-port>` | 面向浏览器的预签名端点 |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `admin` / `password` | MinIO 凭据 |
| `S3_SIGNATURE_VERSION` | `s3v4` | MinIO；阿里云 OSS 用 `s3` |
| `WECHAT_PAY_MODE` | `mock` | `mock` / `live` / `disabled` |
| `WECHAT_CODE_TO_SESSION_URL` | `http://mock-wechat-identity-provider:8083/sns/jscode2session` | `jscode2session` 交换 |
| `WECHAT_PHONE_NUMBER_URL` | `http://mock-wechat-identity-provider:8083/wxa/business/getuserphonenumber` | 手机号 code 交换 |
| `PROVIDER_BASE_URL` | `http://mock-image-provider:8082` | 默认图像提供商 |
| `PROVIDER_ADAPTER` | `mock_async` | 管理员在数据库保存提供商配置前使用的适配器 |
| `INITIAL_USER_TOKENS` | `1000` | 新用户初始积分余额 |
| `INITIAL_USER_ALLOWED_WORKSPACES` | `2` | 个人 + 一个自建企业 |
| `REPORT_VIEW_TOKEN_SECONDS` | 30（Compose）/ 300（示例） | 汇报查看令牌有效期 |

密钥以 Docker Secret 方式挂载，而非烤进镜像：`wechat_pay_merchant_private_key`
和 `wechat_pay_public_key` 默认指向 `tests/resources/keys/mock_wechat_private_key.pem`
和 `tests/resources/keys/mock_wechat_public_key.pem`。使用 `--wechat real` 时，
将 `WECHAT_PAY_MERCHANT_PRIVATE_KEY_FILE` / `WECHAT_PAY_PUBLIC_KEY_FILE` 设为宿主机路径，
启动脚本会以只读方式把它们挂载到 `/run/secrets` 下。

## 健康检查

| 端点 | 证明了什么 |
| --- | --- |
| `GET /health/live` | 进程已启动（不依赖外部服务）。 |
| `GET /health/ready` | PostgreSQL 可达、Redis 可达、迁移已应用、配置已加载。启动脚本等待此项。 |

容器级 healthcheck 为它们提供支撑：`db` 用 `pg_isready -U floorplan -d floorplan`，
`redis` 用 `redis-cli ping`，每个 Mock 服务器用 HTTP 探测 `/health`。
`api` 服务 `depends_on: migrate: service_completed_successfully`，
因此迁移总是先于 API 启动完成。

## 数据持久化

- 命名卷 `postgres-data`、`redis-data`、`minio-data` **绝不会**被启动脚本清除。
  在同一 `--port` 上重建栈会保留其 URL 和数据。
- 当你想要两个相互独立、可随意丢弃的栈时，使用不同的 `--port`（或 `--project`）。
- E2E / 耐久压测运行（`profile: e2e`）会以 `--volumes --remove-orphans` 方式
  自清理后销毁。

## 停止或重置本地栈

在后端仓库根目录使用 `scripts/delete_stack.sh`。这是与
[后端 Issue #539](https://github.com/Orientation-CD/YuanZhu-AI/issues/539)
配套的清理流程；执行下面的命令前，checkout 必须已包含该脚本。

```text
./scripts/delete_stack.sh --port PORT [--project NAME] [--volumes] [--dry-run]

  --port PORT       必须显式指定 API 端口，范围 1024–22527（没有默认值）
  --project NAME    Compose 项目名（默认：yuanzhu-PORT）
  --volumes         不可逆地删除项目声明的本地命名卷
  --dry-run         列出精确的资源清单和数据策略，不修改任何资源
```

```bash
# 检查默认的 8080 端口项目
./scripts/delete_stack.sh --port 8080 --dry-run

# 停止并移除项目的全部容器和网络，保留卷
./scripts/delete_stack.sh --port 8080

# 预览完整重置，再删除本地数据
./scripts/delete_stack.sh --port 8080 --volumes --dry-run
./scripts/delete_stack.sh --port 8080 --volumes

# 与创建时指定的自定义项目名保持一致
./scripts/delete_stack.sh --port 8080 --project my-local-stack --dry-run
./scripts/delete_stack.sh --port 8080 --project my-local-stack
# 加上 --volumes 也会重置该自定义项目的本地数据
./scripts/delete_stack.sh --port 8080 --project my-local-stack --volumes
```

清理需要 Docker（含 Compose 插件）、Git 和 Python 3 ≥ 3.10。
与创建不同，清理不需要原来的 `.env`、密钥文件或微信/存储模式参数。
脚本通过容器的 checkout 标签验证归属：当前 checkout 或同仓库的另一个
现存 Git worktree 均可使用。归属其他仓库、无法验证归属或资源标签冲突时，
脚本会在删除前拒绝操作。不要同时创建、替换或删除同一个项目。

默认清理会移除所选项目的**全部**容器（包括已停止、孤立、Mock、迁移、
初始化和本地隧道容器）及 Compose 网络，同时保留命名卷。`--volumes`
还会删除项目声明的本地命名卷：`postgres-data`、`redis-data`、`minio-data`
和 `smoke-coverage`。这会**不可逆地删除**本地 PostgreSQL 记录、Redis 数据、
MinIO 对象和冒烟覆盖率数据，也能删除之前容器清理时保留下来的卷。

`--dry-run` 会列出精确的所选资源，以及卷将保留还是删除，不修改任何资源。
对不存在的项目重复清理会成功。如果 Docker 检查或清理失败，脚本会报告失败；
此时部分资源可能已被移除。检查剩余资源、解决报告的问题，再用同一个显式目标重试。
脚本不会通过删除其他项目的容器来强制移除正在使用或共享的卷。

其他项目、共享镜像、构建缓存、源文件、`.env`、密钥、前端依赖和产物、
外部网络及外部卷均会保留。外部 OSS 对象和云端/隧道注册信息不受影响；
移除本地隧道容器不会注销隧道。

## 冒烟与 E2E 运行器

两个启动脚本用于对运行中的栈进行测试：

```bash
./scripts/run_smoke_tests.sh      # 针对 API 的冒烟路径
./scripts/run_e2e_tests.sh         # 用户/管理员 E2E 角色
```

二者都支持**本地模式**（新建栈）或**云端模式**（指向已有的远端栈，
例如 `--local localhost --port 6060`）。在云端模式下，它们先登录已有的云端
Admin 站点以同步提示词/计费配置和汇报模板，然后针对远端 API 运行。
它们从不导出提供商凭据，并拒绝 `ENVIRONMENT=production`。

在测试流量开始前，运行器会用云端校验过的 JSON 快照替换可丢弃的本地配置
（提示词模板、作业类型、套餐、套餐包、法律文档），并精确安装
`tests/resources/report_config.json` + `tests/resources/report_template.html`。
导入器要求 `--confirm-reset-local-config`，且拒绝生产环境。

## 故障排查

| 问题 | 解决办法 |
| --- | --- |
| MinIO 端口段冲突 | 停掉另一个进程或换一个 `--port` |
| `/health/ready` 返回 503 | `docker compose logs api`；确认 `migrate` 已完成；检查 PostgreSQL/Redis |
| 真实微信测试需要公网 URL | 使用 `cloudflared-named`（token）或 `cloudflared-quick`（自动 URL）profile |
| OSS 上传失败 | 检查 CORS、bucket 版本管理，以及 `S3_PRESIGN_ENDPOINT` 是否公网可达 |
| 两个栈抢占同一端口 | 给各自分配独立 `--port`；项目名为 `yuanzhu-<port>` |

## 下一步

- [云端架构（阿里云 SAE）](/deploy/cloud-architecture)——同一拓扑如何在生产中运行。
- [SAE 部署操作手册](/deploy/sae-deployment)——逐步的云端部署指南。
