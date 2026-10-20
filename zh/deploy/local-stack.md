# 本地开发环境

前后端联调使用后端保留数据卷的 Docker Compose 栈，包含 PostgreSQL、Redis、MinIO 和两个 worker。仅运行前端 mock 构建不会经过这些服务。

## 先确认会话端口与归属

启动、重建或测试之前，与环境负责人确认本会话的 API 端口，记录端口、Compose project、checkout 和负责人。下面的命令要求显式设置，不替你选择端口：

```bash
export DEV_TEST_PORT='<负责人选定的 API 端口>'
export DEV_TEST_PROJECT="yuanzhu-${DEV_TEST_PORT}"
```

有效 API 端口为 1024–22527。MinIO API 端口为 API + 21504，控制台端口为 API + 43008。每次运行前检查三个端口，以及运行/停止的容器和保留卷。启动器可能移除同仓库的冲突 Compose project；这不代表可以接管别人的会话。有冲突时，请负责人另选端口或明确授权接管。

## 构建前提

准备 Docker Compose/Buildx、Git，以及启动器 Settings/导入工具需要的 Python 依赖。从 `.env.example` 创建被忽略的 `.env`，不要把 dotenv 当作 shell 脚本执行。

当前镜像还会经 GitHub SSH 443，从私有 `Orientation-CD/jinqiuai` 的 `master` 构建视频依赖。调用 shell 必须有 `SSH_AUTH_SOCK` 和获准读取该仓库的 agent key。Compose 已声明 SSH forwarding；直接构建镜像需传 `--ssh default`。镜像日志会记录实际供应商提交，请保留：同一后端提交的重新构建可能取得更新的供应商版本。即使本次不生成视频，缺少 SSH 权限也会导致镜像构建失败。

## 建立联调栈

在后端 checkout 中，完成归属检查后运行：

```bash
cp .env.example .env
./scripts/create_stack.sh \
  --port "${DEV_TEST_PORT:?请先选择本会话端口}" \
  --project "$DEV_TEST_PROJECT" --ip localhost \
  --wechat mock --storage minio --secret .env \
  --import-cloud-config
```

`--import-cloud-config` 需要授权云测 Admin 的 `CLOUD_API_URL`、`CLOUD_ADMIN_USERNAME`、`CLOUD_ADMIN_PASSWORD`。它先读取、验证产品配置快照，再重建；仅向**全新 PostgreSQL 卷**导入提示词、Feature、Workflow 图、订阅方案、积分包和法律文档。不会导出 provider 密钥，模型调用在本地替换为 mock。该参数只支持 MinIO。

裸栈可能已启动，却没有可用法律文档、可购买产品或可运行的 Feature。readiness 成功不代表登录、同意协议和作业提交可用。已配置的保留卷由普通重建保留；部分配置或来源不明的卷会拒绝覆盖，应使用新的、属于本会话的 project/端口。不要向已迁移的升级测试卷反复导入旧云端配置。

```bash
curl --fail "http://localhost:${DEV_TEST_PORT}/health/ready"
```

管理后台为 `http://localhost:<选定端口>/admin`，使用配置的管理员身份。mock 手机用户登录不会获得管理员权限。

## 连接小程序

使用[快速开始](/zh/get-started/quickstart)中的显式环境变量 + `pnpm exec uni build -p mp-weixin` 配方，同时设置本会话 API、存储和报告源站，并关闭演示权益覆盖。短脚本 `dev:mp-weixin:api-local` 在内部固定 **8080**，前缀传入其他 URL 不能覆盖它。

真机需要可达的局域网地址和前端允许的本地 HTTP 配置/构建脚本；手机上的 `localhost` 指手机本身。真实微信、抖音登录需要另外选择对应模式，配置真实应用凭据和合法域名。切换前先查看 `./scripts/create_stack.sh --help`。

## 查看并保留本会话环境

```bash
docker compose --env-file .env -p "$DEV_TEST_PROJECT" ps
docker compose --env-file .env -p "$DEV_TEST_PROJECT" logs --tail 100 api
```

普通启动、smoke/E2E 都保留数据库、Redis、MinIO 命名卷。不要把 `down -v` 当作常规清理。宿主机 PostgreSQL 映射与 API 端口分开，smoke/E2E 会关闭该映射。配置优先级与 MinIO/OSS 选择见[存储与测试环境](/zh/testing/storage-environments)。

## 源码依据

已按[本文档记录的源码版本](/zh/reference/source-revisions)核对；实际运行配置与云端启用状态需要单独确认。

- [本地运行手册](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/runbook.md)
- [启动器及冲突行为](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/create_stack.sh)
- [会话与测试策略](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/tests/documents/TEST_STRATEGY.md)
- [镜像与私有供应商依赖](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/Dockerfile)
