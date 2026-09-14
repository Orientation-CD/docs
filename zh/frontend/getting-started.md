# 前端入门

本页带你完成小程序前端的安装、运行、构建与预览。我们默认你从未用过 uni-app。

## 前置要求

| 工具 | 用途 | 检查命令 |
| --- | --- | --- |
| **Node.js ≥ 18** | 运行 uni-app/Vite 工具链 | `node --version` |
| **pnpm** | 包管理器（本仓库使用 pnpm workspace） | `pnpm --version` |
| **微信开发者工具** | 官方桌面 IDE，用于编译与预览小程序 | 从 `https://developers.weixin.qq.com/` 安装 |

> 项目把 `@dcloudio/*` 锁定在 `3.0.0-5010520260709002`、Vite 锁定在 `5.2.8`。请使用 CI 中锁定的 Node 版本；Node 18 LTS 是稳妥的选择。

## 安装依赖

```bash
cd wechat_mini_program
pnpm install
```

这会安装 uni-app Vue 3 工具链、uview-plus、Vitest 以及测试脚手架。暂时没有需要单独执行的构建步骤——`dev:*` 脚本会在开发时即时编译。

## 构建模式矩阵

最关键的区分是**数据源**（mock 还是 API）——参见[数据源模式](/frontend/data-source-modes)。`package.json` 脚本把每种组合都编码好了。针对微信，你实际会用到的有：

| 命令 | 数据源 | 支付 | 微信登录 | 是否需要后端？ |
| --- | --- | --- | --- | --- |
| `pnpm dev:mp-weixin:mock` | mock | mock | mock | 否 |
| `pnpm dev:mp-weixin:api-local` | api | mock | mock | 是，`http://127.0.0.1:8080` |
| `pnpm dev:mp-weixin:api-local-wechat` | api | mock | **真实** | 是 |
| `pnpm dev:mp-weixin:api`（生产） | api | wechat | 真实 | 是（生产行为） |

裸的 `pnpm dev:mp-weixin` 是 uni-app 的通用启动脚本；本项目请始终显式使用 `:mock` / `:api-local` 这些变体。

## 开发运行（HMR）

```bash
# 纯 UI 开发——不需要后端，不需要任何凭据：
pnpm dev:mp-weixin:mock

# 对接你本地的后端（参见 入门指南 → 快速开始）：
pnpm dev:mp-weixin:api-local
```

该命令会编译并监听项目改动。产物输出到
`dist/dev/mp-weixin`。然后在微信开发者工具中打开该目录（见下文）。

::: tip 更换 API 基地址
`api-local` 默认指向 `http://127.0.0.1:8080`。要指向其他本地端口：
```bash
VITE_API_BASE_URL=http://127.0.0.1:9090 pnpm dev:mp-weixin:api-local
```
:::

::: tip 订阅场景切换器
`api-local` 与 `api-local-wechat` 还会设置
`VITE_ENABLE_SUBSCRIPTION_SCENARIOS=true`，从而在
"我的 → 权益管理"中注入一个开发面板（`SubscriptionScenarioPanel.vue`）。它让你在
`live | none | active-month | expiring-quarter | active-year | pending | expired`
之间切换，并只在客户端覆盖个人资料——绝不会写回后端。
生产构建会把这个面板完全剔除。
:::

## 构建

```bash
# 自包含的 mock 包（用于截图 / UI 评审）：
pnpm build:mp-weixin:mock

# 对接本地后端的 API 包（mock 登录 + mock 支付）：
pnpm build:mp-weixin:api-local

# 对接本地后端且使用真实微信登录的 API 包：
pnpm build:mp-weixin:api-local-wechat

# 生产 API 包（真实微信登录 + JSAPI 支付，仅 HTTPS）：
pnpm build:mp-weixin:api
```

生产构建（`build:mp-weixin:api`）会强制：

- `VITE_DATA_SOURCE=api`、`VITE_PAYMENT_MODE=wechat`、
  `VITE_WECHAT_AUTH_MODE=live`。
- `VITE_ALLOW_INSECURE_LAN_HTTP=false`——不允许不安全的局域网 HTTP。
- `VITE_SHOW_BACKEND_STATUS=false`——开发用的后端状态组件及其
  `/health/ready` 调用不会被打入包中。

### 真机构建（自动探测局域网 IP）

要在真机上对接你本地后端进行测试：

```bash
# 自动探测 Mac 的局域网地址，并构建指向它的 API 包：
pnpm build:mp-weixin:api-device-wechat
```

脚本 `scripts/require-device-api-url.mjs` 会拒绝构建，除非
`VITE_API_BASE_URL` 被设置为一个可达的局域网主机。你的 Mac 与手机必须在同一网络，且后端栈正运行在该端口上。

