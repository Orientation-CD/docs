# CI/CD 与文档验证

后端、小程序和文档有不同的检查及发布边界。docs 构建成功只证明此站点的对应检查通过，不代表已部署后端或完成支付/供应商验收。

## 文档检查

在文档仓库中运行：

```bash
pnpm install --frozen-lockfile
pnpm docs:check
pnpm docs:test:browser
pnpm docs:sources --frontend /path/to/wechat_mini_program --backend /path/to/YuanZhu-AI --check
```

`docs:check` 构建生产站点并检查适用静态契约，包括链接、锚点、本地资源和语言结构。浏览器检查在构建产物上验证搜索、语言导航、深链接与运行渲染。源码检查读取固定 Git 提交，对比由源码提取的清单，不启动服务、连接数据库或调用模型。

更新文档基线时，显式更新源码元数据与生成清单；不同 HEAD 或未提交代码不能悄悄冒充记录版本。见[维护指南](/zh/reference/maintenance)与[源码版本](/zh/reference/source-revisions)。

## Pages 发布

VitePress 输出 `.vitepress/dist`，GitHub Pages 在 `/docs/` 提供服务。PR 检查先验证修改，授权合入 `main` 后通过 Pages 发布构建产物。部署需要 Pages/token 权限；验证任务保持只读，不把 PR 内容直接部署生产站点。

文档根相对链接明确语言：英文 `/frontend/overview`，中文 `/zh/frontend/overview`；VitePress 渲染时添加 `/docs/`。主题资源路径不带 base，例如 `/favicon.svg`。当前 Pages 支持 clean URL 的直接深链接，既要检查站内跳转，也要检查刷新直达。

## 后端工作流

当前快照有 `daily-endurance.yml` 与 `sdd-docs.yml`。daily endurance 是带版本筛选的定时/repository-dispatch 运行门禁，不是每个文档 PR 都执行的测试。SDD 工作流验证过程文档/工具并保存证据。SAE 镜像发布和受保护晋级在 `deploy/sae/`，不能从合入后端推断已自动上线。

后端规范明确：仅文档修改不触发单测、全量回归、smoke/E2E，只验证渲染、命令、链接、图表和引用。生产代码修改执行 focused coverage/风险审阅、保留审阅者、全量回归及部署基线升级流程；混合修改按生产代码要求执行。

## 前端检查与发布

使用选定 `ui-integration` 快照的 package scripts 做类型、设计系统和平台构建检查。模式脚本会选择 API/mock 与目标平台。微信构建成功不证明抖音真实支付、真机网络或视频供应商兼容；客户端 API 环境与公开域名配置必须对齐目标发布边界。

## 贡献约定

- 重组时保留已公开路由，或提供明确重定向。
- 同时更新双语内容与导航；标识符和 API 路径保持精确。
- 行为引用固定代码/契约，区分代码默认、示例与实际云端状态。
- 不提交秘密材料、私有测试证据、依赖目录或分发产物。
- 文档修正运行最小相关检查，不为检查文字启动产品栈。

## 新校验边界

前端 `pnpm test` 现包含 `test:package-budget`，微信质量门禁包含构建产物／Babel 检查。包体预算是项目规则，不是引用平台官方上限。户型候选夹具门禁只证明记录的源码契约，不证明与后端 main 兼容。

授权的后端部署基线升级使用 `run_deployed_upgrade_gate.sh`，在同一所有权已核验的一次性数据库上完成迁移及选定 MinIO／OSS 门禁。该栈产品配置已准备后，受影响 smoke／E2E runner 使用 `--preconfigured`，避免被旧云端快照覆盖。这与文档校验不同，见[测试／存储策略](/zh/testing/storage-environments)及[源码 runbook](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/runbook.md)。

视频镜像重建会读取私有上游默认分支，即使后端 commit 不变，也应记录实际供应商提交和镜像 digest，不能声称仅凭后端 SHA 就能复现每次供应商构建。

## 源码依据

已按[本文档记录的源码版本](/zh/reference/source-revisions)核对；实际运行配置与云端启用状态需要单独确认。

- [后端文档工作流](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/.github/workflows/sdd-docs.yml)
- [定时运行工作流](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/.github/workflows/daily-endurance.yml)
- [规范测试策略](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/tests/documents/TEST_STRATEGY.md)
- [前端脚本](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/package.json)
