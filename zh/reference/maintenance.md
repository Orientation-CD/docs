# 维护本文档

两种语言应对照相同的应用提交更新。编辑前先阅读[已核验源码版本](/zh/reference/source-revisions)，确认上次审核的范围。

## 使用文档更新 skill

仓库在 `.agents/skills/update-yuanzhu-docs/` 中维护 `update-yuanzhu-docs` skill，根目录的 `AGENTS.md` 提供简短入口。这些文件纳入版本管理供团队共享，不发布到文档站。在本仓库内启动 Codex 对话时，“更新 docs”“同步文档”等请求可以隐式匹配该 skill；也可用 `$update-yuanzhu-docs` 显式选择。

如果希望从三个仓库的父目录启动对话时也能使用它，请**在 docs 仓库根目录**执行一次以下命令。它只为仓库中唯一维护的版本建立本机用户级链接：

```bash
yuanzhu_skill_source="$(pwd -P)/.agents/skills/update-yuanzhu-docs"
yuanzhu_skill_entry="$HOME/.agents/skills/update-yuanzhu-docs"
if [ ! -f "$yuanzhu_skill_source/SKILL.md" ]; then
  printf '%s\n' '请先取得 skill，再从 docs 仓库根目录执行。'
elif [ -e "$yuanzhu_skill_entry" ] || [ -L "$yuanzhu_skill_entry" ]; then
  printf '%s\n' '入口已存在。请先用下列命令检查，再决定是否替换：'
  ls -ld "$yuanzhu_skill_entry"
else
  mkdir -p "$HOME/.agents/skills"
  ln -s "$yuanzhu_skill_source" "$yuanzhu_skill_entry"
fi
```

命令会保留已有文件、目录和链接。请保留链接指向的仓库位置；移动仓库后，应检查并更新链接。若 Codex 未显示新 skill，可重启后再试。请求须与圆筑 AI 项目有关，此 skill 不替代其他项目的文档流程。同步源码需要能访问 docs、前端和后端三个仓库。

默认审核最新前端 `ui-integration` 与后端 `main`，记录完整提交 SHA，并同步两种语言的源码导读、完整调用链和图表。Skill 复用下文的维护及校验命令，交付审阅后的改动、验证结果、预览和 PR。合并与发布按用户明确指令进行。

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

## 维护接口的学习链路

公开路由变化时，更新 `sources/traces/*.json` 对应项及两种语言的显式 `{#anchor}`。每项记录真实 UI/外部触发、FastAPI 处理函数、相关前后端符号。正文须解释具体业务/事务/队列/存储路径、返回状态和失败恢复，不能只给 REST 契约链接。编号图中的消息与代码导航表保持对应。

`pnpm docs:sources` 通过 AST 解析路由处理函数和 Python 定义，静态定位前端绑定，不执行应用代码，并将符号位置/文件 hash 保存进 `sources/contracts.json`，生成逐 API 全链路入口。`docs:check` 会拒绝缺少双语解释、丢锚点、未核验符号或没映射真实处理函数的公开路由。它证明与固定审计版本一致，不能自动证明业务语义；审核者仍应沿真实链路阅读。

## 提交审阅前校验

```bash
pnpm docs:check
pnpm exec playwright install chromium
pnpm docs:test:browser
```

第一条命令依次执行分词器/格式/覆盖回归测试、内容/来源及全链路检查、正式构建，以及产物链接、锚点、资源、语言边界和搜索索引检查。浏览器测试会在 `127.0.0.1:4173` 启动文档预览；这是文档端口，与后端测试会话无关。测试前关闭自己拥有的预览进程，不要停止他人的进程来释放端口。

浏览器测试覆盖中英搜索、键盘操作、深链接刷新、移动端导航和主题切换，并用已安装的浏览器渲染器解析所有实际 Mermaid 图，检查接口索引到章节的跳转。失败截图与 trace 是本地忽略文件，CI 失败时会上传。外部链接不作为每次 PR 的在线可用性门禁，避免短暂网络故障阻塞文档构建。

