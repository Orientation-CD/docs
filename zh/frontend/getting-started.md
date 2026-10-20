# 前端开发入门

使用 **Node 22** 和仓库固定的 **pnpm 9.15.9**。第一次用终端请先读 [macOS 准备](/zh/get-started/macos-setup)，了解工具、目录和分支；完整前后端闭环见[快速开始](/zh/get-started/quickstart)。

## 安装和预览 Mock

在前端 `ui-integration` 分支运行：

```bash
pnpm install --frozen-lockfile
pnpm build:mp-weixin:mock
```

没有全局 pnpm 时，将 `pnpm` 换成 `npx --yes pnpm@9.15.9`。微信开发者工具导入 **`dist/build/mp-weixin`**，使用公开 AppID `wxec0d577de41255aa` 和有开发权限的微信账号。不要导入源码根目录或 `src/`。

监听开发模式：

```bash
pnpm dev:mp-weixin:mock
```

输出是 **`dist/dev/mp-weixin`**。保留终端运行，Control–C 停止。Mock 可演示初始图片流程，无需后端；不能由此推断 API 专用录音、视频、报告、文案都可用。

## 选择构建目标

| 用途 | 命令或入口 | 重要行为 |
| --- | --- | --- |
| 微信 Mock | `build:mp-weixin:mock` / `dev:mp-weixin:mock` | 前端模拟数据，不强制开启项目 |
| 本地 API + 模拟身份/支付 | `build:mp-weixin:api-local` / `dev:mp-weixin:api-local` | API 固定8080，开启前端订阅场景面板 |
| 本地 API + 真实微信身份 | `build:mp-weixin:api-local-wechat` | 正式登录、后端模拟支付，可指定 API Origin |
| 真机 + 正式微信身份 | `build:mp-weixin:api-device-wechat` | 要求明确的可用 LAN API URL，不会自动发现 Mac 地址 |
| 正式 API | `build:mp-weixin:api` | 正式微信登录/支付、HTTPS、项目开启、无健康提示 |
| 抖音 Mock | `build:mp-toutiao:mock` | 平台专用模拟预览 |
| 抖音本地/云测试/生产 | `build:mp-toutiao:local-test`、`:cloud-test`、`:cloud-production` | 包装脚本检查环境并检查编译产物 |

不存在 `dev:mp-weixin:api`。裸 `dev:mp-weixin` 直接执行 uni-app，依赖环境中已有设置，推荐显式模式。

## 本地 API 的前置条件

先启动已配置且属于自己的后端。空白服务健康仍不够：需要法律文档、Feature、模板、套餐与生成配置。个人提交还需要允许该能力的生效订阅与 Token。

`api-local` 在脚本内把 `VITE_API_BASE_URL` 覆盖成 `http://127.0.0.1:8080`。自定义端口使用[快速开始](/zh/get-started/quickstart)的显式环境变量加 `pnpm exec uni build -p mp-weixin` 示例，同时设置 MinIO/报告 Origin 并关闭演示权益覆盖。

开发者工具启用本地 HTTP 域名/TLS 调试例外，重新编译 **API 产物**，注册后确认服务端权益，再提交任务。发布不能沿用调试例外。API-local 的微信支付桥仍是原生调用，本地模拟结算是独立后端测试步骤。

## 配置文件与产物

| 文件 | 职责 |
| --- | --- |
| `package.json`、`pnpm-lock.yaml` | 固定工具链与命令 |
| `.env.example`、`src/env.d.ts` | 环境变量示例和类型声明 |
| `src/manifest.json` | 应用/平台元信息与权限 |
| `src/pages.json` | 路由、分包、Tab 与页面导航 |
| `project.config.json` | 微信开发者工具发布设置 |
| `project.private.config.json` | 本地工具覆盖 |
| `vite.config.ts`、`config/build-targets.mjs` | 别名、预处理、抖音构建档 |

前端环境值在编译时进入包。保留本地 `.env`，修改后重新构建，不能放入 AppSecret 或供应商密钥。文档仓库使用 pnpm **10.28.2**，依赖与应用分开安装。

交付前运行[测试与门禁](/zh/frontend/testing)。完整设置见[数据源模式](/zh/frontend/data-source-modes)，设备/域名要求见[平台接入](/zh/frontend/platforms)。

## 源码依据

前端 `eca0a5f`（2026-10-20）：[命令](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/package.json) · [抖音构建档](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/config/build-targets.mjs) · [设备 URL 校验](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/scripts/require-device-api-url.mjs)。
