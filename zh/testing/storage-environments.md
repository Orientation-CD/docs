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

保留原始 `.env` 作为运维/部署配置源，在 `YuanZhu-AI` 仓库根目录创建两份
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
