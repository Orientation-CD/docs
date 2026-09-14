# 测试与质量门禁

前端把测试与构建质量当作**一等发布门禁**。在下列检查全部通过之前，一次改动不算"完成"。共有四层：**领域测试**、**Vitest 单元测试**、**API 契约检查**，以及检查真正编译产物的**构建期质量门禁**。

## 测试命令

```bash
# 纯领域逻辑（Node 内置运行器，无需打包器）
pnpm test:domain

# 用 Vitest 跑单元测试
pnpm test:unit

# 全部（领域 + 单元）
pnpm test

# 覆盖率
pnpm test:coverage
pnpm test:unit:watch

# 类型检查
pnpm type-check
pnpm type-check:test

# 完整质量门禁（CI 使用）
pnpm quality:mp-weixin:mock
pnpm quality:mp-weixin:api
```

`quality:mp-weixin:api` 由以下步骤组装：

```
check:api-contract && check:design-system && build:mp-weixin:api
  && check-code-quality.mjs --api-production
```

还有一些需要真实后端的集成/冒烟运行器：

```bash
pnpm test:integration:auth          # node --test tests/authApi.integration.test.mjs
pnpm test:integration:design-config # tests/importDesignConfig.test.mjs
pnpm test:smoke:server               # tests/serverBacked.smoke.test.mjs
pnpm test:smoke:coverage             # 真实 API 脚手架覆盖率
pnpm test:smoke:design-ui            # 设计垂直切片运行器
```

## 1. 领域测试（`pnpm test:domain`）

**不做任何 I/O** 的纯业务逻辑位于 `src/domain/`
（`report.ts`、`tasks.ts`、`wallet.ts`），用 Node 内置测试运行器执行：

```bash
node --experimental-strip-types --test tests/domain.test.mjs
```

它们在毫秒级跑完，无需打包器。

## 2. 单元测试（`pnpm test:unit`）

Vitest 1.6.1 运行 `tests/` 下约 115 个 `tests/*.test.ts` 文件。配置在
`vitest.config.ts`：

- **环境**：`happy-dom`。
- **Setup**：`tests/setup.ts` 从
  `tests/harness/` 安装 `uni` mock，在每个测试间重置 mock，并清空 DOM。
- **别名**：镜像生产别名，但固定指向 mock 实现（因此单元测试始终跑在确定性数据上）。
- **包含**：`tests/**/*.test.ts`。

覆盖率通过 `@vitest/coverage-v8` 收集：

| 门槛 | 值 |
| --- | --- |
| 语句 | 全局 30% |
| 分支 | 全局 67% |
| 函数 | 全局 44% |
| 行 | 全局 30% |

在全局底线之上，还有一长串**关键文件被钉死在 100%**（V8 对生成的 Vue 包装器映射不到的地方接近 100%）：

- 领域：`src/domain/report.ts`、`src/domain/tasks.ts`、`src/domain/wallet.ts`。
- 请求/可观测：`src/services/request.ts`、
  `src/services/apiObservability.ts`、`src/services/pollScheduler.ts`、
  `src/services/idempotency.ts`。
- 首页门槛：`src/services/homeEntryGuard.ts`、
  `src/services/personalTokenPreflight.ts`、`src/pages/home/index.vue`。
- 设计提交：`pkg-features/repositories/designAssets.ts`、
  `standardDesignJob.ts`、`furnitureDesignJob.ts`、`designJobSubmit.ts`、
  `pkg-features/services/standardDesignSubmit.ts`、`furnitureDesignSubmit.ts`、
  `designTokenPreflight.ts`、`imageFileMetadata.ts`、`designSubmitError.ts`。
- 语音：`pkg-features/repositories/voiceAudioAssets.ts`（由
  `voiceAudioAssets.test.ts`、`voiceAudioFiles.test.ts`、
  `voiceSummarySubmit.test.ts`、`voiceSummaryPage.test.ts` 覆盖）。
