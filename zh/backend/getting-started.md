# 本地启动后端

使用审计版本的后端仓库及 Python 3.12 或更新版本。Docker Compose 运行 PostgreSQL、Redis、对象存储、外部模拟服务、API 与 worker。镜像还会构建私有视频依赖，因此构建前需按后端 runbook 配置 GitHub SSH/BuildKit。

## 准备本次会话

启动或重建服务前先读[本地环境](/zh/deploy/local-stack)。选择并记录本次 API 端口；agent 必须先向用户取得端口选择。检查 API 端口、派生 MinIO 端口及 Compose 项目归属，不能接管其他会话保留的环境。

在**后端仓库根目录**运行：

```bash
cp .env.example .env
# 将 DEV_TEST_PORT 设为本次会话选定的端口。
./scripts/create_stack.sh --port "${DEV_TEST_PORT:?Set the selected session port}" \
  --wechat mock --storage minio --secret .env
```

真实 `.env` 与私钥不得提交 Git。启动器迁移本地 schema 并等待 readiness，通过后输出浏览器可访问的 API/存储地址。手机应使用该地址，不能使用手机自身的 `localhost`。

```bash
curl "http://localhost:${DEV_TEST_PORT}/health/live"
curl "http://localhost:${DEV_TEST_PORT}/health/ready"
```

Readiness 仅检查 PostgreSQL 与 Redis，不代表真实模型或支付网关已经通过验收。

## 第一次认证调用

1. 通过[法律文档](/zh/admin/legal-documents)发布当前服务条款与隐私政策。注册/登录需携带当前文档 ID 和明确同意。
2. 按[认证指南](/zh/backend/authentication)使用密码注册/登录、模拟微信登录或已配置的抖音流程。
3. 读取 `/v1/me`、`/v1/me/workspaces` 与公开目录 `/v1/billing/features`。
4. 在[管理后台](/zh/admin/getting-started)配置可执行 Workflow、开放 Feature 与所需套餐权限。
5. 创建并完成[上传意图](/zh/backend/assets-storage)，使用显式工作空间和持久幂等键提交 `/v1/workflows`。

API 启动时使用 `ADMIN_PHONE` 与 `ADMIN_PASSWORD` 创建配置的管理员；已有账号会提升为管理员，但已有密码不会自动重置。打开启动器输出的 API origin 加 `/admin`。

测试命令与端口归属以页末固定版本 runbook 为准；阅读文档无需启动真实付费或云端测试。完整变量见[配置参考](/zh/reference/configuration)。

---

代码依据 · backend `e59716c8`: [scripts/runbook.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/runbook.md) · [scripts/create_stack.sh](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/create_stack.sh) · [app/main.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/main.py).
