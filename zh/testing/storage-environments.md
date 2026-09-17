# 本地 MinIO 与阿里云 OSS 测试

圆筑的本地 Smoke 和 E2E runner 始终在 Docker 中运行 API、PostgreSQL、Redis
和 worker；`--storage` 独立决定对象字节存在哪里。因此，**本地运行**指应用计算
运行在本机，并不代表所有依赖都在本机。

本页明确区分两种存储测试，解释为什么本地测试仍可能访问外网，并给出一套不会
混入部署配置的可重复环境配置。

## 哪些是真实组件，哪些是 Mock？

| Runner 模式 | API / worker | PostgreSQL / Redis | 对象存储 | 微信与模型提供商 |
| --- | --- | --- | --- | --- |
| `--storage minio --wechat mock` | 真实本地容器 | 真实本地容器 | 真实本地 MinIO 容器 | 本地 Mock 服务 |
| `--storage oss --wechat mock` | 真实本地容器 | 真实本地容器 | **通过公网端点访问真实阿里云 OSS** | 本地 Mock 服务 |
| `--cloud URL` | 已部署远端环境 | 远端环境依赖 | 远端环境配置的存储 | 远端环境配置 |

MinIO 不是内存中的函数 Mock。它会实际验证 S3 兼容签名、表单直传、版本 ID、
ETag、完成校验和清理逻辑；但它不能证明阿里云特有的端点、签名、CORS、加密和
版本行为。因此，修改了存储边界的功能还必须再跑一次真实 OSS。

当前手机文件录音的 focused smoke 比完整的“录音总结”用户旅程更窄：它验证
会话创建、fragment 交换、upload intent、对象直传、Asset complete、带身份轮询
得到 `READY` Audio Asset，以及清理；它不提交 Design Job，也不调用模型提供商。

## 最容易混淆的三个端点

| 配置或生成值 | 用途 | 是否承载文件字节？ |
| --- | --- | --- |
| `CLOUD_API_URL` | 本地 Smoke/E2E 前，从测试环境 Admin 读取提示词、Catalog、计费和法律文档配置 | 否 |
| `PUBLIC_API_BASE_URL` | 浏览器可访问的本地 API 地址，由 `create_stack.sh` 根据所选主机和端口生成 | 否 |
| `S3_PRESIGN_ENDPOINT` | 写入预签名上传表单、可被浏览器访问的对象存储端点 | 是 |

本地 runner 会先把云端配置快照导入一次性本地数据库，所以 MinIO 测试仍需要访问
`CLOUD_API_URL`。提供商密钥不会被复制，本地仍使用 Mock provider；文件字节始终
留在本地 MinIO。

单独运行 `create_stack.sh` 不会同步云端配置；运行 `run_smoke_tests.sh` 或本地
`run_e2e_tests.sh` 才会同步。

## 使用独立的密钥文件

保留原始 `.env` 作为运维/部署配置的参考输入，在 `YuanZhu-AI` 仓库根目录创建两份
被 Git 忽略、权限受限的测试配置：

- `.env.minio-test`：Mock 微信 + 本地 MinIO；
- `.env.oss-test`：Mock 微信 + 真实阿里云 OSS。

文件权限应为 `0600`，且绝不能提交：

```bash
chmod 600 .env.minio-test .env.oss-test
```

两份文件只从已可用的 `.env` 复制以下变量组：

| 分组 | 变量 |
| --- | --- |
| 本地身份和加密 | `ENVIRONMENT`、`APP_VERSION`、`JWT_SECRET`、`ADMIN_SESSION_SECRET`、`CONFIG_ENCRYPTION_KEY`、`ADMIN_SESSION_HTTPS_ONLY`、`ADMIN_PHONE`、`ADMIN_PASSWORD`、`ADMIN_DISPLAY_NAME` |
| 稳定的 Smoke/E2E 行为 | `INITIAL_USER_TOKENS`、`INITIAL_USER_ALLOWED_WORKSPACES`、`INITIAL_GLOBAL_TOKENS`、`SEED_DEMO_BILLING_CATALOG`、`LEGAL_DOCUMENTS_LOCALE`、`LEGAL_DOCUMENTS_REQUIRED`、Provider 路径/轮询限制和支付时限 |
| 云端配置来源 | `CLOUD_API_URL`、`CLOUD_ADMIN_USERNAME`、`CLOUD_ADMIN_PASSWORD` |

OSS 文件另外需要：

