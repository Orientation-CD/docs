# 数据源模式

前端支持两种最根本的运行模式，由环境变量在**编译期**决定。没有运行时开关：每次构建都是一份固定配置，未使用的实现会被 tree-shaking（摇树优化）剔除。

## 两种模式

| 模式 | `VITE_DATA_SOURCE` | 后端 | 典型用途 |
| --- | --- | --- | --- |
| **Mock** | `mock` | 不需要 | UI 开发、截图、演示、UI 评审 |
| **API** | `api` | 需要 | 集成测试与生产 |

### Mock 模式

每个仓库都有一份内存中的实现，完整模拟 UI 与状态流转：不需要微信即可完成登录，不需要微信支付即可完成支付，设计任务按确定性流程推进。这让开发者可以在**没有后端、没有任何凭据**的情况下把整个 UI 搭出来。

```bash
pnpm dev:mp-weixin:mock     # 带 HMR 的开发服务器
pnpm build:mp-weixin:mock   # 自包含的产物包
```

在 mock 模式下，`vite.config.ts` 做了如下别名：

- `AccountRepositoryRuntime` → `src/repositories/account.ts`（功能丰富的 mock，预置了个人 + 组织工作空间、商品、成员）。
- `TaskRepositoryRuntime` → `src/repositories/tasks.ts`（异步任务 mock）。
- `WechatCodeRuntime` → `src/services/dev/wechatCodeMock.ts`。
- `BackendStatusRuntime` → `src/components/dev/BackendStatus.vue`。
- `StoreDemoRuntime` → `src/pkg-account/services/storeDemoMock.ts`。
- `SubscriptionScenarioRuntime` → `src/services/dev/subscriptionScenarioMock.ts`
  （以及可见的场景面板）。

### API 模式

仓库通过 `src/services/request.ts` 调用位于 `/api/v1` 的真实后端。认证与支付再由另外两个变量进一步选择：

- `VITE_WECHAT_AUTH_MODE=mock|live`
  - `mock`——后端本地的 mock 登录（不真正调用微信）。
  - `live`——真实的微信 `wx.login` + 手机号授权。
- `VITE_PAYMENT_MODE=mock|wechat`
  - `mock`——后端的 mock 支付端点。
  - `wechat`——真实的微信 JSAPI 支付。

| 构建 | 数据源 | 认证 | 支付 | 后端 |
| --- | --- | --- | --- | --- |
| `dev:mp-weixin:api-local` | api | mock | mock | 本地 `127.0.0.1:8080` |
| `dev:mp-weixin:api-local-wechat` | api | **真实** | mock | 本地 |
| `build:mp-weixin:api`（生产） | api | 真实 | wechat | 生产 |

在 API 模式下，旧的大而全账户仓库被
`src/repositories/accountApi.ts` 替换，它把每个方法都经由
`unavailableApiRepository(...)` 代理——这是一道显式护栏，防止在生产构建里发起离线式调用。真正的 API 仓库是那些更窄、测试更完善的仓库（`wechatSessionRepository`、
`currentProfileRepository`、`personalDesignJobRepository`、
`designJobTypeCatalogRepository`，以及按功能划分的仓库）。

## 开关是如何接线的

`vite.config.ts` 是唯一的事实来源。它读取
`process.env.VITE_DATA_SOURCE`、`VITE_WECHAT_AUTH_MODE`、
`VITE_SHOW_BACKEND_STATUS`、`VITE_ENABLE_SUBSCRIPTION_SCENARIOS`，并计算出 Vite 的 **resolve 别名**：

```ts
const dataSourceModule = (apiPath, mockPath) => fileURLToPath(
  new URL(process.env.VITE_DATA_SOURCE === "api" ? apiPath : mockPath, import.meta.url),
);

resolve: {
  alias: {
    AccountRepositoryRuntime: dataSourceModule("./src/repositories/accountApi.ts",
                                              "./src/repositories/account.ts"),
    TaskRepositoryRuntime:    dataSourceModule("./src/repositories/tasksApi.ts",
                                              "./src/repositories/tasks.ts"),
    WechatCodeRuntime: fileURLToPath(new URL(
      process.env.VITE_WECHAT_AUTH_MODE === "mock"
        ? "./src/services/dev/wechatCodeMock.ts"
        : "./src/services/wechatCodeLive.ts", import.meta.url)),
    // ... BackendStatusRuntime, StoreDemoRuntime, SubscriptionScenarioRuntime,
    //     SubscriptionScenarioPanelRuntime
  },
}
```

