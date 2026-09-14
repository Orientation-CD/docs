# 前端架构

本页讲解小程序内部是如何组织的、各部分如何协作。如果还没读过，建议先看[概览](/frontend/overview)。本文假设你熟悉 Vue 3，但不假设你熟悉 uni-app。

## 分层

前端被拆成若干层。数据单向流动——页面依赖服务/仓库，服务/仓库再依赖 DTO 与请求客户端：

```
┌─────────────────────────────────────────────────────────────┐
│ 页面（Vue SFC）                                              │
│   pages/*, pkg-features/pages/*, pkg-plans/pages/*,         │
│   pkg-account/pages/*                                       │
├─────────────────────────────────────────────────────────────┤
│ Composables + 服务（业务逻辑、编排）                          │
│   src/services/*, src/pkg-features/services/*,              │
│   src/pkg-account/services/*, */composables/*               │
├─────────────────────────────────────────────────────────────┤
│ 仓库（异步数据访问；mock 或 API 实现）                        │
│   src/repositories/*, pkg-features/repositories/*, ...     │
├─────────────────────────────────────────────────────────────┤
│ DTO + 请求客户端                                              │
│   src/api/dto/*  ← 带类型的 API 契约                        │
│   src/services/request.ts ← HTTP + 令牌刷新 + 上传          │
├─────────────────────────────────────────────────────────────┤
│ Store + 领域                                                  │
│   src/stores/session.ts（令牌持久化）                        │
│   src/domain/*（纯领域逻辑，无 I/O）                          │
└─────────────────────────────────────────────────────────────┘
```

### 页面

路由与分包边界在 `src/pages.json` 中声明。tabBar 有四个 tab：首页、联系我们、我的方案、我的。

**主包**（`src/pages/`）：

| 路径 | 导航样式 | 用途 |
| --- | --- | --- |
| `pages/ad-splash/index` | custom | 5 秒可跳过的广告启动页 |
| `pages/splash/index` | custom | 3 秒品牌启动页 |
| `pages/home/index` | custom | 首页（广告 banner、首屏轮播、功能宫格、积分预检） |
| `pages/contact/index` | default | 联系我们 |
| `pages/plans/index` | default | 我的方案列表 |
| `pages/profile/index` | default | 我的 |

**`pkg-features`**（设计 + 语音流程）：`interior`、`local`、`kitchen`、
`bathroom`、`colored_floor_plan`、`furniture`、`report`、`voice_summary`。

**`pkg-plans`**：`detail`（单个设计任务）、`report`（HTML 报告 web-view）、
`markdown`（语音总结查看，支持可续播）。

**`pkg-account`**：`login`、`profile`、`legal`、`store`、`orders`、
`subscription`、`organization`、`invitation`、`rewards`、`tokens`。

### Store：`src/stores/session.ts`

整个应用只有一个 store，而且刻意做得极小。它是一个**模块级单例**（不是 Pinia），把 access/refresh 令牌对保存在内存中，并镜像写入
`uni.setStorageSync`：

- 存储键：`yuanzhu.session.tokens.v1`。
- 应用启动时（`App.vue` → `onLaunch` → `sessionTokenStore.hydrate()`）会校验已存储的令牌对，并清理历史遗留键
  （`yz_access_token`、`yz_refresh_token`、`yz_user_profile`）。
- 暴露 `getAccessToken()`、`getRefreshToken()`、`applyTokenPair(pair)`、
  `clear()`。

页面把其他所有状态都放在本地 `ref`/`computed` 中。这样既避免了引入全局状态库，又保证了凭据只有一个事实来源。

### 请求客户端：`src/services/request.ts`

所有 API 仓库共用的唯一 HTTP 网关。关键行为：

- 为每个请求构造 `X-Request-ID`（`mp-<ts>-<seq>-<rand>`），并设置
  `Accept: application/json`。
