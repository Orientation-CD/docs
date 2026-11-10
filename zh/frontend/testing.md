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

户型 fixture 保留各自记录的来源身份。门禁证明前端符合这些 fixture；本轮另外核验了后端 main 的实际路由，但 fixture 通过仍不能证明部署已具备正确 release/配置，见[户型契约范围](/zh/frontend/floor-plans)。不要对恰好占用熟悉端口的任意栈重新生成无关 fixture。

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
| 包间引用 | 检查 JS import/require、JSON 组件、模板 include、样式 import，拒绝普通同步跨包引用，仅放行逐项列明且有正确 placeholder/产物目标的微信异步边界 |
| 微信主包余量 | 开启项目且**不是 API 生产档**时至少64KiB |
| 抖音主包余量 | 共用检查器 minimum 为0，仍执行1.5MiB预算 |
| 微信随包媒体 | 硬上限200KiB，超过180KiB警告 |
| 生产 API | 移除开发面板/情景实现，执行生产 origin 与项目检查 |

这些是实现规则，不是平台厂商官方上限的复述。共享 `inspectMiniProgramPackages` 函数负责包大小和跨包引用判断，两端门禁都消费它的测量报告与失败列表。应检查真实候选产物的报告，不能抄用历史包体数字。

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

## 回归新的准备与加载边界

`test:package-budget` 也运行 `weixinSubpackageSources.test.mjs`。异步企业与作品组件应检查下载失败/重试、`onShow` 后首次挂载、离页和作用域切换。保留同步宿主生命周期；happy-dom 挂载通过不能证明原生分包加载。包体报告会列出主包大文件与目录，便于把预算变化追到真实产物。

视频应覆盖参考视频 15 秒下限、权威费用预览、用户取消、价格变化重新确认，以及回执丢失后的准备正文原样重放。加入模型变化、成员额度拒绝，以及无私有输入权限的受保护详情。当前重点包括 `videoBillingPreview.test.ts`、`videoGenerationSubmit.test.ts`、`recentFeatures.test.ts` 等实际测试；组合门禁以 package.json 为准，不另造命令链。

源码：[package.json](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/package.json) · [scripts/check-code-quality.mjs](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/scripts/check-code-quality.mjs) · [scripts/weixin-subpackage-sources.mjs](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/scripts/weixin-subpackage-sources.mjs)。

## 源码依据

核验日期 2026-11-10：[当前命令链](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/package.json) · [包体检查器](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/scripts/mini-program-package-budget.mjs#L3) · [微信余量条件](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/scripts/check-code-quality.mjs#L200) · [抖音门禁](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/scripts/check-douyin-quality.mjs) · [路由源码分析](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/scripts/api-contract-source.mjs) · [真实 UI runbook](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/documents/MINIPROGRAM_REAL_UI_TESTING.md)。
