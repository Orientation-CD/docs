# 技术栈与架构（面向开发者）

本页描述 Studio Control 底层的构建方式。面向需要扩展、调试或熟悉管理后台代码库的工程师。关于如何*使用*各界面，请阅读本节其他页面。

## 代码在哪里

整个管理系统实现为一个大型路由模块，外加少量职责单一的辅助模块：

| 路径 | 职责 |
| --- | --- |
| `app/admin.py` | 完整的管理系统：`APIRouter`、所有路由处理器、认证粘合层、模板渲染和 HTML/JSON 响应（约 4,938 行）。 |
| `app/admin_sessions.py` | 基于 Redis 的"每个管理员仅一个活跃会话"逻辑（84 行）。 |
| `app/admin_cache.py` | 进程内只读报表的 LRU 缓存（55 行）。 |
| `app/templates/admin/` | 所有 Jinja2 模板（布局、页面、局部片段）。 |
| `app/static/admin.css` | 管理后台样式表。 |
| `app/static/admin.js` | 渐进增强行为（异步变更、实时搜索、仪表盘、上传）。 |
| `app/static/admin-language.js` | 读取/设置 `admin_language` cookie，用于管理后台 i18n。 |

报表/业务逻辑被刻意从 `admin.py` 中剥离到领域模块，由路由调用：

- `app/overview.py` —— `build_overview_report`
- `app/marketing.py` —— `build_marketing_report`、`parse_marketing_range`
- `app/finance.py` —— `build_finance_report`、`upsert_monthly_cost`、`FinanceTrend`
- `app/performance.py` —— `build_http_performance_report`、`build_job_performance_report`、`build_live_performance_report`、`build_active_job_snapshot`、`build_runtime_bottleneck_report`
- `app/provider_configuration.py` —— 提供商连接/模型/目录的保存、归档、校验、能力声明
- `app/campaign_configuration.py` —— `save_campaign_token_amount`、`MAX_CAMPAIGN_TOKEN_AMOUNT`
- `app/prompt_templates.py` —— 提示词校验、归档解析/序列化
- `app/report_templates.py`、`app/report_view.py` —— 报告模板生命周期和预览
- `app/billing.py` —— `adjust_user_tokens`、`adjust_enterprise_tokens`、`remove_user_account`、`dissolve_enterprise`
- `app/design_job.py` —— `delete_terminal_design_job`、`admin_mark_design_job_failed`
- `app/asset_management.py`、`app/assets.py`、`app/asset_completion.py` —— 资产列表、上传意图、完成
- `app/legal_documents.py` —— 常量和日期辅助函数
- `app/payment_reconciliation.py` —— `count_expired_pending_payments`、`payment_text_filter`

## 路由与模板设置

在 `app/admin.py` 顶部：

```python
router = APIRouter(prefix="/admin", tags=["admin"], include_in_schema=False)
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))
ADMIN_PAGE_SIZE = 50
```

- `include_in_schema=False` 将所有 admin 路由从公共 OpenAPI 文档中隐藏。
- `Jinja2Templates` 指向共享的 `app/templates/` 目录；管理后台模板位于 `templates/admin/` 下。
- 每个列表页的分页大小为 `ADMIN_PAGE_SIZE = 50`。

该路由由 `app/main.py` 挂载（你在下文读到的路由名都挂在 `/admin` 下）。

## 认证与会话模型

### 签名浏览器会话 + Redis 会话注册表

两层协作：

1. **签名 cookie 会话**（Starlette 的 `request.session`，基于 cookie）在登录时存储三个值：
   - `admin_user_id` —— 管理员的 `User.id`
   - `admin_session_id` —— 新生成的 `secrets.token_urlsafe(32)` 会话令牌
   - `csrf_token` —— 另一个独立的 `secrets.token_urlsafe(32)` 值，用于 CSRF

2. **Redis"活跃会话"注册表**，位于 `app/admin_sessions.py`。每个管理员账号同一时间只允许一个浏览器会话有效：
   - `activate_admin_session(redis, admin_user_id, session_id)` 将会话 ID 存储在键 `admin-session:v1:active:<admin_user_id>` 下，TTL 为 `ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60`（8 小时）。从第二个浏览器登录会覆盖第一个会话，将其踢出。
   - `admin_session_is_active(...)` 使用 `secrets.compare_digest` 将 cookie 中的会话 ID 与存储的值进行比较。
   - `revoke_admin_session(...)` 使用 Lua 比较并删除脚本，确保登出只撤销仍然拥有该账号的那个会话。
   - 失败时抛出 `AdminSessionUnavailable`，路由层将其转为 `503 ADMIN_SESSION_UNAVAILABLE`（故障关闭）。

### 依赖注入