- 对 `auth: true` 的调用附加 `Authorization: Bearer <access>`。
- **自动令牌轮换**：收到 `401 AUTH_TOKEN_EXPIRED_OR_INVALID` 时，会**只调用一次** `POST /v1/auth/refresh`（用共享的 `refreshPromise` 把并发的 401 合并成一次刷新），然后用新令牌重放原始请求。其他 401 错误码则清空会话。
- 把后端错误归一化为带类型的 `ApiRequestError`，携带
  `statusCode`、`code`、`details`、`requestId`、`retryAfterSeconds`。FastAPI 的校验错误数组会被拍平成可读的消息。
- 校验 API 基地址：始终要求 HTTPS；HTTP 只允许回环地址，或在
  `VITE_ALLOW_INSECURE_LAN_HTTP=true` 时允许私有局域网地址
  （`10/8`、`172.16/12`、`192.168/16`）。
- 提供 `uploadFile(path, filePath, formData)`，对 multipart 上传施加相同的令牌轮换行为。

### DTO：`src/api/dto/`

与后端 OpenAPI 对应的带类型契约：

| 文件 | 定义的类型 |
| --- | --- |
| `session.ts` | `WechatLoginRequest`、`TokenPair`、`WechatSession`、`CurrentUser`、`Subscription`、`Enterprise`、`LegalDocument`、`UpdateCurrentUserRequest` |
| `billing.ts` | `BillingCatalog`、`SubscriptionPlan`、`TokenPackage`、`PaymentOrder`、`PaymentPage`、`CreateSubscriptionRequest`、`CreateTokenPurchaseRequest` |
| `design.ts` | `DesignJob`、`DesignJobType`、`AssetUploadIntent`、`AssetCompletion`、`DesignJobCreateRequest`、`DesignJobClientInfo`、`DesignJobOutput`、`PromptTemplate` |
| `workspace.ts` | `WorkspaceSummary`、`WorkspaceDetail`、`TokenDetailItem`、分享/推荐邀请、奖励 |

仓库实现会校验每一个响应；一旦违反服务端契约就抛出
`ApiRequestError`（`code: *RESPONSE_INVALID`）——这正是 mock/API 一致性的强制手段。

## 仓库模式

页面只依赖仓库。每个仓库都有两种形态，在构建期通过
`vite.config.ts` 中的 **Vite 别名**选择：

| 别名 | API 构建 | Mock 构建 |
| --- | --- | --- |
| `AccountRepositoryRuntime` | `repositories/accountApi.ts`（拒绝——离线数据源） | `repositories/account.ts` |
| `TaskRepositoryRuntime` | `repositories/tasksApi.ts` | `repositories/tasks.ts` |
| `WechatCodeRuntime` | `services/wechatCodeLive.ts` | `services/dev/wechatCodeMock.ts` |
| `BackendStatusRuntime` | `components/dev/BackendStatusHidden.vue` | `components/dev/BackendStatus.vue` |
| `StoreDemoRuntime` | `pkg-account/services/storeDemoDisabled.ts` | `pkg-account/services/storeDemoMock.ts` |
| `SubscriptionScenarioRuntime` | `services/subscriptionScenarioDisabled.ts` | `services/dev/subscriptionScenarioMock.ts` |
| `SubscriptionScenarioPanelRuntime` | 隐藏面板 | `pkg-account/components/dev/SubscriptionScenarioPanel.vue` |

注意一个有趣的不对称：在 **API 模式**下，旧的大而全的
`Session/Workspace/Billing/Organization` 仓库被
`accountApi.ts` 桩掉了（它们会抛出 `"该离线数据源在生产 API 模式不可用"`）。真正的 API 模式使用更新、更窄的仓库：`wechatSessionRepository`（`repositories/session.ts`）、`currentProfileRepository`
（`repositories/profile.ts`）、`personalDesignJobRepository`
（`repositories/designJobs.ts`），以及 `pkg-features/repositories/` 与
`pkg-account/repositories/` 下的按功能划分的仓库。

### 共享仓库（`src/repositories/`）

