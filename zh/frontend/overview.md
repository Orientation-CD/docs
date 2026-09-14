# 前端概览

前端仓库（`wechat_mini_program`，包名 `yuanzhu-ai-mini-program`）承载的是产品直接面向用户的应用——**微信小程序**。本节将深入讲解技术栈、代码结构、架构、构建模式、关键用户流程、设计系统与测试。我们默认你**没有任何** uni-app 或微信小程序的经验，每个概念都会在上下文里讲清楚。

> 仓库分支：`ui-integration`。内部微信 AppID 为
> `wxec0d577de41255aa`（公开）。AppSecret、OpenID 与会话密钥**只存在于服务端**，绝不能出现在本仓库中。

## 它是什么

- 一个 **uni-app** 项目——基于 Vue 的元框架（meta-framework），同一套源码可以编译到**微信小程序**（主目标，也是唯一正式发布的目标）、其他小程序平台（支付宝、百度、抖音、QQ……）以及 H5。
- 使用 **Vue 3（组合式 API，`<script setup>`）+ TypeScript** 编写，并采用 **uview-plus**（`uview-plus` 3.8.55）提供现成组件。
- 运行时状态刻意保持极简：唯一持久化的 store 是一个轻量级的**模块级会话令牌存储**（`src/stores/session.ts`），底层用 `uni.setStorageSync` 持久化。`package.json` 中没有引入任何全局状态管理库；页面只使用本地的 `ref`/`computed` 加上仓库调用。
- 产品与交互的唯一事实来源是 `documents/UI.md`；API 契约则是 `documents/REST_API_INTERFACE.md`。

## 产品功能

首页由一个自动轮播的首屏大图（hero carousel）加上一个 3×N 的功能宫格组成。功能分为**已发布**（已对用户上线）和**开发中**（可见但标注"即将上线"）两类：

| 功能键（`FeatureKey`） | 页面 | 结果类型 | 状态 |
| --- | --- | --- | --- |
| `interior` | `pkg-features/pages/interior/index` | `IMAGE` | 已发布 |
| `local` | `pkg-features/pages/local/index` | `IMAGE` | 已发布 |
| `furniture` | `pkg-features/pages/furniture/index` | `IMAGE` | 已发布 |
| `kitchen` | `pkg-features/pages/kitchen/index` | `IMAGE` | 已发布 |
| `bathroom` | `pkg-features/pages/bathroom/index` | `IMAGE` | 已发布 |
| `colored_floor_plan` | `pkg-features/pages/colored_floor_plan/index` | `IMAGE` | 已发布 |
| `voice_summary` | `pkg-features/pages/voice_summary/index` | `MARKDOWN` | 已发布 |
| `report`（`html_report`） | `pkg-features/pages/report/index` | `HTML_REPORT` | 服务端已从首页下线 |
| `ai_tour_video`、`space_renewal_animation` | — | — | 开发中占位 |

功能是否可用**不是**硬编码的。首页会请求 `GET /v1/billing/catalog`，由后端决定哪些任务类型处于启用状态；未知或未启用的类型会渲染为"开发中"卡片。详见 `src/repositories/designCatalog.ts`。

在设计功能之上还有一层账户/计费体系：微信注册/登录、个人与企业工作空间、商店（积分包/订阅）、支付订单、积分台账、企业席位、分享邀请与推荐奖励。

## 仓库结构