- `current_admin(request, db) -> User | None` —— 核心依赖。读取 cookie，校验 Redis 活跃会话，加载 `User`，并要求 `user.user_type == UserType.ADMIN` **且** `user.is_active`。它会显式提交读事务，以便在渲染页面时不再持有会话检查的数据库连接。
- `require_admin(request, db) -> User` —— 封装 `current_admin`，在缺失时抛出 `401 ADMIN_LOGIN_REQUIRED`。所有 POST（变更操作）和 JSON 数据端点使用此依赖。
- 只读页面直接调用 `current_admin`，当其返回 `None` 时重定向到 `/admin/login`；已认证的变更端点则抛出 `401`。

### 登录流程（`admin_login_page`、`admin_login`）

`POST /admin/login` 接收 `phone` + `password`。它会：
- 通过 `app.auth.normalize_phone` 规范化手机号。
- 在 Redis 中执行两个限流（按客户端主机名的 `admin-login-ip` 命名空间、按手机号的 `admin-login-account` 命名空间），限流参数由 `settings.auth_rate_limit_attempts` / `auth_rate_limit_window_seconds` 控制。
- 查询用户后，在 CPU 密集型的 `verify_password_async(password, user.password_hash)` 之前释放数据库连接。
- 仅当用户存在、`user_type == ADMIN`、`is_active` 且密码校验通过时才接受登录。
- 成功后记录 `last_login_at`，生成新的会话 ID，调用 `activate_admin_session`，并写入三个会话值。

## CSRF 防护

`ensure_csrf(request, submitted_token)` 使用 `secrets.compare_digest` 将表单的 `csrf_token` 字段与 `request.session["csrf_token"]` 比较，不匹配时返回 `403 CSRF_TOKEN_INVALID`。每个变更状态的 POST 都包含一个由 `page_context(...)` 渲染的隐藏字段 `<input type="hidden" name="csrf_token" value="{{ csrf_token }}">`。登出表单和所有管理表单都遵循此模式。

`page_context(request, admin, active_page=..., **values)` 是共享上下文构建器，将 `request`、`admin`、`active_page`（用于高亮侧边栏）和 `csrf_token` 注入每个已认证模板。

## 数据库访问与依赖注入

- 路由依赖 `db: Annotated[AsyncSession, Depends(get_db)]`（来自 `app.database`）—— 与 API 使用相同的异步 SQLAlchemy 会话。
- `settings: Annotated[Settings, Depends(get_settings)]` 注入应用配置。
- 对象存储在每个请求中通过 `get_admin_storage(request) -> request.app.state.storage` 获取（一个 `ObjectStorage`）。
- 并发控制使用 Postgres 咨询锁（`acquire_transaction_advisory_lock`），覆盖营销活动配置、提示词管理、报告模板候选和提供商连接/模型目录变更——命名空间如 `campaign-configuration`、`prompt-management`、`provider-connection`、`provider-configuration`。
- 乐观并发在提供商连接、提供商模型、任务类型目录和营销活动配置上使用 `configuration_version` / `expected_version` 模式：过期的编辑返回 `409 PROVIDER_CONFIGURATION_CHANGED`（或 `CAMPAIGN_CONFIGURATION_CHANGED`），提示运营人员刷新页面。

## 管理报表缓存

`app/admin_cache.py` 定义了 `AdminReportCache`——一个小型的**进程内**内存 LRU 缓存（最多 64 条），由 `asyncio.Lock` 保护以防止同进程缓存击穿。它被实例化为模块级单例 `admin_report_cache`。

- 仅用于重量级的**只读**报表：财务（`build_finance_report`，键 `finance:{months}`）和性能监控（`build_http_performance_report` + `build_job_performance_report`，键 `performance:{minutes}:{hours}`）。
- TTL 来自 `settings.admin_report_cache_seconds`。
- 改变底层数据的变更操作会调用 `admin_report_cache.clear()`（例如在录入财务成本之后），以避免返回过期报表。
- 实时快照（`build_live_performance_report`、`build_active_job_snapshot`、`build_runtime_bottleneck_report`）刻意**不**缓存。

## 模板与布局

所有页面继承 `app/templates/admin/base.html`，后者渲染：
- `SC` 品牌标识和 `Studio Control` / *Design operations* 标题。
- 一个 `language_picker`（`_language_picker.html`）。
- 包含 14 个链接的 `<nav>`，当 `active_page` 匹配时高亮对应项。
- 侧边栏底部显示已登录管理员的显示名称和 `POST /admin/logout` 按钮。
- `<main class="content">`，每个页面的 `{% block content %}` 在此呈现。

局部片段：`_search.html`（实时搜索 + 状态筛选表单）、`_pagination.html`（上一页/下一页 + 页码范围）、`_overview_alerts.html`（自动刷新的行动中心区域）。

## i18n（管理后台独立于文档网站的翻译系统）