| 仓库 | 端点 | 职责 |
| --- | --- | --- |
| `wechatSessionRepository`（`session.ts`） | `POST /v1/auth/wechat-login`、`POST /v1/auth/refresh`、`POST /v1/auth/logout`、`GET /v1/legal-documents/current` | 静默登录、注册、法务同意、登出 |
| `currentProfileRepository`（`profile.ts`） | `GET /v1/me`、`PATCH /v1/me` | 当前用户、订阅、积分、企业、邀请 |
| `personalDesignJobRepository`（`designJobs.ts`） | `GET/DELETE /v1/design-jobs` | 列出/删除个人设计任务 |
| `designJobRepository`（`designJobDetail.ts`） | `GET /v1/design-jobs/{id}` | 单个任务详情，媒体已规整化 |
| `workspaceDesignJobRepository`（`workspaceDesignJobs.ts`） | 工作空间维度的任务列表 | 企业"全部方案"视图 |
| `designJobTypeCatalogRepository`（`designCatalog.ts`） | `GET /v1/billing/catalog`（公开，ETag 缓存） | 功能可用性 + 积分成本 |
| `contentRepository`（`content.ts`） | 静态 | 首屏轮播、功能宫格、空间/风格选项目录 |
| `workspacesRepository`（`workspaces.ts`） | 工作空间相关端点 | 工作空间列表/切换 |

### 设计任务响应契约的规整化

`src/repositories/designJobs.ts` 中的 `mapDesignJobResponseMedia(job, reject)` 是列表与详情共用的标准规整化函数。它会：

- 遍历 `job.inputs`，只接受带类型的 `image` / `audio` / `text` 条目，收集第一张图片 `input`、`recording` 音频输入（并对照上传时使用的同一套限制校验 sha256/etag/时长/大小），拒绝未知形态。
- 遍历 `job.outputs`，把 `artifact`（图片/音频/文件）、`report`
  （HTML）或 `text` 总结（markdown）分别路由到带类型的槽位。
- 对 `voice_summary` 任务强制要求 1–3 个音频输入，并在
  `status === completed` 时必须提供 markdown 文本。

`mapDesignJobDetail`（`designJobDetail.ts`）把它与
`mapDesignJobStatus`、`mapClientInfo` 组合，产出完全带类型的
`DesignJobDetail`。后端 provider 的输入输出变化都经由这几个唯一入口。

## 关键服务

| 服务 | 作用 |
| --- | --- |
| `services/wechatAuth.ts` | 构造微信登录请求（code + 手机号 code + 已同意的法务文档） |
| `services/accountGate.ts` | 共享的注册门槛；静默登录、手机号授权、法务同意、`ensureRegisteredForAction()` |
| `services/homeEntryGuard.ts` | `inspectHomeEntry(tokenCost)`——在功能打开前统计在途任务数（`ACTIVE_JOB_LIMIT = 5`）并执行个人积分预检 |
| `services/personalTokenPreflight.ts` | `personalCatalogTokenShortage(profile, cost)` / `assertPersonalTokenBalance(profile, jobType)` |
| `services/pollScheduler.ts` | 通用轮询循环；遵守 `poll_after_seconds`/`Retry-After`，页面隐藏时暂停，卸载时销毁 |
| `services/clientInfo.ts` | 校验/规整化 `ClientInfoDraft` → `DesignJobClientInfo`（`last_name`、`salutation`、`project_name`） |
| `services/idempotency.ts` | 从一个逻辑动作（`scope`、`ownerId`、`actionId`）推导出稳定的 `Idempotency-Key` |
| `services/assets.ts` | 基于 `VITE_ASSET_BASE_URL` 解析 CDN 图片 URL，并内置兜底 |
| `services/advertising.ts` | 广告启动页 + 首页 banner（CDN 对象 + 本地占位图） |
| `pkg-features/services/*DesignSubmit.ts` | 提交流程：`standardDesignSubmit`、`furnitureDesignSubmit`、`reportDesignSubmit`、`voiceSummarySubmit` |
| `pkg-features/repositories/designAssets.ts` | 图片上传 intent → 直传 → complete，带进度 |
| `pkg-features/repositories/voiceAudioAssets.ts` | 音频上传 intent → 直传 → complete，带重试与重复 sha256 拒绝 |
| `pkg-account/services/payment.ts` | 微信 JSAPI 桥（`uni.requestPayment`），带类型的 `PaymentBridgeError` |
| `pkg-account/services/subscriptionRenewal.ts` | 对生效中订阅给出"暂不支持提前续订"引导 |

