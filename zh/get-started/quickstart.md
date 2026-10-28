# 快速开始：从 Mock 界面到持久化本地任务

按顺序完成六个里程碑。前三步无需后端；后三步连接真实本地 API/数据库，并使用模拟微信身份、支付结算与模型执行，不用于证明真实平台凭据或付费模型效果。

## 1. 准备工具与工作目录

从未用过终端请先完成 [macOS 准备](/zh/get-started/macos-setup)。首先需要 Node 22、前端固定的 pnpm 9.15.9 和微信开发者工具；Docker Desktop、Python 3.12、私有依赖权限及云测试配置在后续阶段准备。

以下假设目录为 `~/MyPrj/zyz`。`cd` 切换目录，`pwd` 显示目录。只复制命令，不复制提示符。本页通过 `npx` 调用 pnpm，确保各仓库使用正确版本。

**验收：**`node --version` 显示 `v22.*`，`npx --yes pnpm@9.15.9 --version` 显示 `9.15.9`。

## 2. 取得正确分支

[克隆仓库](/zh/get-started/macos-setup#下载仓库)后，检查前端：

```bash
cd ~/MyPrj/zyz/wechat_mini_program
git branch --show-current
```

应为 `ui-integration`。再单独进入 `YuanZhu-AI` 检查，应为 `main`。保留这两个并列文件夹；切换分支前保护已有本地改动。

**验收：**两个源码目录存在，分支正确。此时尚未启动 Docker。

## 3. 构建并打开前端 Mock

在新克隆的前端中复制示例配置并安装依赖。若已有 `.env`，保留原文件，不要覆盖复制。

```bash
cd ~/MyPrj/zyz/wechat_mini_program
cp .env.example .env
npx --yes pnpm@9.15.9 install --frozen-lockfile
VITE_ENABLE_PRIVATE_PROJECTS=false npx --yes pnpm@9.15.9 build:mp-weixin:mock
```

打开微信开发者工具 → **导入项目**，选择 `~/MyPrj/zyz/wechat_mini_program/dist/build/mp-weixin`，AppID 填 `wxec0d577de41255aa`，点击编译。你的微信账号需有该 AppID 开发权限。不要导入仓库根目录或 `src/`。

启动页结束后，进入 **AI设计 → AI轻盈设计 → 室内设计**，选择测试空间图片并完成模拟提交。此时登录、购买使用前端模拟数据，不连接本地服务。这个入门构建明确关闭项目 Tab。

**验收：**首页、设计表单和模拟结果都能打开。它证明前端环境可用，不证明后端已经联通。

## 4. 启动属于你的已配置后端

源码不能自动提供以下条件：

- 打开 Docker Desktop；向维护者申请私有 `Orientation-CD/jinqiuai` 读取权限，并把 GitHub SSH 密钥加载到 SSH agent。Docker 构建通过 `SSH_AUTH_SOCK` 读取此依赖，本地模拟环境也需要。
- 获取授权的**云测试**配置读取账号。导入器读取法律文档、提示词、Feature、Workflow、操作授权、套餐与 Token包，不导出供应商密钥。也可请维护者通过本地 Admin 配置等效内容。
- 选择 1024–22527 内的空闲 API 端口及自己拥有的 Compose 项目。下方仅在**你选择 8080**时使用它；不要为了腾出端口停止同事的栈。

新开终端标签页，为配置导入器准备后端本地 Python 环境：

```bash
cd ~/MyPrj/zyz/YuanZhu-AI
python3.12 -m venv .venv
.venv/bin/python -m pip install -e .
cp .env.example .env
open -a TextEdit .env
```

已有 `.env` 时跳过复制，保留其内容。用纯文本格式编辑，保留准确的 `.env` 文件名，设置自己的本地 `ADMIN_PASSWORD`。采用导入方案时，补充维护者私下提供的三项值：

```dotenv
CLOUD_API_URL=https://your-authorized-cloud-test-origin
CLOUD_ADMIN_USERNAME=your-cloud-test-admin
CLOUD_ADMIN_PASSWORD=your-cloud-test-password
```

这是占位示例，不是可用凭据。文件应保持 Git 忽略，报错时不要发送其内容。首次导入要求**新的 PostgreSQL 卷**。已有或部分配置的卷受到保护，应换新且属于自己的端口/项目，或手工配置，不要删除数据绕过保护。

设置你选择的端口，查看监听与已有 Compose 项目：

```bash
export DEV_TEST_PORT=8080
lsof -nP -iTCP:"$DEV_TEST_PORT" -sTCP:LISTEN
docker compose ls
.venv/bin/python scripts/stack_ports.py "$DEV_TEST_PORT"
```

最后一条输出 MinIO API、控制台端口；8080 对应 **29584**、**51088**。同样用 `lsof` 检查这两个端口是否已有监听。先解决所有权冲突，再启动新配置栈：

```bash
./scripts/create_stack.sh --port "$DEV_TEST_PORT" --ip localhost --wechat mock --storage minio --secret .env --import-cloud-config
curl --fail "http://127.0.0.1:$DEV_TEST_PORT/health/ready"
```

`--ip localhost` 适用于 Mac/模拟器；手机需要[平台接入](/zh/frontend/platforms)中的局域网设置。自己已有配置的栈再次启动时省略 `--import-cloud-config`。Docker 会保留命名卷。

**验收：**健康请求成功；`http://127.0.0.1:8080/admin`（替换为选定端口）能打开；本地 Admin 能看到现行法律文档、活跃产品配置、允许目标能力的会员套餐，以及有可用额度的生成配置。数据库、Redis 默认在容器内部，不意味着主机开放了 PostgreSQL 5432。

## 5. 为相同端口构建 API 前端

再开终端标签页。Shell 变量不会自动带入新标签页，需要再次设置**同一个选定端口**。以下显式设置关闭前端会员演示面板，并统一 API、报告和结果地址：

```bash
cd ~/MyPrj/zyz/wechat_mini_program
export DEV_TEST_PORT=8080
export SETUP_MINIO_API_PORT=$((DEV_TEST_PORT + 21504))
VITE_DATA_SOURCE=api \
VITE_MINI_PROGRAM_PLATFORM=weixin \
VITE_MINI_PROGRAM_AUTH_MODE=mock \
VITE_WECHAT_AUTH_MODE=mock \
VITE_PAYMENT_MODE=mock \
VITE_SHOW_BACKEND_STATUS=true \
VITE_ENABLE_SUBSCRIPTION_SCENARIOS=false \
VITE_ENABLE_PRIVATE_PROJECTS=true \
VITE_ALLOW_INSECURE_LAN_HTTP=true \
VITE_API_BASE_URL="http://127.0.0.1:$DEV_TEST_PORT" \
VITE_ASSET_BASE_URL=https://static.yuanzhushuzhi.com \
VITE_RESULT_STORAGE_ORIGINS="http://localhost:$SETUP_MINIO_API_PORT" \
VITE_REPORT_WEB_ORIGIN="http://localhost:$DEV_TEST_PORT" \
npx --yes pnpm@9.15.9 exec uni build -p mp-weixin
```

回到微信开发者工具，重新编译同一个 `dist/build/mp-weixin` 项目。本地 HTTP 测试需要启用“不校验合法域名、TLS 等”调试选项；发布包不能沿用此设置。

快捷脚本 `dev:mp-weixin:api-local` 内部固定 **8080**，并开启前端权益场景面板。在它前面加另一个 API URL 不能覆盖内部赋值。按本验收流程或使用自选端口时，请用上方显式命令。

进入**我的**，同意当前法律文档，通过本地模拟身份完成注册。网络请求应发往自己端口的 `/v1/...`，不要添加 `/api`。

**验收：**注册写入服务端，重新编译后仍是同一账号；功能发现可用，项目 Tab 出现。

## 6. 完成一笔本地购买、任务与持久化验收

新个人账号仍需允许该能力的生效订阅和足够 Token；前端演示覆盖不能授予后端权限。

1. 进入**我的 → 购买权益**，选择支持目标能力的订阅并确认。后端会创建待支付订单；原生微信支付可能无法使用本地模拟参数，这不代表订单未创建。不要反复建单。
2. 在开发者工具 **Network** 中找到成功的 `POST /v1/subscriptions` 响应，复制最外层 **`id`**，这是你自己的支付订单 UUID。
3. 在 **Console** 执行以下本地专用片段。将端口改为你的选择，将 `YOUR_ORDER_ID` 替换成上述 UUID。代码从准确的会话存储键读取当前模拟账号 Token，不把它输出到日志。

```js
(() => {
  const base = "http://127.0.0.1:8080";
  const orderId = "YOUR_ORDER_ID";
  const session = wx.getStorageSync("yuanzhu.session.tokens.v1");
  if (!session?.access_token || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    console.log("Sign in and set your own order UUID first.");
    return;
  }
  wx.request({
    url: `${base}/mock/payments/${orderId}/complete`,
    method: "POST",
    header: { Authorization: `Bearer ${session.access_token}` },
    success: ({ statusCode, data }) => console.log(statusCode, data.status),
    fail: () => console.log("Local settlement request failed.")
  });
})();
```

接口需要认证、校验本人订单，并且仅在后端模拟微信支付模式存在。它不是真实支付，也不能替代生产验签通知。返回 401 时重新进入账号页刷新会话；订单已非待支付状态时先查看记录，不要直接再建一笔。

4. 返回**支付记录**和**权益管理**，确认服务端订单为 `paid`、订阅已生效。余额不足时可同样购买并结算本地 Token包，订单 ID 取自 `/v1/token-purchases`。
5. 进入 **AI设计 → AI轻盈设计 → 室内设计**，上传小张 JPEG/PNG，填选项后仅提交一次。观察上传/完成校验、任务接收、轮询和本地模拟提供商的完成结果。
6. 打开**我的方案**，再重新编译或打开应用，不清理存储。任务和已购买权益应仍存在；Token明细应有对应预留与结算记录。

**验收：**服务端已支付订单、生效权限、已完成任务和可访问结果，在前端重启后仍存在。记录选定端口/项目和源码提交。结束时仅在 Docker Desktop 停止自己的 Compose 组，保留卷。

## 验收失败时先看哪里

| 现象 | 优先检查 |
| --- | --- |
| 找不到 `package.json` | `pwd` 是否位于正确仓库。 |
| 拉不到私有 Git 依赖 | 先查仓库权限和 SSH agent 转发，不反复重建。 |
| 服务健康但缺协议/功能/套餐 | 本地产品配置与导入，健康状态不代表配置完整。 |
| HTTP、文件、图片失败 | 本地域名调试设置、选定端口、派生 MinIO Origin、签名有效期。 |
| 订阅或余额被拒绝 | 服务端权益、功能权限和余额，确认没有前端演示覆盖。 |
| 原生支付失败 | 检查已有待支付订单，使用上述明确的本地模拟结算步骤。 |

继续阅读[前端开发入门](/zh/frontend/getting-started)、[项目](/zh/frontend/projects)、[本地服务栈](/zh/deploy/local-stack)与 [FAQ](/zh/get-started/faq)。

## 核验新的持久化边界

首次仍使用 **AI设计 → AI轻盈设计 → 室内设计** 的图片练习，不选专业户型候选功能验收后端 main。记录实际提交 endpoint：现有图片 UI 可以走受支持的适配接口，新 API 示例则使用 Workflows。

自有输入任务成功后，请本地数据库操作人员在**同一套栈**中只读核验这些记录，将 UUID 换成上传 Asset ID：

```sql
SELECT id, status, expires_at, object_key
FROM assets WHERE id = '<upload-asset-uuid>'::uuid;
SELECT id, asset_id, state, source_object_key, destination_object_key
FROM asset_input_archives WHERE id = '<upload-asset-uuid>'::uuid;
```

预期：已接受的自有输入为 ACTIVE、无过期时间；COMPLETED 归档 receipt 与原 Asset 身份相同，locator 对应耐久目标。重新打开客户端仍能看到 Job 和产物。只有 COMPLETED receipt、Asset 仍 READY／会过期，可能只是归档成功后准入被拒绝，不能算通过本检查。不要修改数据库来强行通过，详见[完整链路](/zh/reference/flows/asset-upload-flow)。

## 源码依据

前端 `21db6d8`、后端 `e59716c`（2026-10-28）：[构建命令](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/package.json) · [会话存储](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/stores/session.ts) · [本地启动器](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/create_stack.sh) · [端口派生](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/stack_ports.py) · [模拟结算](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/billing_api.py)。
