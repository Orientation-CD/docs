# 前端上手

使用 Node22 和本仓库的 pnpm9.15.9。第一次用终端请先读 [macOS 环境准备](/zh/get-started/macos-setup)，完整真实服务闭环见[快速开始](/zh/get-started/quickstart)。下文命令都在**前端仓库**执行，不是在 docs 或后端目录。

## 1. 确认分支并安装

```bash
cd wechat_mini_program
git switch ui-integration
git pull --ff-only
corepack enable
pnpm --version
pnpm install --frozen-lockfile
```

预期 pnpm 版本为9.15.9。冻结安装会应用仓库中的 Vitest coverage 补丁。若 Corepack 不可用，用 `npx --yes pnpm@9.15.9` 替代 `pnpm`。不要通过删除 lockfile 或跳过补丁解决安装问题。用 `git rev-parse HEAD` 记录版本：已发布文档固定在[审计提交](/zh/reference/source-revisions)，新拉取分支可能继续前进。

## 2. 构建前端 Mock 包

```bash
pnpm build:mp-weixin:mock
```

预期产物：`dist/build/mp-weixin`。使用公开 AppID `wxec0d577de41255aa` 和已获开发权限的微信账户，将**这个目录**导入微信开发者工具，不要导入 `src/` 或仓库根目录。此显式 Mock 构建强制关闭项目，适合基础图片/UI 路径，不能证明服务端执行链路。

需要持续监听时：

```bash
pnpm dev:mp-weixin:mock
```

预期目录改为 `dist/dev/mp-weixin`，保持终端运行并导入该目录，Control–C 停止监听。监听脚本不像前面的 Mock 构建那样强制项目开关，如果导航不同，先检查环境值。

开发者工具仍显示旧 UI 时，先核对导入目录，重建所需构建档并重新编译。源码与编译产物是两棵不同的目录树。

## 3. 选择要验证的集成边界

| 目标 | 命令或指南 | 验证什么 |
| --- | --- | --- |
| 抖音前端 Mock | `pnpm build:mp-toutiao:mock` | 用抖音工具导入 `dist/build/mp-toutiao` |
| 自己拥有的本地 API 栈 | [快速开始](/zh/get-started/quickstart)的显式构建 | 实际 API/存储/队列/数据库及选定认证/供应商模式 |
| 微信生产 API 产物 | 配好 origin 后运行 `pnpm quality:mp-weixin:api` | 契约/设计、Babel 与生产产物门禁 |
| 团队云环境 | 对应环境的[平台包装脚本](/zh/frontend/platforms) | 就绪、所选环境与产物检查 |
| 专业户型 | 先读[集成边界](/zh/frontend/floor-plans) | 本轮后端尚未提供所需路由 |

固定8080的 `:api-local` helper 只适合该端口确实属于当前会话的情况。不要在它前面加另一个 URL 就认为覆盖了脚本行内值。其他端口使用快速开始中的显式构建，包含匹配的结果/报告 origin，并关闭演示权益覆盖。

模拟器可用 loopback；真机的127.0.0.1不是 Mac。真机测试应参考[平台指南](/zh/frontend/platforms)，使用自己栈的局域网地址及正确后端认证配置。

## 4. 知道谁负责哪种配置

| 文件或产物 | 负责什么 |
| --- | --- |
| `package.json`、`pnpm-lock.yaml`、`patches/` | 工具链、命令、依赖补丁 |
| `.env.example`、`src/env.d.ts` | 公开构建值与声明 |
| `src/manifest.json`、`src/pages.json` | 平台信息、权限、页面、分包和 Tab |
| `vite.config.ts`、`config/build-targets.mjs` | 构建别名、预处理与抖音档位 |
| `project.config.json`、`project.private.config.json` | 微信工具公共/本地配置 |
| `dist/build/*`、`dist/dev/*` | 导入/上传的编译产物 |

配置在构建时进入客户端；保留本地 `.env`，不要放服务端秘密。docs 仓库单独使用 pnpm10.28.2，不要在别的仓库目录安装依赖。

提交审阅前运行相应[测试和产物门禁](/zh/frontend/testing)。构建通过是有用证据，但真实认证、支付与供应商验收仍需要对应环境。

## 源码依据

核验日期 2026-10-28：[固定工具链、命令和补丁](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/package.json) · [页面注册](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/src/pages.json) · [抖音构建档](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/config/build-targets.mjs) · [真机地址检查](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/scripts/require-device-api-url.mjs) · [微信产物门禁](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/scripts/check-code-quality.mjs)。