```dotenv
S3_BUCKET=<测试 bucket>
S3_REGION=<region>
S3_PRESIGN_ENDPOINT=https://s3.oss-<region>.aliyuncs.com
S3_ACCESS_KEY=<测试 AccessKey ID>
S3_SECRET_KEY=<测试 AccessKey Secret>
S3_SIGNATURE_VERSION=s3
S3_SERVER_SIDE_ENCRYPTION=AES256
S3_PRESIGN_SECONDS=3600
```

两份本地测试配置都不应包含：

- `DATABASE_URL`、`REDIS_URL`：Compose 负责隔离的本地服务；
- `PUBLIC_API_BASE_URL`：launcher 根据会话端口/主机生成；
- `LEGAL_DOCUMENTS_PUBLIC_BASE_URL`：陈旧值会绕过安全的本地 API fallback，
  将测试指向无关 bucket 或旧 MinIO 端口；
- `S3_ENDPOINT`：本地 OSS runner 会故意让服务端 I/O 和签名都使用公网
  `S3_PRESIGN_ENDPOINT`，因为开发机无法访问 VPC internal endpoint；
- `CLOUD_POSTGRESQL_*`：本地测试不会直连云数据库；
- 真实微信/支付密钥：这两份配置固定配合 `--wechat mock`。真实微信测试应使用
  另一份独立密钥文件。

MinIO 配置不要复制任何 OSS 凭据或端点。launcher 会注入
`http://minio:9000`、浏览器可访问的派生端口、本地凭据、`s3v4` 和 path-style。

## `.env`、Compose 与 runner 的关系

`.env` 不会被脚本或 Compose 改写。这里的“覆盖”是指：Compose 创建容器时，
同名变量的最终值可能来自优先级更高的来源，而不是指磁盘上的 `.env` 内容被修改。

对本地测试来说，`.env.minio-test` 或 `.env.oss-test` 是**静态输入和密钥来源**，
而不是所有运行时变量的唯一权威来源。端口、容器内数据库地址、存储拓扑、Mock/真实
微信模式等值必须根据本次命令动态派生。如果让历史 `.env` 值无条件胜出，测试反而
可能访问旧端口、云数据库或错误的 bucket。

整个传递链如下：

```text
命令参数（--port / --storage / --wechat / --secret）
                    +
选中的 dotenv 文件（.env.minio-test 或 .env.oss-test）
                    │
                    ▼
runner 临时 export 测试控制变量
                    │
                    ▼
create_stack.sh 校验输入并临时 export STACK_*
                    │
                    ▼
Docker Compose 插值 ${...}
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
service env_file             service environment
（基础值和密钥）             （拓扑派生值；同名时胜出）
       └────────────┬────────────┘
                    ▼
             容器进程环境变量
                    ▼
          应用 Settings / 测试进程读取
```

### 两次不同的“读取”

同一份 `--secret` 文件在 Compose 中承担两个不同角色：

1. `docker compose --env-file FILE` 为 `docker-compose.yml` 中的 `${NAME}` 提供
   **插值输入**。对当前命令而言，调用 shell 中已 `export` 的同名变量优先于该文件，
   再没有值才使用 `${NAME:-default}` 的默认值。
2. 服务声明中的 `env_file: "${STACK_SECRET_FILE:-.env}"` 将文件内容作为
   **容器基础环境**注入。服务声明中的 `environment:` 对同名变量拥有更高优先级。

所以最终运行值不是简单的“读取 `.env`”，而是：

```text
容器最终值 = environment 显式映射
          > env_file 注入值
          > 镜像 ENV / 应用默认值
```

这里的 `>` 表示同名时左侧胜出。当前 runner 没有依赖 `docker compose run -e`；
如果人工使用 `-e`，它又是一次更高优先级的显式覆盖。

### 三个脚本分别做什么

| 入口 | 职责 | 是否修改 dotenv 文件？ | 是否产生临时环境变量？ |
| --- | --- | --- | --- |
| `create_stack.sh` | 根据端口、主机、微信和存储模式创建/重建本地 API、worker、PostgreSQL、Redis、Mock 服务，以及 MinIO（如选择） | 否 | 是；生成 `STACK_*` 并只用于它启动的 Compose 进程 |
| `run_smoke_tests.sh` | 配置 focused smoke、调用 `create_stack.sh`、同步云端配置快照、从 API 容器回读最终存储配置，再启动 `smoke` 测试容器 | 否 | 是；生成 `SMOKE_*`、覆盖率和测试专用 `STACK_*` |
| `run_e2e_tests.sh` | 配置 E2E/coverage、调用 `create_stack.sh`、同步云端配置快照、从 API 容器回读最终配置，再启动 E2E actors | 否 | 是；生成 `E2E_*`、覆盖率和测试专用 `STACK_*` |

