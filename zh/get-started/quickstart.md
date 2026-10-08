# 快速开始

本指南让你在几分钟内把**整套栈跑在自己的机器上**，而且**不需要你自己搭建任何后端基础设施**。你将运行：

1. 用 Docker Compose 跑**后端本地栈**（PostgreSQL、Redis、MinIO、API、worker、mock
   微信/支付/图像提供方）。
2. 跑**小程序前端**并在微信开发者工具中打开。

::: tip 为什么先从 mock 模式开始？
本地栈自带一个 **mock 微信身份提供方**、一个 **mock 支付提供方**和一个
**mock AI 图像提供方**。这让你能走通整个流程——登录、提交设计任务或语音总结、看着 worker 跑起来、拿到结果——**完全不需要任何真实凭据或模型调用费用**。
:::

## 1. 前置要求

先安装这些工具：

| 工具 | 为什么需要它 | 验证是否就绪 |
| --- | --- | --- |
| **Git** | 克隆仓库 | `git --version` |
| **Docker + Docker Compose** | 运行后端栈 | `docker compose version` |
| **Node.js ≥ 18** | 运行前端工具链 | `node --version` |
| **pnpm** | 前端包管理器 | `pnpm --version` |
| **微信开发者工具** | 打开/预览小程序 | 微信开发者工具桌面应用 |

## 2. 获取代码

克隆两个应用仓库。本文档假设工作目录为 `~/MyPrj/zyz`；你可以随意使用自己的目录。

```bash
# 后端——使用 main 分支
git clone -b main https://github.com/Orientation-CD/YuanZhu-AI.git

# 前端——使用 ui-integration 分支
git clone -b ui-integration https://github.com/Orientation-CD/wechat_mini_program.git
```

## 3. 启动后端本地栈

后端仓库里有一个启动脚本，会拉起完整的本地栈。在后端仓库根目录下：

```bash
cd YuanZhu-AI

# 准备 .env 文件（Compose 从中读取共享配置）
cp .env.example .env

# 创建默认栈。前端的 api-local 模式期望 8080 端口。
./scripts/create_stack.sh --port 8080
```

脚本会打印发布的端点。在默认配置下你会得到：

- **API**：`http://localhost:8080`
- **MinIO API / 控制台**：由 API 端口派生
- **PostgreSQL**：`postgresql://floorplan:floorplan@localhost:5432/floorplan`
- **Redis**：`redis://localhost:6379/0`

栈包含：

| 服务 | 角色 |
| --- | --- |
| `db` | PostgreSQL |
| `redis` | Redis |
| `minio` / `minio-init` | S3 兼容对象存储 |
| `migrate` | 运行 Alembic 迁移，然后退出 |
| `api` | 所选端口上的 FastAPI 服务 |
| `submit-worker` | ARQ 提交 worker |
| `poll-worker` | ARQ 轮询 worker |
| `mock-wechat-identity-provider` | 模拟微信 `code2session` / 手机号 |
| `mock-payment-provider` | 模拟微信支付 |
| `mock-image-provider` | 模拟 AI 图像提供方 |

::: tip 验证它是否健康
```bash
curl http://localhost:8080/health/ready
```
当 PostgreSQL 与 Redis 可达、且数据库已迁移时，返回
`{"status":"ready"}`。
:::

### 其他栈形态

```bash
# 真实微信（需要在 .env 中配置 WECHAT_APP_ID / WECHAT_MINI_PROGRAM_APP_SECRET）
./scripts/create_stack.sh --port 8080 --wechat real --storage minio --secret .env

# Mock 微信 + 真实阿里云 OSS（需要在 .env 中配置 S3_* 密钥）
./scripts/create_stack.sh --port 8080 --wechat mock --storage oss --secret .env
```

上述创建命令都会保留命名卷，因此重建栈绝不会清空你的数据。完整细节参见
[本地开发栈](/deploy/local-stack)。

## 4. 运行小程序前端

再开一个终端，然后：

```bash
cd wechat_mini_program
pnpm install

# 纯 UI 的 mock 模式——完全不需要后端（UI 工作最快）：
pnpm dev:mp-weixin:mock
```

当你想对接**真实本地后端**时，使用 API 模式 + **mock 登录/支付**
（因此不需要任何微信凭据）：

```bash
# 对接 http://127.0.0.1:8080 的 API 模式（与上面的栈一致）
pnpm dev:mp-weixin:api-local
```

::: tip 用哪个端口？
`dev:mp-weixin:api-local` 默认指向 `http://127.0.0.1:8080`。如果你把栈起在别的端口，覆盖它：
```bash
VITE_API_BASE_URL=http://127.0.0.1:9090 pnpm dev:mp-weixin:api-local
```
:::

两个 dev 脚本都会设置 `VITE_SHOW_BACKEND_STATUS=true` 与
`VITE_ENABLE_SUBSCRIPTION_SCENARIOS=true`，因此你会得到一个连接状态浮层，以及"我的 → 权益管理"中的订阅状态切换器。

## 5. 在微信开发者工具中打开小程序

1. 打开**微信开发者工具**，创建/导入一个小程序项目。
2. 把项目目录指向构建产物：
   - 开发（HMR）构建：`wechat_mini_program/dist/dev/mp-weixin`
   - 生产构建：`wechat_mini_program/dist/build/mp-weixin`
