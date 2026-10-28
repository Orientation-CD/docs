# 前端测试与产物门禁

在前端根目录使用 Node22、pnpm9.15.9。单测通过、编译产物、API 集成、真实供应商/设备验收，证明的边界不同。按实际变化选择检查，并记录对应源码版本和环境。

## 源码测试与当前命令链

```bash
pnpm type-check
pnpm type-check:test
pnpm test
pnpm check:api-contract
pnpm check:design-system
```

`pnpm test` 现在依次运行 **domain → 包体预算测试 → unit**。Domain 测试使用 Node 类型擦除 runner；Vitest 使用 happy-dom、Vue Test Utils 和 uni harness。测试 alias 有意替换实现，因此 Mock 组件通过不能证明 API 包选择了正确模块。

可用 `pnpm test:unit` 或受影响文件快速反馈；`test:coverage` 使用当前 `vitest.config.ts` 的全局/逐文件阈值，不在正文维护另一份易过时的数字表。

## 契约证据及其限制

| 检查 | 证据边界 |
| --- | --- |
| `check:openapi` | 已提交通用快照的一致性 |
| `check:openapi:live` | 明确指定且可访问的后端 OpenAPI |
| `check:contract-fixtures`、`check:api-dtos` | 指定 fixture/投影与 DTO 兼容 |
| `check:api-contract` | package.json 列出的源码/路由/origin/fixture/DTO/项目联合检查 |
| `openapi:update` | 有意修改快照，接受前需审阅 diff |

路由源码门禁只有证明局部 const 为查询串或空串，才移除相应尾部，这避免误删动态路由段；构建赋值中的静态素材 origin 与禁止的远端 API origin 分开识别。

户型 fixture 来自候选后端分支。门禁证明前端符合这些 fixture，**不能**证明本轮后端 `main` 或线上部署已提供功能，见[户型契约范围](/zh/frontend/floor-plans)。不要对恰好占用熟悉端口的任意栈重新生成无关 fixture。

## 实际小程序包体门禁

```bash
pnpm quality:mp-weixin:mock
pnpm quality:mp-weixin:api
pnpm quality:mp-toutiao:mock
```

微信质量链在契约/设计、构建与产物检查前包含 `test:weixin-babel`，用于检查微信额外转译；普通单测可能漏过绑定/启动问题。抖音质量链核对自己的 AppID、SDK 信息、隐私和构建档运行时。

| 门禁 | 本轮产品规则 |
| --- | --- |
| 主包及每个分包 | 各不超过1.5MiB，这是仓库自身预算 |
| 包间引用 | 检查 JS import/require、JSON 组件、模板 include、样式 import，拒绝主包→分包及跨分包引用 |
| 微信主包余量 | 开启项目且**不是 API 生产档**时至少64KiB |
| 抖音主包余量 | 共用检查器 minimum 为0，仍执行1.5MiB预算 |
| 微信随包媒体 | 硬上限200KiB，超过180KiB警告 |
| 生产 API | 移除开发面板/情景实现，执行生产 origin 与项目检查 |

这些是实现规则，不是平台厂商官方上限的复述。应检查真实候选产物的报告，不能抄用历史包体数字。真正属于主包的共享 uview 表单项，也不能被过宽前缀规则误删。

环境档门禁（`quality:mp-toutiao:local-test`、`:cloud-test`、`:cloud-production`）会调用就绪检查包装脚本，需要所选环境已存在，不会自动创建属于当前会话的后端栈。

## 值得先认识的聚焦测试

| 范围 | `tests/` 示例 |
| --- | --- |
| 主题与首页 | `theme.test.ts`、`designThemes.test.mjs`、`homePage.test.ts`、`homeScopeSwitch.test.ts` |
| 媒体与视频 | `localMediaStore.test.ts`、`sameStyleVideo.test.ts`、`videoGenerationSubmit.test.ts` |
| 成员看板/只读 | `memberProjectDashboard.test.ts`、`enterpriseProjectOverview.test.ts`、`enterpriseProjectDetails.test.ts` |
| 专业户型 | `floorPlan*.test.*` 及固定版本源码 fixture |
| 包体/转译 | `miniProgramPackageBudget.test.mjs`、`weixinBabelArtifact.test.mjs` |

源码 fixture 或模拟渲染不能代替所有者最终视觉/设备验收。原生验证应包含窄屏、未知提交恢复、本地文件失效、待处理读取时切换账户/工作区、owner身份丢失、音频播放与平台支付恢复。

## 集成 runner 与有效证据

`test:integration:auth`、`test:integration:design-config`、`test:smoke:server`、`test:smoke:coverage`、`test:smoke:design-ui` 的前提不同。调用前阅读固定版本真实 UI runbook 与对应 runner。保留其他会话的栈，使用明确选定的后端端口，不能用源码测试声称真实集成通过。

记录提交、命令、平台/构建档、API origin、本地栈归属与结果。排除凭据、私钥、签名 URL、完整编辑器接力片段和邀请码 bearer。分别报告产物、模拟 UI、本地 API、真实供应商证据。

## 源码依据

核验日期 2026-10-28：[当前命令链](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/package.json) · [包体检查器](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/mini-program-package-budget.mjs#L3) · [微信余量条件](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/check-code-quality.mjs#L230) · [抖音门禁](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/check-douyin-quality.mjs) · [路由源码分析](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/api-contract-source.mjs) · [真实 UI runbook](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/documents/MINIPROGRAM_REAL_UI_TESTING.md)。