管理后台有独立的双语系统：
- `app/templates/admin/_i18n.html` 定义了两个 Jinja 宏：
  - `admin_locale(request)` —— 当 `admin_language` cookie 为 `"en"` 时返回 `"en"`，否则返回 `"zh-CN"`。
  - `tr(request, key)` —— 从英文键到简体中文的字典查找；未知键直接渲染英文键本身。
- `_language_picker.html` 渲染一个 `<select data-admin-language>`，选项为 `zh-CN` / `en`。
- `app/static/admin-language.js` 拦截该下拉框的变更，设置 `admin_language` cookie，然后重新加载页面。
- 模板中经常直接判断 `admin_locale(request) == "en"` 来处理 `tr` 表中未收录的短语。

## 静态资源与渐进增强

- `/static/admin.css` —— 所有管理后台样式（侧边栏、指标卡片网格、面板、表格、状态标签、由 `<progress>` 和内联 SVG 构建的图表）。
- `/static/admin.js` —— 原生 JS，无框架。关键行为：
  - **异步原地变更**：任何带有 `data-admin-async-mutation="<key>"` 的表单在提交时被拦截。JS POST 表单，解析返回的 HTML 文档，然后替换匹配的 `data-admin-async-scope="<key>"` 块（或 `data-admin-async-sync` 目标），而不是重新加载页面。`data-admin-async-remove` 在成功后移除该行。这就是积分调整、停用操作、计费编辑和报告配置保存为何感觉即时的原因。
  - **实时搜索**：`data-live-search` + `data-live-results` 对搜索输入做防抖处理并拉取页面，替换结果区域。
  - **自动提交下拉框**：`select[data-auto-submit]` 在变更时提交其父表单（用于时间窗口/趋势筛选）。
  - **两步直传**：`data-asset-upload-form` 和 `data-legal-upload-form` 先调用 `POST .../upload-intents`，然后将文件直接 PUT 到对象存储，最后调用 `POST .../complete`。
  - **仪表盘**：营销数据轮询（`data-marketing-*`）、支付对账进度轮询（`data-payment-reconciliation-*`）、报告模板编辑器（`data-report-template-editor` + 预览/保存状态步骤）、总览告警自动刷新、性能监控 DOM 刷新。
  - **滚动位置保持**：通过 `studio-control:auto-submit-scroll` 在异步变更之间记忆滚动位置。
- `/static/admin-language.js` —— cookie 语言切换。

`base.html` 中的静态 URL 通过 `?v=...` 查询字符串进行缓存清除。

## 请求/响应约定

- 大多数变更操作返回 `RedirectResponse(... 303)` 到列表页（PRG 模式），这样浏览器刷新不会重复 POST。
- 异步变更新表单是例外：它们返回完整渲染的页面 HTML，JS 负责替换片段。
- JSON 端点（`/admin/marketing/data`、`/admin/performance/live`、`/admin/report-templates/*`、对账进度）设置 `Cache-Control: private, no-store`。
- 错误使用 `detail.code` 中稳定的、有文档记录的机器码（例如 `CSRF_TOKEN_INVALID`、`ADMIN_LOGIN_REQUIRED`、`PROVIDER_CONFIGURATION_CHANGED`、`TOKEN_ADJUSTMENT_ZERO`、`LEGAL_DOCUMENT_VERSION_EXISTS`），而不是自由文本的 HTTP detail。

## 涉及的数据模型（SQLAlchemy）

管理路由读写以下表（参见 `app/db_models.py`）：`User`、`Enterprise`、`EnterpriseMembership`、`DesignJob`、`DesignJobType`、`DesignJobSubmission`、`PaymentOrder`、`UserSubscription`、`SubscriptionPlan`、`TokenPackage`、`TokenLedgerEntry`、`ProviderConnection`、`ProviderModelConfig`、`ProviderModelCatalog`、`PromptTemplate`、`PromptVariable`、`PromptOption`、`CampaignConfiguration`、`CampaignCode`、`Asset`/`AssetDisplayMetadata`/`AssetUploadIntent`、`LegalDocument`、`CurrentLegalDocument`、`LegalDocumentAcceptance`、`FinanceCostEntry`。

## 路由处理器结构

每个已认证路由都遵循相同的模式，这使得约 4,938 行的 `admin.py` 尽管庞大仍可导航。

一个读取页面：

```python
@router.get("/users")
async def admin_users_page(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    q: str | None = None,
    page: int = 1,
):
    admin = await current_admin(request, db)
    if admin is None:
        return RedirectResponse("/admin/login", status_code=303)
    ... build rows ...
    return templates.TemplateResponse(
        request, "admin/users.html",
        page_context(request, admin, "users", rows=..., pagination=..., q=q),
    )
```

一个变更操作：