`run_smoke_tests.sh` 和本地模式的 `run_e2e_tests.sh` 都把 `create_stack.sh`
作为子进程运行。子进程中的 `export STACK_*` 不会反向进入父 runner。因此 runner 在
stack 启动后执行 `docker compose exec api printenv ...`，把 API 容器实际得到的
`S3_*`、provider host 和公开 API 地址读回来，再传给 smoke/E2E 容器。这样测试客户端
与被测 API 使用的是同一组最终值，而不是各自猜测。

云端 E2E 是另一条路径：它不创建本地 stack，直接使用 `--cloud` 指向的远端 API，
并要求所选 secret 文件提供远端测试所需的数据库、Redis 和 Admin 配置。

### 按变量判断最终来源

| 变量类别 | 本地运行时的最终来源 |
| --- | --- |
| `DATABASE_URL`、`REDIS_URL` | `docker-compose.yml` 的 `environment:` 固定为本地 `db` / `redis` 服务；dotenv 中的同名值会被容器环境覆盖 |
| `PUBLIC_API_BASE_URL` | `create_stack.sh` 根据 `--ip` 和 `--port` 生成 `STACK_PUBLIC_API_BASE_URL`，Compose 再映射为容器变量 |
| `S3_*`（MinIO） | `create_stack.sh` 生成容器端点、浏览器端点、本地凭据、签名和 path-style 设置 |
| `S3_*`（OSS） | bucket、region、公开 endpoint 和凭据先从所选 secret 文件读取；launcher 校验并转换为 `STACK_S3_*`，Compose 再映射为容器变量 |
| 微信相关变量 | `--wechat mock` 时由 launcher 生成 Mock 值；`--wechat real` 时由 launcher 从所选 secret 文件读取、校验后映射 |
| `JWT_SECRET`、Admin 和配置加密密钥 | 通常直接由服务的 `env_file` 注入，除非该服务另有显式 `environment:` 映射 |
| Smoke/E2E 时限、覆盖率和 actor 配置 | 由对应 runner 临时导出，并只传给该次 Compose/测试进程 |
| 未被任何上层设置的变量 | 应用 `Settings` 还会尝试当前工作目录的 `.env`，最后才使用字段默认值；容器镜像通过 `.dockerignore` 排除了仓库 `.env`，正常 Compose 容器不会依赖这一层 |

几个具体例子：

- `.env.minio-test` 即使误写了 `S3_ENDPOINT`，MinIO 模式仍会把容器内最终值设为
  `http://minio:9000`，因为 Compose 的显式 `environment:` 映射优先。
- `.env.oss-test` 的 `S3_BUCKET` 是有效输入；launcher 读取并校验它，然后通过
  `STACK_S3_BUCKET` 映射到 API、worker 和测试容器。
- dotenv 中的云数据库 `DATABASE_URL` 不会成为本地 API 的运行值；Compose 明确
  注入 `db` 容器地址。
- `LEGAL_DOCUMENTS_PUBLIC_BASE_URL` 没有相应的本地拓扑覆盖时，会直接从 `env_file`
  进入容器。这正是测试 profile 要删除陈旧值的原因：不是删除 Compose 的能力，
  而是避免一个本不该参与本地测试的基础输入成为最终值。

生产部署不使用这套本地优先级作为配置权威。SAE 的环境变量、密钥和部署配置才是
生产容器的输入；本页的 `.env.*-test` 只服务本地测试。

应用的 Pydantic `Settings` 配置了 `env_file=".env"`，因此直接在宿主机运行 Python
时，进程环境优先，其次才是当前目录的 `.env`，最后是代码默认值。Docker 构建通过
`.dockerignore` 排除了 `.env`；在 Compose 容器内，应用实际读取的是前述合并后的
容器进程环境，不会再打开宿主机上的 secret 文件。

### 如何查看真正的运行值

不要靠打开 `.env` 猜测。stack 启动后，从目标容器读取所关心的非敏感键：

```bash
docker compose \
  --env-file .env.minio-test \
  -p "yuanzhu-${DEV_TEST_PORT}" \
  exec --no-TTY api printenv S3_ENDPOINT

docker compose \
  --env-file .env.minio-test \
  -p "yuanzhu-${DEV_TEST_PORT}" \
  exec --no-TTY api printenv PUBLIC_API_BASE_URL
```