## 搜索行为

搜索覆盖当前语言的索引内容。构建端与浏览器共用确定性的中文单字、相邻双字及英文标识符分词，无需外部搜索账号，也能查找 `PROJECT_OUTCOMES_ENABLED`、`/v1/workflows` 等技术关键词。它是关键词搜索：标点会分隔词项，`*` 不代表任意通配符语法。

固定版本的 Mermaid 插件带有一个生命周期补丁：详细搜索会临时挂载页面组件来提取摘要，图表异步初始化必须在卸载后停止。升级插件时需保留或重新验证补丁及浏览器回归测试。

分词函数必须自包含。VitePress 使用 `toString()` 序列化函数，在浏览器中恢复；捕获的外部导入、闭包或依赖运行环境的分词可能导致构建与查询不一致。迁移页使用 `search: false`，避免过时指导干扰当前结果。

## 在不同屏幕上阅读图表

文档页使用窗口可用宽度。普通段落保持适合阅读的行长，图表、表格和代码可以使用更宽的内容区域。较窄的桌面窗口会将章节目录移入顶部的**本页目录**菜单。

图表在桌面端默认适应内容宽度，在手机和平板上默认保留原始大小。使用**适应宽度**查看全貌，使用**原始大小**恢复原始字号，或用缩放按钮查看细节。**全屏查看**打开更大的阅读窗口，提供相同的缩放操作；较长的图表可上下滚动。按 Escape 或**关闭**返回正文。聚焦图表后也可以使用方向键横向滚动。

修改主题时，应保留自适应布局与图表浏览器测试，并检查窄屏手机、笔记本和宽屏桌面。加宽正文不能导致整个页面横向溢出，也不能默认缩小移动端图表文字。

## 发布

PR 运行校验与浏览器测试。推送到 `main`，或在 `main` 手工触发，可将通过检查的产物发布到 GitHub Pages。部署只允许 `main`，审阅和合并沿用团队流程。CI 获取完整 Git 历史，使页面时间来自各自提交。

页面更新时间表示正文变更时间，来源记录表示应用核验时间；报告文档新鲜度时应区分两者。

## 把重构作为一致版本重新审核

提取新快照**之前**保存旧版本记录：

```bash
git show HEAD:sources/revisions.json > /tmp/yuanzhu-docs-previous-revisions.json
```

把指定前后端分支作为明确版本对审核，结合实现、公开契约与测试；同名符号或前端夹具都不能证明当前行为。改动大的章节围绕最终架构重写，保留 API 索引引用的历史章节锚点。同一次修改同步两种语言、能力矩阵和页面审计清单。

更新快照后，有证据地迁移源码链接，不盲目替换 SHA：

```bash
pnpm docs:links --from /tmp/yuanzhu-docs-previous-revisions.json --report /tmp/yuanzhu-docs-links.json
pnpm docs:links --from /tmp/yuanzhu-docs-previous-revisions.json --report /tmp/yuanzhu-docs-links.json --write
```

第一条只读，第二条只更新已证明的 revision／path／line 映射及可见的路径:行号标签。不能确定的锚点保持不变、写入报告并返回非零；人工核对新旧代码后选择正确符号。等全部正文写入停止后再运行，工具会拒绝并发覆盖。

普通 CI 检查已提交源码行范围及 trace 关联符号锚点。`apiScope: frontend-candidate` 仅允许用于户型双语指南，并只能引用固定前端夹具提取出的 method／path；主 API 清单仍只列后端真实路由。不能用候选 schema 悄悄扩充“主线已经实现”的范围。

旧安装配置说明退出学习主线；真正仍暴露的适配入口集中在[兼容参考](/zh/reference/compatibility)，已移除页面仅留短迁移链接并排除搜索。这样清理旧指导，同时不隐瞒当前 UI 仍使用的代码。