3. 把你的 **AppID** 设为项目的微信 AppID（`wxec0d577de41255aa`）。AppSecret
   **只**存在于后端，绝不能提交到前端仓库。
4. 因为 `api-local` 走的是回环 HTTP，请在开发者工具中开启
   **"不校验合法域名"**（设置 → 项目设置 → "不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"）。
5. 开发者工具编译并打开小程序模拟器。

你应该看到**广告启动页 → 品牌启动页 → 首页**，上面有功能卡片。点任意功能走一遍流程。

::: tip 真机测试
要在真机上对接你本地后端运行小程序，把手机与 Mac 连到同一局域网，然后用：
```bash
pnpm build:mp-weixin:api-device-wechat
```
构建脚本会拒绝运行，除非 `VITE_API_BASE_URL` 指向一个可达的局域网地址。
:::

## 6. 第一个"hello world"设计任务

在模拟器中打开 API 模式的前端后：

1. 打开任意一个图像功能（例如**室内设计**）。首页会跑积分预检；在 mock 注册模式下你会有充足的积分。
2. 从模拟器本地文件中选一张房间照片。
3. 完成各步骤后点**提交**。
4. 前端会触发**微信注册/登录门槛**——在
   `api-local`（mock 认证）下它会自动成功，无需手机号。
5. 设计任务页在 worker 对 **mock 图像提供方**跑任务期间**轮询**后端。
6. 结果图出现。

想试新的语音流程，打开**录音需求总结**，录一小段（或从聊天里选一个
MP3/M4A），可选填写客户信息（姓氏、称呼、项目名），然后提交。任务完成后你会落到 markdown 总结页，可以回放录音，并**暂停/续播**。

你可以实时观察后端在干活：

```bash
docker compose logs -f api submit-worker poll-worker
```

## 7. 停止或重置本地栈

在后端仓库根目录使用与
[后端 Issue #539](https://github.com/Orientation-CD/YuanZhu-AI/issues/539)
配套的清理脚本。你的后端 checkout 必须包含 `scripts/delete_stack.sh`。

```bash
# 预览精确的资源清单；不修改任何资源
./scripts/delete_stack.sh --port 8080 --dry-run

# 移除该项目的容器和网络；保留本地数据
./scripts/delete_stack.sh --port 8080

# 完整重置：不可逆地删除本地数据及冒烟覆盖率数据
./scripts/delete_stack.sh --port 8080 --volumes

# 如果创建栈时指定了 --project，清理时使用同一个名称
./scripts/delete_stack.sh --port 8080 --project my-local-stack --volumes --dry-run
./scripts/delete_stack.sh --port 8080 --project my-local-stack --volumes
```

清理脚本按 **Compose 项目名**选择环境，不会按 API 端口查找并删除容器。
如果预览显示 `none`，但 `docker ps` 能看到 8080 的容器，先查看项目标签：

```bash
docker ps --filter publish=8080 --format '{{.Names}}: {{.Label "com.docker.compose.project"}}'

# 示例：实际项目名是 yuanzhu-nine-clean-8080
./scripts/delete_stack.sh --port 8080 --project yuanzhu-nine-clean-8080 --volumes --dry-run
```

将标签值传给 `--project`。确认预览目标后，去掉 `--dry-run` 执行清理；
只有需要不可逆地重置数据时才保留 `--volumes`。

`--port` 必须显式指定（1024–22527）；默认项目名为 `yuanzhu-PORT`，因此
8080 端口对应 `yuanzhu-8080`。清理需要 Docker Compose、Git 和
Python 3 ≥ 3.10，但不需要原来的 `.env` 或密钥。可从同一个仓库 checkout
或同仓库的另一个 Git worktree 执行。不要同时创建或删除同一个项目。

`--volumes` 会永久删除所选项目的本地 PostgreSQL、Redis、MinIO 数据和
`smoke-coverage`，包括之前清理时保留下来的卷。其他项目、镜像、构建缓存、
源文件、密钥和前端产物会保留；外部 OSS 对象和隧道注册信息不受影响。
完整说明参见[本地栈清理](/zh/deploy/local-stack#停止或重置本地栈)。

## 故障排查

| 问题 | 可能原因 / 解决 |
| --- | --- |
| `curl http://localhost:8080/health/ready` 失败 | 栈没起来——跑 `docker compose logs api`，再重新执行 `./scripts/create_stack.sh` |
| 前端显示"无法连接后端服务" | `VITE_API_BASE_URL` 写错，或小程序访问的是非 HTTPS、非回环地址——使用 `api-local` 模式 |
| 端口已被占用 | 换一个 `--port`（1024–22527） |
| 开发者工具中 mock 登录失败 | 本地 HTTP 测试请开启"不校验合法域名"（跳过域名校验） |
| 录音选择器提示隐私未声明 | 同意微信隐私弹窗，或在小程序管理后台更新小程序的用户隐私保护指引 |

## 下一步

- 阅读[前端深入](/frontend/overview)。
- 阅读[后端深入](/backend/overview)。
- 准备好部署时，跟着[部署](/deploy/local-stack)走。
