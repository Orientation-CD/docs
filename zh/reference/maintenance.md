# 维护本文档

两种语言应对照相同的应用提交更新。编辑前先阅读[已核验源码版本](/zh/reference/source-revisions)，确认上次审核的范围。

## 运行站点

使用 Node.js 22.6 或更新版本，以及本仓库固定的 **pnpm 10.28.2**。小程序使用自己的 pnpm 版本，执行前先确认当前仓库目录。

```bash
cd docs
corepack enable
pnpm install --frozen-lockfile
pnpm docs:dev
```

打开 VitePress 打印的地址。预览正式构建产物：

```bash
pnpm docs:build
pnpm docs:preview
```

产物位于 `.vitepress/dist`，站点基路径为 `/docs/`。基路径与页面深链接都必须可用；主题资源路径和正文内链不要手工再添加 `/docs/` 前缀。

## 更新来源快照

取得应用仓库权限后，先获取指定分支。此操作更新本地远端引用，不切换工作目录：

```bash
git -C ../wechat_mini_program fetch origin ui-integration
git -C ../YuanZhu-AI fetch origin main
```

检查新提交并与上次核验结果比较。真正完成审核后，才更新 `sources/revisions.json` 的 `verifiedAt`。指定版本提取源码事实：

```bash
pnpm docs:sources --frontend ../wechat_mini_program --backend ../YuanZhu-AI --frontend-ref origin/ui-integration --backend-ref origin/main
```

维护命令需要 Python 3.12+、Git 和 Node；若 `python3` 仍是旧版本，可在命令前添加 `DOCS_PYTHON=python3.12`。工具只读取已提交源码，不使用应用工作区中尚未提交的改动。应用仓库放在其他目录时显式传入路径。普通文档 CI 不需要应用运行依赖或私有仓库凭据。

审阅生成的完整提交 SHA、权威文件哈希、路由声明、Settings 实际默认值、环境示例值及脚本变化，再更新两种语言的正文与固定版本源码链接。权限、运行时状态码和业务语义仍需人工对照路由实现与 REST 契约；语法提取不能证明这些保证。

使用 Python 3.12+ 执行 `pnpm docs:test:sources` 可校验语法提取器。测试会验证应用顶层代码不会被执行，以及敏感值会被隐藏。

检查已核验提交能否重现当前快照：

```bash
pnpm docs:sources --frontend ../wechat_mini_program --backend ../YuanZhu-AI --check
```

默认使用版本记录中的提交。要比较更新的上游版本，需由维护者明确指定引用；系统不会在后台自动同步。

## 新增或重组页面

1. 新增英文 Markdown，并在 `zh/` 下建立相同相对路径。完整翻译说明，保留接口名和代码标识符。
2. 在 `.vitepress/navigation.mjs` 中只登记一次主题，提供中英文名称，由它生成各语言导航与侧栏。
3. 英文内链使用 `/backend/workflows`，中文使用 `/zh/backend/workflows`；也可使用相对路径。章节锚点必须匹配对应语言的实际标题。
4. 添加使用已核验完整提交 SHA 的 GitHub 源码链接；源码路径会与快照核对。
5. 替换旧页面时，在原路径保留简短迁移页并设置 `search: false`。在 `sources/page-migration.json` 中记录处理方式，新页面使用 `action: add`。

内容目录包括 `get-started/`、`frontend/`、`backend/`、`admin/`、`deploy/`、`testing/`、`reference/` 及 `zh/` 镜像。生成的 include 片段放在 `.vitepress/generated/`，应修改提取器而非手工编辑片段。

## 提交审阅前校验

```bash
pnpm docs:check
pnpm exec playwright install chromium
pnpm docs:test:browser
```

第一条命令依次执行分词器测试、内容与来源引用检查、正式构建，以及产物链接、锚点、资源、语言边界和搜索索引检查。浏览器测试会在 `127.0.0.1:4173` 启动文档预览；这是文档端口，与后端测试会话无关。测试前关闭自己拥有的预览进程，不要停止他人的进程来释放端口。

浏览器测试覆盖中英搜索、键盘操作、深链接刷新、移动端导航和主题切换。失败截图与 trace 是本地忽略文件，CI 失败时会上传。外部链接不作为每次 PR 的在线可用性门禁，避免短暂网络故障阻塞文档构建。

## 搜索行为

搜索覆盖当前语言的索引内容。构建端与浏览器共用确定性的中文单字、相邻双字及英文标识符分词，无需外部搜索账号，也能查找 `PROJECT_OUTCOMES_ENABLED`、`/v1/workflows` 等技术关键词。它是关键词搜索：标点会分隔词项，`*` 不代表任意通配符语法。

固定版本的 Mermaid 插件带有一个生命周期补丁：详细搜索会临时挂载页面组件来提取摘要，图表异步初始化必须在卸载后停止。升级插件时需保留或重新验证补丁及浏览器回归测试。

分词函数必须自包含。VitePress 使用 `toString()` 序列化函数，在浏览器中恢复；捕获的外部导入、闭包或依赖运行环境的分词可能导致构建与查询不一致。迁移页使用 `search: false`，避免过时指导干扰当前结果。

## 发布

PR 运行校验与浏览器测试。推送到 `main`，或在 `main` 手工触发，可将通过检查的产物发布到 GitHub Pages。部署只允许 `main`，审阅和合并沿用团队流程。CI 获取完整 Git 历史，使页面时间来自各自提交。

页面更新时间表示正文变更时间，来源记录表示应用核验时间；报告文档新鲜度时应区分两者。
