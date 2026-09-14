# Studio Control — 管理控制台总览

**Studio Control**（管理控制台）是 YuanZhu AI 平台的内部运营控制台。管理员和运营人员通过这个 Web 界面来日常运转产品：管理用户、给服务定价、查看收入与性能监控、排查设计任务、配置模型提供商，以及发布法律文档和报告内容。

在产品内部，它被称为 **Studio Control**（侧边栏中的品牌标识为 `SC`，副标题为 *Design operations*）。它挂载在与公共 API 相同的 FastAPI 服务上，URL 前缀为 `/admin`。

> 本文档集面向两类读者：
> - **管理员 / 运营人员** —— 除 [tech-stack](/admin/tech-stack) 外的所有使用页面。讲解每个界面展示什么、每个按钮和字段做什么。
> - **开发者** —— [tech-stack](/admin/tech-stack)，描述代码架构、文件和扩展点。

## 谁在使用它

Studio Control 仅限 `User.user_type` 为 `ADMIN` 且账号处于活跃状态的账户访问。它**不是**面向客户或合作伙伴的控制台。没有自助注册入口：管理员账号直接在数据库中创建（参见 [getting-started](/admin/getting-started)）。

典型使用者包括：
- **平台运营人员**——查看总览和性能监控仪表盘，处理失败或卡住的任务，对账滞留的支付。
- **财务 / 增长人员**——设置订阅价格、积分套餐、营销活动发放额度，并记录每月的云服务/模型成本。
- **生产工程师**——接入模型提供商，将模型审批到任务目录，编辑提示词模板，调整报告版式。

## 访问 URL 规则

控制台由应用本身提供服务，统一在一个前缀下：

| 界面 | 路径 |
| --- | --- |
| 登录页 | `GET /admin/login` |
| 登录后的仪表盘 | `GET /admin` |
| 各分区 | `GET /admin/<section>`（例如 `/admin/users`、`/admin/billing`） |

在本地开发环境中，通常是 `http://localhost:8000/admin`。在生产环境中，它与应用的公共域名共用。所有 admin 路由都声明为 `include_in_schema=False`，因此不会出现在公共 OpenAPI 文档中。

## 高层功能地图

左侧侧边栏有 **14 个分区**。点击任意分区名称即可跳转到对应页面。

| 分区（侧边栏标签） | 路由 | 功能 |
| --- | --- | --- |
| 总览（Overview） | `/admin` | 面向决策的 KPI、图表、行动中心告警、需要关注的任务。参见 [dashboard](/admin/dashboard)。 |
| 用户（Users） | `/admin/users` | 搜索账户、调整积分、设置工作区配额、停用/归档。参见 [users](/admin/users)。 |
| 工作区（Workspaces） | `/admin/workspaces` | 企业工作区：创建、成员上限、积分池、报告配置。参见 [workspaces](/admin/workspaces)。 |
| 计费与积分（Billing & Tokens） | `/admin/billing` | 任务类型价格、订阅套餐、积分套餐、支付历史、对账。参见 [billing](/admin/billing)。 |
| 营销活动（Campaigns） | `/admin/campaigns` | 注册和邀请的积分发放额度。参见 [campaigns](/admin/campaigns)。 |
| 营销数据（Marketing data） | `/admin/marketing` | 只读的获客、激活、支付、留存证据。参见 [marketing](/admin/marketing)。 |
| 财务（Finance） | `/admin/finance` | 收入/成本/利润报表和月度成本录入。参见 [finance](/admin/finance)。 |
| 性能监控（Performance） | `/admin/performance` | HTTP 与任务吞吐、延迟、队列、实时快照。参见 [performance](/admin/performance)。 |
| 任务（Jobs） | `/admin/design-jobs` | 列出、筛选、查看和清理设计任务。参见 [design-jobs](/admin/design-jobs)。 |
| 资产（Assets） | `/admin/assets` | 搜索/上传图片及其他存储对象、生成 URL。参见 [assets](/admin/assets)。 |
| 法律文档（Legal Documents） | `/admin/legal-documents` | 发布条款/隐私政策版本并跟踪接受情况。参见 [legal-documents](/admin/legal-documents)。 |
| 提示词（Prompts） | `/admin/prompts` | 带可配置字段的提示词模板，支持导入/导出。参见 [prompts](/admin/prompts)。 |
| 报告模板（Report Templates） | `/admin/report-templates` | 原生 HTML/Jinja 报告版式编辑器，带预览。参见 [report-templates](/admin/report-templates)。 |
| 模型提供商（Model Providers） | `/admin/provider` | 提供商连接、模型配置和目录分配。参见 [providers](/admin/providers)。 |

## 与 API 服务的关系

Studio Control **不是**一个独立应用。它是一个挂载在同一个 FastAPI 应用上的 `APIRouter`（`prefix="/admin"`），该应用同时服务于移动端/前端 API。这意味着：

- 它复用同一套数据库引擎（通过 `get_db` 获取 `AsyncSession`）、同一个 Redis 连接、同一个对象存储和同一个后台任务队列。
- 它读写的是与移动端应用**相同的生产表**（用户、支付、设计任务、提供商配置）。在 Studio Control 中所做的更改立即对客户生效——不存在单独的"管理后台数据库"。
- 它使用**服务端渲染 HTML**（Jinja2 模板），而不是由独立 SPA 消费的 JSON API。大多数变更操作就是普通的 HTML 表单 POST；一小层渐进增强 JavaScript（`admin.js`）会原地替换更新后的片段，使页面无需完全刷新。
- 它有**自己的**认证（admin 会话）、CSRF 防护、缓存和双语 i18n，与面向客户的认证和公共文档网站相互独立。

## 设计原则

- **服务端权威。** 价格、积分消耗、提供商路由和报告版式全部存储在数据库中并由服务端强制执行。管理界面从不信任客户端计算。
- **变更可审计。** 积分调整、成本录入和提供商变更都会记录执行操作的管理员，并在需要并发控制的地方进行版本化/乐观锁保护。
- **软归档，而非硬删除。** 支付订单、套餐、任务类型、提供商连接和法律版本都被归档（软删除），以保证计费和财务历史完整。只有真正未被使用的对象才会被物理删除。
- **关键处只读。** 营销仪表盘和多个报表被刻意设计为只读的证据视图；它们不改变业务状态。
- **默认双语。** 每个管理界面根据 `admin_language` cookie 通过管理后台自己的 i18n 层渲染简体中文或英文。

准备好登录了吗？继续阅读 [getting-started](/admin/getting-started)。