## 在微信开发者工具中预览

1. 打开**微信开发者工具** → 导入已有项目。
2. 把 **AppID** 设为 `wxec0d577de41255aa`。**绝不要**提交 AppSecret——它只存在于后端。
3. 把项目目录指向构建产物：
   - 开发服务器（HMR）：`wechat_mini_program/dist/dev/mp-weixin`
   - 已构建包：`wechat_mini_program/dist/build/mp-weixin`
4. 开发者工具会编译并显示模拟器。

::: tip 本地 HTTP 测试
用 `api-local` 对接 `http://127.0.0.1:8080` 时，请在开发者工具中开启
**"不校验合法域名"**（设置 → 项目设置 → "不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"）。回环地址 HTTP 不是常规的小程序域名，`src/services/request.ts` 中的请求层之所以允许它，是因为 `VITE_ALLOW_INSECURE_LAN_HTTP` 仍保持开发默认值。
:::

## 环境变量

前端所有环境变量都是**编译期**的，且以 `VITE_` 为前缀。它们在
`src/env.d.ts` 中声明（让 TypeScript 认识它们），并在
`.env.example` 中列出：

| 变量 | 取值 | 含义 |
| --- | --- | --- |
| `VITE_DATA_SOURCE` | `mock` / `api` | 选择 mock 还是 API 仓库 |
| `VITE_PAYMENT_MODE` | `mock` / `wechat` | mock 支付还是真实微信 JSAPI 支付 |
| `VITE_WECHAT_AUTH_MODE` | `mock` / `live` | mock 身份还是真实 `wx.login` + 手机号授权 |
| `VITE_SHOW_BACKEND_STATUS` | `true` / `false` | 是否包含开发用后端状态浮层 |
| `VITE_ENABLE_SUBSCRIPTION_SCENARIOS` | `true` / `false` | 是否包含开发用订阅场景面板 |
| `VITE_API_BASE_URL` | URL | 后端 REST 基地址（例如 `http://127.0.0.1:8080`） |
| `VITE_ASSET_BASE_URL` | URL | 目录图片的 CDN 源站（默认 `https://static.yuanzhushuzhi.com`） |
| `VITE_ALLOW_INSECURE_LAN_HTTP` | `true` / `false` | 开发时是否允许回环/私有局域网 HTTP |
| `VITE_REPORT_WEB_ORIGIN` | URL | 唯一允许承载报告 `web-view` 页面的 HTTPS 源站 |
| `VITE_RESULT_STORAGE_ORIGINS` | 逗号分隔列表 | 信任的、用于结果媒体的 OSS 源站（精确匹配，逗号分隔） |
| `VITE_WECHAT_CORP_ID` | 字符串 | 企业微信 corp id（客服卡片） |
| `VITE_WECHAT_CUSTOMER_SERVICE_URL` | URL | 企业微信客服链接 |
| `VITE_REPORT_WEB_ORIGIN` | URL | 允许用于报告 web-view 的 HTTPS 源站 |

> 广告图片、企业微信客服卡片与客服电话**不是**环境变量。它们是共享 CDN 上的固定对象（`ads/beta-recruitment-splash.png`、`ads/beta-recruitment-home-banner.png`、`contact/enterprise-wechat-card.jpg`），电话则硬编码在联系我们页面中。换品牌时只需更新 CDN 对象，无需改代码。

这些变量如何被校验、又能解锁哪些组合，参见[数据源模式](/frontend/data-source-modes)。

## 项目配置文件

| 文件 | 用途 |
| --- | --- |
| `project.config.json` | 微信开发者工具项目设置（appid、编译设置） |
| `project.private.config.json` | 个人/本地的开发者工具覆盖配置（不共享） |
| `src/manifest.json` | uni-app/微信构建清单（AppID、`scope.record` 权限、压缩） |
| `src/pages.json` | 全部页面、分包、tabBar、globalStyle |
| `vite.config.ts` | Vite 构建 + 编译期别名接线 |
| `tsconfig.json` / `tsconfig.test.json` | TypeScript 配置（应用 vs 测试） |
| `vitest.config.ts` | 单元测试运行器 + 覆盖率门槛 |

## 边写边做类型检查与测试

```bash
pnpm type-check        # vue-tsc --noEmit
pnpm test             # 领域测试 + vitest 单元测试
pnpm quality:mp-weixin:mock   # 完整本地门禁（契约 + 设计系统 + 构建 + 质量）
```

完整门禁清单见[测试与质量门禁](/frontend/testing)。

## 下一步

- [架构](/frontend/architecture)——代码是如何组织的。
- [关键用户流程](/frontend/key-flows)——主要交互的细节。
- [测试与质量门禁](/frontend/testing)——改动如何被验证。