```
wechat_mini_program/
├── src/
│   ├── pages/                  # 主包（tabBar + 启动页）
│   │   ├── ad-splash/index.vue # 5 秒可跳过的广告启动页
│   │   ├── splash/index.vue    # 3 秒品牌启动页
│   │   ├── home/index.vue      # 首页：广告 banner、首屏轮播、功能宫格
│   │   ├── contact/index.vue   # 联系我们
│   │   ├── plans/index.vue     # 我的方案（方案列表）
│   │   └── profile/index.vue   # 我的（个人中心 tab）
│   ├── pkg-features/           # 分包：设计 + 语音流程
│   │   ├── pages/{interior,local,kitchen,bathroom,colored_floor_plan,
│   │   │            furniture,report,voice_summary}/index.vue
│   │   ├── components/         # FeatureShell, StandardFeaturePage, OptionGrid,
│   │   │                       # UploadStep, ImageConfirmStep, ClientInfoForm,
│   │   │                       # SubmittedStep, TokenShortageDialog ...
│   │   ├── composables/        # useDesignTokenCost, useSubmissionEligibility
│   │   ├── repositories/      # designAssets, designJobSubmit, standardDesignJob,
│   │   │                       # furnitureDesignJob, promptCatalog, voiceAudioAssets ...
│   │   └── services/           # *DesignSubmit, voiceSummarySubmit, voiceAudioFiles, ...
│   ├── pkg-plans/              # 分包：方案详情、报告、markdown 总结
│   │   ├── pages/detail/index.vue
│   │   ├── pages/report/index.vue
│   │   ├── pages/markdown/index.vue   # 语音总结查看 + 可续播
│   │   ├── repositories/       # designJob, resultFile, httpUrl
│   │   └── services/           # markdownSummary, reportViewer, designComparison, resultDownload
│   ├── pkg-account/            # 分包：登录、商店、计费、组织、积分
│   │   ├── pages/{login,profile,legal,store,orders,subscription,organization,
│   │   │            invitation,rewards,tokens}/index.vue
│   │   ├── components/         # AccountPage、开发用 SubscriptionScenarioPanel
│   │   ├── repositories/       # paymentOrder, paymentHistory, paymentResume,
│   │   │                       # paymentReconciliation, paymentClose, purchaseRequest,
│   │   │                       # billingCatalog, workspaces, memberSelfLeave, rewards ...
│   │   └── services/           # payment, pricePresentation, entitlementPresentation,
│   │                           # subscriptionRenewal, storeDemo*, submissionCatalogPresentation
│   ├── repositories/           # 共享异步仓库（session, profile,
│   │                           # designJobs, designCatalog, content, workspaces, ...）
│   ├── services/               # 共享服务（request, wechatAuth, accountGate,
│   │                           # pollScheduler, homeEntryGuard, clientInfo, assets, ...）
│   ├── stores/session.ts       # 令牌对持久化（唯一的 store）
│   ├── api/dto/                # 带类型的 API 契约（design, session, billing, workspace）
│   ├── domain/                 # 纯领域逻辑（report, tasks, wallet）
│   ├── types/                  # 共享 TS 类型（design, home, account, auth）
│   ├── components/             # 共享组件（home/FeatureGrid, home/HeroCarousel,
│   │                           # common/RemoteImage, common/DesignIcon, account/..., dev/...）
│   ├── static/                # 图标、tabBar 图片、品牌素材、占位图
│   ├── styles/                # design-tokens.json + 生成的 SCSS/TS、placeholder.scss
│   ├── App.vue                 # 应用入口（启动时水合会话）
│   ├── main.ts                 # createSSRApp + uview-plus
│   ├── manifest.json           # uni-app / 微信构建清单（AppID、权限）
│   └── pages.json              # 页面、分包、tabBar、globalStyle
├── scripts/                    # 构建辅助、质量门禁、设计系统生成
├── tests/                      # Vitest 单元测试 + node:test 领域测试 + 测试脚手架
├── documents/                  # UI 规范、REST API 接口、运维手册
├── vite.config.ts              # 构建 + 编译期别名接线
├── vitest.config.ts            # 测试运行器 + 覆盖率门槛
└── package.json               # 脚本（各平台的 dev/build/test）
```

## 关键设计决策

### 1. 页面绝不直接发起 HTTP 请求

每个页面只依赖**异步仓库**。页面的 `.vue` 文件中不存在任何 fetch 调用。正是仓库层让 Mock 模式与 API 模式可以无缝互换——参见[数据源模式](/frontend/data-source-modes)。

### 2. Mock 与 API 在编译期决定

`vite.config.ts` 使用 Vite 的 **resolve 别名**，根据 `VITE_DATA_SOURCE`、`VITE_WECHAT_AUTH_MODE` 等变量，把抽象模块名（如 `AccountRepositoryRuntime`、`TaskRepositoryRuntime`、`WechatCodeRuntime`）指向 mock 或 API 实现。**没有运行时开关**；每次构建都是一份固定配置。

### 3. 每个后端响应都经过校验

仓库函数把原始 JSON 当作 `unknown` 处理，再重塑成带类型的领域对象；一旦违反契约就抛出 `ApiRequestError`（`code: *RESPONSE_INVALID`）。这正是保证 mock/API 一致性的手段——参见 `src/repositories/designJobs.ts` 中的 `mapDesignJobResponseMedia` 与 `src/repositories/designJobDetail.ts` 中的 `mapDesignJobDetail`。

### 4. 编译期严格检查

构建过程会运行类型检查（`vue-tsc`）、领域测试、单元测试，以及一整套**质量门禁**来检查编译产物（包体积、领域校验、禁用文件）。参见[测试与质量门禁](/frontend/testing)。

## 主包与分包

微信对主包体积有限制。较重的功能代码被拆分为**分包**，按需加载（在 `src/pages.json` 中声明，并开启
`mp-weixin.optimization.subPackages: true` 与
`lazyCodeLoading: "requiredComponents"`）：

| 分块 | 内容 |
| --- | --- |
| 主包 | 启动页、首页、方案、个人中心、联系我们、tabBar |
| `pkg-features` | 设计 + 语音功能流程页面及其逻辑 |
| `pkg-plans` | 方案详情、HTML 报告查看器、markdown 语音总结查看器 |
| `pkg-account` | 登录、商店、订单、订阅、组织、邀请、奖励、积分 |

最近的 mock 模式体积（来自项目 README）：主包约 395 KiB，
`pkg-features` 约 57 KiB，`pkg-plans` 约 9 KiB，`pkg-account` 约 26 KiB。微信对每个分块的限制是 1.5 MiB。

## 底部 tabBar

`pages.json` → `tabBar` 中声明了四个 tab：

| Tab | 页面 |
| --- | --- |
| 首页 | `pages/home/index` |
| 联系我们 | `pages/contact/index` |
| 我的方案 | `pages/plans/index` |
| 我的 | `pages/profile/index` |

选中态颜色为品牌鼠尾草绿 `#526F5A`；未选中态为 `#858A85`。

## 下一步

- [前端入门](/frontend/getting-started)——安装、运行、构建。
- [架构](/frontend/architecture)——分层、分包、store 及其协作方式。
- [数据源模式](/frontend/data-source-modes)——mock 与 API，以及每一个环境变量。
- [关键用户流程](/frontend/key-flows)——每个主要交互在界面上发生了什么。
- [设计系统](/frontend/design-system)——设计令牌与 UI 约定。
- [测试与质量门禁](/frontend/testing)。