- 方案/markdown：`pkg-plans/services/reportViewer.ts`、
  `pkg-plans/pages/markdown/index.vue`（由 `markdownSummary.test.ts`、
  `markdownSummaryPage.test.ts` 覆盖）、`pkg-plans/repositories/resultFile.ts`。
- 计费/支付：`pkg-account/repositories/paymentOrder.ts`、
  `paymentHistory.ts`、`paymentResume.ts`、`paymentReconciliation.ts`、
  `paymentClose.ts`、`purchaseRequest.ts`、`pkg-account/services/payment.ts`、
  `pricePresentation.ts`、`entitlementPresentation.ts`。
- 账户/会话：`src/repositories/session.ts`、`account.ts`、`profile.ts`、
  `designJobs.ts`、`designJobDetail.ts`、`workspaceDesignJobs.ts`、`content.ts`。

排除在覆盖率之外：`*.d.ts`、`src/api/dto/**`、`src/types/**`、
`src/main.ts`、`src/App.vue`。

### 单元测试覆盖了什么

- 仓库的**响应校验**（mock 与 API 契约一致性）——每个规整化函数都有测试，喂入畸形 JSON 并期望抛出
  `*RESPONSE_INVALID`。
- 服务：轮询调度器、请求/令牌刷新、报告查看器校验、支付桥、幂等、retry-after、设计失败呈现。
- 用 `@vue/test-utils` 覆盖组件与页面逻辑——首页、功能外壳、选项宫格、语音总结页、markdown 页、支付页。

## 3. 契约检查（`check:api-contract`）

前端把自己钉死在后端的 **OpenAPI 契约**上，从而把漂移拦在 CI 里，而不是生产里：

| 脚本 | 作用 |
| --- | --- |
| `check-openapi-snapshot.mjs` | 校验已提交的 OpenAPI 快照与预期契约一致；`--update` 刷新；`--live` 从运行中的后端拉取 |
| `check-contract-fixtures.mjs` | 校验测试使用的契约夹具 |
| `check-api-dtos.mjs` | 对照契约校验 `src/api/dto/*` |
| `check-api-contract.mjs` | 运行以上三个 |

保持快照同步是正常后端契约变更的一部分：

```bash
pnpm openapi:update    # 后端变更后重新生成快照
```

## 4. 构建期质量门禁

`scripts/check-code-quality.mjs` 检查**编译后的小程序**，任何违规都会让构建失败：

| 门禁 | 校验内容 |
| --- | --- |
| `lazyCodeLoading: requiredComponents` | 主包不预加载未使用组件 |
| 压缩 | JS / WXML / WXSS 已压缩；不夹带依赖文件 |
| 合法域名校验 | 发布配置开启了合法域名校验（域名白名单） |
| 包体积 | 主包与每个分包 ≤ 1.5 MiB |
| 内置媒体 | 媒体 ≤ 200 KiB（超过 180 KiB 告警） |
| 禁用文件 | 不含 CDN 照片、`.DS_Store`，或仅被分包使用的主包 JS |
| 无已删除包 | 构建产物不含已移除的"成本方案"包 |
| 生产卫生 | API 生产包排除开发健康检查与连接状态组件 |

供参考的最近 mock 模式体积：主包约 395 KiB，
`pkg-features` 约 57 KiB，`pkg-plans` 约 9 KiB，`pkg-account` 约 26 KiB。

## 真实微信开发者工具 UI 测试（可选）

关于在**真实微信开发者工具**内做 UI 自动化（首次运行配置、不抢焦点、选择器、同步、确定性状态覆盖），见
`documents/MINIPROGRAM_REAL_UI_TESTING.md`。
`pnpm test:smoke:design-ui` 运行器会端到端地执行一个设计垂直切片。

## 提交前建议流程

```bash
pnpm test:domain
pnpm type-check
pnpm quality:mp-weixin:mock    # 快速本地反馈
pnpm quality:mp-weixin:api     # 生产包门禁（CI）
```

## 下一步

- [数据源模式](/frontend/data-source-modes)——为什么 mock 与 API 构建都要过门禁。
- [设计系统](/frontend/design-system)——`check:design-system` 强制了什么。