## 一个功能流程是如何接线的（以语音总结为例）

1. 用户在首页点 **录音需求总结** → `home/index.vue` 调用
   `inspectHomeEntry(catalog.features.voice_summary.jobType.token_cost)`。如果个人积分余额不足，弹窗引导去商店；如果已经有 5 个任务在途，则跳转"我的方案"。
2. 页面导航到 `pkg-features/pages/voice_summary/index.vue`。
3. 页面加载目录（积分成本、展示名），检查提交资格
   （`useSubmissionEligibility`），并从
   `yuanzhu.voice-summary-draft.v1` 恢复草稿。
4. 用户录制（通过 `uni.getRecorderManager`，MP3/16 kHz/单声道/48 kbps，单次最长 10 分钟）或最多选择 3 个文件（MP3/WAV/AAC/M4A，≤ 25 MB，≤ 120 分钟）。每个文件都会按扩展名校验文件签名。
5. 提交时，`submitVoiceSummary` 校验输入 + 客户信息，并行拉取个人资料 + 目录，断言资格与积分余额，随后
   `stageVoiceAudioFiles` 携带幂等键执行 intent→上传→complete 的流程。
6. `submitDesignJob` 以 `POST /v1/design-jobs` 提交
   （`type: "voice_summary"`、assets、可选 `client_info`），并导航到
   `/pkg-plans/pages/markdown/index?id=<jobId>`。
7. markdown 页面通过 `createPollScheduler` 轮询
   `loadMarkdownSummary(id)` 直到终态，随后渲染经过清洗的 markdown 块，并以**可续播**的方式回放原始录音（参见
   [关键用户流程](/frontend/key-flows)）。

## 值得知道的 uni-app 细节

- **页面生命周期**：使用 `@dcloudio/uni-app` 的
  `onLoad`、`onShow`、`onHide`、`onUnmounted`、
  `onPullDownRefresh`、`onShareAppMessage`、`onShareTimeline`（而不是普通 Vue 的 `onMounted`）。
- **`easycom`**：`pages.json` 通过
  `^u-(.*)` → `uview-plus/components/u-$1/u-$1.vue` 自动注册 uview-plus 组件，因此 `<u-button>` 无需 import 即可使用。
- **存储**：始终使用 `uni.getStorageSync` / `uni.setStorageSync`（封装在
  `runtime.ts` 中）。绝不要碰 `localStorage`。
- **录音**：`uni.getRecorderManager()`；语音页面用
  `WeakMap`/`WeakSet` 仔细追踪录音器的归属，以便在导航后丢弃过期的终态事件。
- **隐私**：录音与选文件按钮受
  `uni.getPrivacySetting().needAuthorization` 门控；按钮设置
  `open-type="agreePrivacyAuthorization"`，这样可以在系统权限弹窗前先同意微信的隐私弹窗。
- **分包**在 `pages.json` 的 `subPackages` 下声明；主包永远不会静态引用分包代码。

## 启动顺序

`main.ts` 导出 `createSSRApp(App)` 并注册 `uviewPlus`。`App.vue`
实现 `onLaunch` → `sessionTokenStore.hydrate()`，并全局引入生成的设计令牌与 uview-plus 样式。令牌水合是同步且非阻塞的；第一次带认证的 API 调用会在需要时刷新令牌。

## 下一步

- [数据源模式](/frontend/data-source-modes)——mock/API 是如何选择的。
- [关键用户流程](/frontend/key-flows)——交互细节。
- [设计系统](/frontend/design-system)——设计令牌与 UI 约定。