```python
@router.post("/users/{user_id}/tokens")
async def adjust_user_tokens_route(
    request: Request,
    user_id: UUID,
    form: Annotated[AdminTokenAdjustForm, Depends(form_from_request)],
    db: ..., settings: ...,
):
    admin = await require_admin(request, db)
    await ensure_csrf(request, form.csrf_token)
    ... call billing.adjust_user_tokens(...) ...
    return RedirectResponse(request.headers.get("referer") or "/admin/users", status_code=303)
```

关键约定：
- GET 页面使用 `current_admin`（缺失时重定向到登录），POST 使用 `require_admin`（抛出 `401`）。
- 表单被解析为小型 Pydantic 风格的表单模型；数值范围在 Python 和数据库 `CheckConstraint` 双重层面强制执行（纵深防御）。
- 成功的变更操作重定向（303）回引用页面或列表（PRG）。
- 异步变更新表单通过携带 `data-admin-async-mutation` 选择原地替换；其处理器仍然返回完整渲染页面，`admin.js` 提取需要替换的范围。

## 稳定错误码

错误以结构化 JSON 形式呈现，以便 `admin.js` 可以显示内联消息。`detail.code` 字符串是契约：

| 错误码 | 含义 |
| --- | --- |
| `CSRF_TOKEN_INVALID` | CSRF 不匹配。 |
| `ADMIN_LOGIN_REQUIRED` | 没有有效的管理员会话。 |
| `ADMIN_SESSION_UNAVAILABLE` | Redis 会话存储不可用（故障关闭 503）。 |
| `TOKEN_ADJUSTMENT_ZERO` | 零金额积分调整被拒绝。 |
| `PROVIDER_CONFIGURATION_CHANGED` | 提供商编辑时 `expected_version` 过期。 |
| `CAMPAIGN_CONFIGURATION_CHANGED` | 并发营销活动编辑冲突。 |
| `LEGAL_DOCUMENT_VERSION_EXISTS` | 重复的法律版本标签。 |
| `WORKSPACE_MEMBER_LIMIT_BELOW_MEMBERS` | 设置的成员上限低于当前成员数。 |

## 后台任务与对账

长时间运行的工作不会在请求中同步执行。支付对账（`POST /admin/billing/payments/reconcile`）启动一个异步任务，将其进度存储在 `progress_id` 下，UI 轮询 `/admin/billing/payments/reconcile/{progress_id}`。类似地，报告模板候选提升执行"先保存再提升"的序列，以步骤状态呈现而不是阻塞请求。

## 页面上下文、局部片段与静态版本化

`page_context(...)` 是每个已认证模板接收数据的唯一通道。除了 `csrf_token`、`admin` 和 `active_page` 之外，调用者还传入页面特定的值（行数据、分页、筛选器、错误/成功横幅）。因为它是唯一的上下文构建器，向所有管理页面添加新的全局变量只需一行改动。

三个局部片段在列表页间共享，以保持模板精简：

- `_search.html` —— 渲染实时搜索输入和可选的状态 `<select>`。绑定 `data-live-search` 并报告 `aria-live` 状态。
- `_pagination.html` —— 渲染保留当前查询字符串的上一页/下一页链接（`request.url.include_query_params(page=...)`）以及"X–Y / N"页码范围。
- `_overview_alerts.html` —— 仪表盘的行动中心区域，同时也被 `/admin/overview/alerts` 作为独立片段获取，用于 60 秒自动刷新。

静态资源通过缓存清除查询字符串引用（`/static/admin.css?v=...`、`/static/admin.js?v=...`、`/static/admin-language.js?v=...`），这样重新部署时无需更改文件名即可清除浏览器缓存。

## 主题与响应式行为

`admin.css` 定义了固定侧边栏布局、指标卡片网格、面板样式和状态标签（`overview-alert-critical/warning/info`、状态徽章）。图表不是图表库——它们由轻量的 `<progress>` 条、内联 SVG 和 CSS 构建，使管理后台无依赖且快速。`admin.js` 处理移动端侧边栏折叠，并通过 `studio-control:auto-submit-scroll` 键在异步变更间记忆滚动位置，让运营人员在调整积分余额后不会丢失位置。

## 扩展管理后台

要添加新的管理分区：
1. 在 `app/admin.py` 中现有的 `router` 下添加路由处理器（POST 使用 `require_admin`、`ensure_csrf`、`page_context`）。
2. 在 `app/templates/admin/` 中创建继承 `base.html` 的模板，设置 `active_page="..."`。
3. 在 `base.html` 中添加侧边栏 `<a>` 链接，匹配对应的 `active_page`。
4. 如果是重量级报表，用 `admin_report_cache.get_or_create(...)` 包装，并在相关变更后调用 `clear()`。
5. 在 `_i18n.html` 的 `tr` 字典中添加 UI 字符串（或直接根据语言环境分支）。
6. 如果需要原地更新，使用 `data-admin-async-mutation` / `data-admin-async-scope` 约定。
