# 测试与质量门禁

源码测试验证业务，契约检查验证后端兼容，产物检查验证真正的平台包。在前端仓库使用 Node22、pnpm9.15.9 运行。这些是仓库提供的门禁，不代表所有命令都已接入某条 CI。

## 本地检查

```bash
pnpm type-check
pnpm type-check:test
pnpm test:domain
pnpm test:unit
pnpm check:api-contract
pnpm check:design-system
```

`pnpm test` 依次执行领域、单元测试。领域测试使用 Node `--experimental-strip-types`。Vitest 采用 happy-dom、Vue Test Utils、`uni` harness，别名明确选择测试实现。`pnpm test:coverage` 使用 `vitest.config.ts` 中阈值，包括更严格的逐文件要求；直接读取该配置，不维护第二份固定测试数量/阈值表。

## 契约检查

门禁检查 OpenAPI/fixture 证据、DTO、候选兼容、项目状态/动态契约及路由/产物约束。最新命令在旧兼容 fixture 之外，包含 issue611、619 项目契约。

```bash
pnpm check:openapi
pnpm check:openapi:live
```

live 检查需要目标后端。`pnpm openapi:update` 会有意修改快照，仅在经评审的接口更新时使用并检查差异。部分项目证据从固定后端 AST/schema 提取，不取代总快照，不能随意对某个运行实例重生成全部 fixture。

## 平台产物

```bash
pnpm quality:mp-weixin:mock
pnpm quality:mp-weixin:api
pnpm quality:mp-toutiao:mock
```

微信门禁先跑 `test:weixin-babel`，再执行契约/设计检查、构建、产物扫描；正式 API 同时检查项目启用包。Babel 检查针对微信二次转换后才出现的模块绑定错误。

微信产物检查覆盖组件懒加载、压缩与域名设置、主包/各分包不超过1.5MiB、单个随包媒体不超过200KiB（180KiB预警）、多余文件、项目隔离/导航、模块导入/供应商启动，以及发布剔除开发代码。不要将历史测量包体积复制为当前验证结果。

抖音门禁检查 AppID、行业 SDK、隐私设置、项目导航/隔离、模块导入、构建档运行配置。环境门禁有 `quality:mp-toutiao:local-test`、`:cloud-test`、`:cloud-production`，会调用检查真实健康状态的脚本，需要相应环境可用。

## 集成与真实 UI

| 命令 | 用途 |
| --- | --- |
| `test:integration:auth` | 后端认证集成 |
| `test:integration:design-config` | 设计配置导入集成 |
| `test:smoke:server` | 真实服务冒烟流程 |
| `test:smoke:coverage` | live API harness 覆盖 |
| `test:smoke:design-ui` | 真实开发者工具设计纵切 |

运行前读取各 runner 环境要求。真实工具会话需要项目授权和首次设置，不能占用其它会话的服务栈。自动化配置与选择器见下方固定提交的真实 UI 手册。

本仓库验收应涵盖读取中切账号/空间、提交不确定恢复、订阅/余额拒绝、项目阶段/结果、成员只读、媒体过期、安全 Markdown、脚本导入，以及各平台支付恢复。先跑受影响的聚焦测试，再做昂贵环境验证。

## 记录有效证据

报告提交 SHA、命令、平台/构建档、API Origin、自己拥有的本地项目/端口及结果。区分编译产物通过、模拟 UI 通过、真实本地 API 通过、真机/正式供应商验收。凭据、私钥、签名 URL、邀请凭据不能进入证据。

## 源码依据

前端 `eca0a5f`、后端 `b13cc56`（2026-10-20）：[命令](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/package.json) · [Vitest配置](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/vitest.config.ts) · [微信产物检查](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/scripts/check-code-quality.mjs) · [抖音检查](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/scripts/check-douyin-quality.mjs) · [真实UI手册](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/documents/MINIPROGRAM_REAL_UI_TESTING.md)。
