# 已核验源码版本

本文档描述的是经过审核的应用源码版本。页面的 Git 更新时间表示正文何时修改，**不能证明**上游代码在核验后没有变化。

<!--@include: ../../.vitepress/generated/revisions.zh.md-->

## 各类事实以什么为准

| 关注点 | 优先检查的来源 |
| --- | --- |
| 公开接口与请求模型 | 后端 `app/api/__init__.py`、各领域路由及 `app/core/models.py`，并与 `documents/REST_API_INTERFACE.md` 交叉核验 |
| 工作流执行与模型绑定 | 后端 `app/workflows/`、`app/providers/`、持久化模型及相关测试 |
| 环境默认值 | 后端 `app/core/config.py`；必须区分代码默认值与 `.env.example` 示例值 |
| 小程序行为与限制 | 前端功能服务、仓储、DTO、`package.json`、`config/build-targets.mjs` 与测试 |
| 数据库与发布 | 后端迁移文件、部署架构及 SAE 手册 |
| 文档站点行为 | 本仓库的 VitePress 配置、校验脚本与浏览器测试 |

实现与公开契约需要一起阅读。前端限制可能比后端接受的请求范围更窄；API 接受某种请求形状，也不代表所有供应商都已具备对应的端到端处理能力。代码中存在的功能还可能受到配置、价格或套餐权益控制。

## 记录了哪些信息

文档仓库提交了 `sources/revisions.json`（仓库、分支、完整提交及权威文件 SHA-256）、`sources/contracts.json`（路由声明、配置事实、前端脚本与源码路径），以及 `sources/page-migration.json`（每个原有页面的处理方式）。这些文件可以在仓库中审阅，不生成公开内容页面。

[REST API](/zh/reference/rest-api) 与[配置参考](/zh/reference/configuration)中的生成表格来自上述快照。各内容页链接到已核验提交中的相关源码。两种语言使用相同源码版本。

## 校验能保证什么

普通 CI 无需访问私有应用仓库，会检查文档与**已提交审核快照**是否一致，并验证双语路由、资源、搜索及渲染行为。它不能独立证明上游没有变化，也不能证明手工修改的快照来源真实。

更新文档时，有源码权限的维护者应执行来源比较。工具只读取 Git 对象、解析 Python 语法，不会导入应用、读取 `.env`、启动服务或调用供应商。更新命令与审核流程见[维护本文档](/zh/reference/maintenance)。

## 跨仓库及源文档差异

[对齐表](/zh/reference/integration-status)记录前端已存在、此 main 尚无专用后端的户型能力，也区分了没有小程序编辑入口的额度 API，以及设置入口隐藏的主题基础设施。快照覆盖范围不意味着每个界面都已端到端可用。

当前后端详情处理函数及 Get Workflow Status 契约允许 owner 只读，但 result-file 一段仍残留早期“仅创建者详情”描述。本文档依据共享加载器与当前详情契约，明确分开读写权限。同样，后台表单可以保存空同款模板，运行时脚本验证却拒绝空文本；保存不代表准入成功。见固定版本[实现](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/api.py)和[视频规则](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/video_template_rules.py)。

`sources/audit-2026-10-28.json` 记录相对上一 docs 基线的每个双语页面处理方式。源码链接按函数身份或已证明文本上下文迁移，不能确定的映射经过人工复核。见[维护说明](/zh/reference/maintenance)。