TypeScript 通过 `src/env.d.ts` 中的模块声明"看见"这些别名，因此即使
`AccountRepositoryRuntime` 在磁盘上并不真实存在为文件，导入它也能通过类型检查。

## 环境变量（编译期，`VITE_` 前缀）

在 `src/env.d.ts` 中声明，并在 `.env.example` 中列出：

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `VITE_DATA_SOURCE` | — | `mock` 或 `api` |
| `VITE_PAYMENT_MODE` | — | `mock` 或 `wechat` |
| `VITE_WECHAT_AUTH_MODE` | — | `mock` 或 `live` |
| `VITE_SHOW_BACKEND_STATUS` | — | 是否包含开发用后端状态浮层与 `/health/ready` 调用 |
| `VITE_ENABLE_SUBSCRIPTION_SCENARIOS` | — | 是否包含开发用订阅场景覆盖面板 |
| `VITE_API_BASE_URL` | — | 后端 REST 基地址（例如 `http://127.0.0.1:8080`） |
| `VITE_ASSET_BASE_URL` | `https://static.yuanzhushuzhi.com` | 目录/静态图片的 CDN 源站 |
| `VITE_ALLOW_INSECURE_LAN_HTTP` | `false` | 开发构建中是否允许对回环或私有局域网使用 `http://` |
| `VITE_REPORT_WEB_ORIGIN` | — | 唯一允许承载报告 `web-view` 页面的 HTTPS 源站 |
| `VITE_RESULT_STORAGE_ORIGINS` | — | 信任的、用于结果媒体的 OSS 源站（精确匹配，逗号分隔） |
| `VITE_WECHAT_CORP_ID` | — | 企业微信 corp id |
| `VITE_WECHAT_CUSTOMER_SERVICE_URL` | — | 企业微信客服链接 |

::: warning 已废弃的文档变量
本文档早期版本曾列出 `VITE_AD_SPLASH_IMAGE_URL`、
`VITE_HOME_AD_BANNER_IMAGE_URL`、`VITE_SERVICE_PHONE` 和
`VITE_WECHAT_CARD_URL`。它们已经不存在了。广告是固定的 CDN 对象；客服电话硬编码在联系我们页面；企业微信客服卡片是固定的 CDN 图片。
:::

## 请求层的安全校验

`src/services/request.ts` 对 API 基地址施加强约束：

- 必须是格式良好的 `http(s)://authority`，且主机名合法（不能含 `@`）。
- `https://` 始终允许。
- `http://` 只允许用于**回环**（`localhost`、`127.0.0.1`、
  `[::1]`），或在 `VITE_ALLOW_INSECURE_LAN_HTTP=true` 时允许私有局域网地址（`10/8`、`172.16.0.0/12`、`192.168/16`）。

同样的规则也通过 `validateUploadUrl` / `parseHttpUrl` 施加到
`pkg-features/repositories/designAssets.ts` 与
`voiceAudioAssets.ts` 中的预签名上传 URL 上，因此恶意或配置错误的上传 intent 绝不可能把字节导向攻击者的源站。

生产构建把 `VITE_ALLOW_INSECURE_LAN_HTTP` 设为 `false`，因此 API 包只能访问 HTTPS 源站。

## 报告 web-view 源站

`VITE_REPORT_WEB_ORIGIN` 必须是**单个 HTTPS 源站**，且已在微信小程序的业务域名中注册。它用于校验 `web-view` 报告会话（`src/services/reportViewer.ts`），会话必须与该源站一致、必须是 HTTPS，且未过期。

## 生产构建包含/排除了什么

- **排除**：开发用后端状态浮层、`/health/ready` 调用、订阅场景面板，以及 mock 账户/任务实现。
- **包含**：全部八个功能流程、账户/计费，以及生产接线。
- **强制**（通过 `scripts/check-code-quality.mjs` 中的质量门禁）：
  开启合法域名校验、`lazyCodeLoading: requiredComponents`、压缩 JS/WXML/WXSS、不含已删除的"成本方案"包、分包体积不超标。

## 实践中如何选模式

- **UI 工作 / 设计评审** → Mock。
- **边开发边对接后端** → `api-local`（如需对本地栈演练真实登录，切换到
  `api-local-wechat`）。
- **验证与生产完全一致的行为** → `build:mp-weixin:api`。

## 下一步

- [架构](/frontend/architecture)——模式背后的仓库层。
- [关键用户流程](/frontend/key-flows)——每种模式下会发生什么。