`docker compose ... config --quiet` 只验证合并结果，不输出密钥。不要把不带
`--quiet` 的完整 `config` 输出粘贴到日志或工单，因为渲染结果可能包含 secret。

## 运行前检查

为本次开发会话选择并记录一个 API 端口，不能复用其他任务的端口或 Compose
project。下面的 `19092` 只是示例：

```bash
export DEV_TEST_PORT=19092
```

在不输出密钥值的情况下检查两份配置能否被 Compose 解析：

```bash
STACK_SECRET_FILE=.env.minio-test \
  docker compose --env-file .env.minio-test --profile smoke config --quiet

STACK_SECRET_FILE=.env.oss-test \
  docker compose --env-file .env.oss-test --profile smoke config --quiet
```

OSS 测试前还要确认：

- endpoint 是公网 HTTPS，且不包含 `-internal.aliyuncs.com`；
- bucket 已开启版本管理；
- CORS 允许 launcher 输出的精确前端 origin，方法包括 `POST`、`GET`、`HEAD`，
  暴露 `ETag`、`Content-Length`、`x-oss-version-id`，且不用通配 origin；
- 测试凭据仅能读写、版本化和删除指定测试命名空间；
- bucket policy 要求加密时，配置 `AES256`。

## 运行 focused smoke

MinIO：

```bash
./scripts/run_smoke_tests.sh \
  --local localhost \
  --port "$DEV_TEST_PORT" \
  --wechat mock \
  --storage minio \
  --secret .env.minio-test \
  -- smoke_tests/test_voice_upload_sessions.py
```

真实阿里云 OSS：

```bash
./scripts/run_smoke_tests.sh \
  --local localhost \
  --port "$DEV_TEST_PORT" \
  --wechat mock \
  --storage oss \
  --secret .env.oss-test \
  -- smoke_tests/test_voice_upload_sessions.py
```

OSS 命令代表明确授权测试在配置的真实 bucket 创建并删除临时对象。Smoke 清理会
删除上传的精确对象版本，以及临时 SQL、Redis 和用户/工作区记录。

## 运行 E2E 门禁

MinIO coverage 模式：

```bash
./scripts/run_e2e_tests.sh \
  --local localhost \
  --port "$DEV_TEST_PORT" \
  --wechat mock \
  --storage minio \
  --secret .env.minio-test \
  --mode coverage
```

如果改动涉及 OSS 边界，再使用 `--storage oss --secret .env.oss-test` 重跑。
最终交付还需按照仓库 System Test Strategy 使用规定的 runner 数量和 300 秒
endurance 命令；focused smoke 不能替代这些门禁。

## 常见失败定位

| 现象 | 常见原因 | 处理方式 |
| --- | --- | --- |
| 测试流量开始前配置同步失败 | `CLOUD_API_URL` 或云端 Admin 凭据缺失/错误 | 修正三个 `CLOUD_*` 值，不要添加云数据库凭据 |
| MinIO 上传 URL 无法访问 | 会话主机/端口错误，或手工配置了陈旧 endpoint | 让 launcher 生成端点；仅宿主机测试使用 `--local localhost` |
| 法律文档指向旧 bucket/端口 | 测试配置混入 `LEGAL_DOCUMENTS_PUBLIC_BASE_URL` | 删除该变量，使用 API fallback |
| OSS launcher 拒绝 endpoint | 使用 internal/VPC-only 或非 HTTPS 地址 | 改用公网区域 `S3_PRESIGN_ENDPOINT` |
| OSS 表单 POST 被拒绝 | 签名模式、CORS、凭据或 bucket policy 错误 | 使用 `S3_SIGNATURE_VERSION=s3`，合并精确 origin CORS 并检查最小权限凭据 |
| complete 报告内容变化/缺失 | 没有版本管理、未暴露 ETag，或无法读取精确版本 | 开启版本管理并暴露所需响应头 |
| 端口冲突 | 其他任务占用了 API 或派生 MinIO 端口 | 为本次会话另选端口，禁止静默接管 |

## 每种成功结果证明什么

- MinIO 通过：在可重复的本地拓扑下，应用层 S3 合同成立；
- OSS 通过：同一合同在阿里云真实端点、签名、CORS、版本、元数据和加密行为下成立；
- 两者都不自动证明生产部署、真实微信或真实模型提供商，除非明确选择了对应模式；
- MinIO 测试访问 `CLOUD_API_URL` 只证明配置导入，不会把它变成云存储测试。
