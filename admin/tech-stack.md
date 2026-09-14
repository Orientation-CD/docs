# Tech Stack & Architecture (for developers)

This page describes how Studio Control is built under the hood. It is written for engineers who need to extend, debug, or onboard to the admin codebase. For how to *use* the screens, see the other pages in this section.

## Where the code lives

The entire admin system is implemented in a single, large router module plus a handful of focused helpers:

| Path | Role |
| --- | --- |
| `app/admin.py` | The complete admin system: `APIRouter`, all route handlers, auth glue, template rendering, and HTML/JSON responses (~4,938 lines). |
| `app/admin_sessions.py` | Redis-backed "one active session per admin" logic (84 lines). |
| `app/admin_cache.py` | Process-local LRU cache for read-only admin reports (55 lines). |
| `app/templates/admin/` | All Jinja2 templates (layout, pages, partials). |
| `app/static/admin.css` | Admin stylesheet. |
| `app/static/admin.js` | Progressive-enhancement behavior (async mutations, live search, dashboards, uploads). |
| `app/static/admin-language.js` | Reads/sets the `admin_language` cookie for the admin i18n. |

Reporting/business logic is deliberately pushed out of `admin.py` into domain modules that the routes call:

- `app/overview.py` — `build_overview_report`
- `app/marketing.py` — `build_marketing_report`, `parse_marketing_range`
- `app/finance.py` — `build_finance_report`, `upsert_monthly_cost`, `FinanceTrend`
- `app/performance.py` — `build_http_performance_report`, `build_job_performance_report`, `build_live_performance_report`, `build_active_job_snapshot`, `build_runtime_bottleneck_report`
- `app/provider_configuration.py` — provider connection/model/catalog save, archive, validation, capabilities
- `app/campaign_configuration.py` — `save_campaign_token_amount`, `MAX_CAMPAIGN_TOKEN_AMOUNT`
- `app/prompt_templates.py` — prompt validation, archive parse/serialize
- `app/report_templates.py`, `app/report_view.py` — report template lifecycle and preview
- `app/billing.py` — `adjust_user_tokens`, `adjust_enterprise_tokens`, `remove_user_account`, `dissolve_enterprise`
- `app/design_job.py` — `delete_terminal_design_job`, `admin_mark_design_job_failed`
- `app/asset_management.py`, `app/assets.py`, `app/asset_completion.py` — asset listing, upload intents, completion
- `app/legal_documents.py` — constants and date helpers
- `app/payment_reconciliation.py` — `count_expired_pending_payments`, `payment_text_filter`

## The router and template setup

At the top of `app/admin.py`:

```python
router = APIRouter(prefix="/admin", tags=["admin"], include_in_schema=False)
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))
ADMIN_PAGE_SIZE = 50
```

- `include_in_schema=False` hides all admin routes from the public OpenAPI doc.
- `Jinja2Templates` points at the shared `app/templates/` directory; admin templates live under `templates/admin/`.
- Every list page pages at `ADMIN_PAGE_SIZE = 50`.

The router is included by `app/main.py` (the route names you read below all hang off `/admin`).

## Authentication & session model

### Signed browser session + Redis session registry

Two layers cooperate:

1. **A signed cookie session** (Starlette `request.session`, cookie-backed) stores three values on login:
   - `admin_user_id` — the admin's `User.id`
   - `admin_session_id` — a fresh `secrets.token_urlsafe(32)` session token
   - `csrf_token` — a separate `secrets.token_urlsafe(32)` value used for CSRF

2. **Redis "active session" registry** in `app/admin_sessions.py`. Only one browser session per admin account is valid at a time:
   - `activate_admin_session(redis, admin_user_id, session_id)` stores the session id under key `admin-session:v1:active:<admin_user_id>` with `ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60` (8 hours). Logging in from a second browser overwrites the first, kicking it out.
   - `admin_session_is_active(...)` compares the cookie's session id to the stored one with `secrets.compare_digest`.
   - `revoke_admin_session(...)` uses a Lua compare-and-delete script so a logout only revokes the session that still owns the account.
   - Failures raise `AdminSessionUnavailable`, which the route layer turns into a `503 ADMIN_SESSION_UNAVAILABLE` (fail-closed).

### Dependencies

- `current_admin(request, db) -> User | None` — the core dependency. Reads the cookie, validates the Redis active session, loads the `User`, and requires `user.user_type == UserType.ADMIN` **and** `user.is_active`. It explicitly commits the read transaction so the session-check connection is not held while rendering.
- `require_admin(request, db) -> User` — wraps `current_admin` and raises `401 ADMIN_LOGIN_REQUIRED` when absent. Used by every POST (mutation) and by JSON data endpoints.
- Read-only pages call `current_admin` directly and redirect to `/admin/login` when it returns `None`; authenticated mutation endpoints raise `401`.

### Login flow (`admin_login_page`, `admin_login`)

`POST /admin/login` takes `phone` + `password`. It:
- Normalizes the phone via `app.auth.normalize_phone`.
- Enforces two rate limits in Redis (namespace `admin-login-ip` by client host, `admin-login-account` by phone), bounded by `settings.auth_rate_limit_attempts` / `auth_rate_limit_window_seconds`.
- Looks up the user, then releases the DB connection before the CPU-bound `verify_password_async(password, user.password_hash)`.
- Rejects unless the user exists, `user_type == ADMIN`, `is_active`, and the password verifies.
- On success stamps `last_login_at`, generates a new session id, calls `activate_admin_session`, and writes the three session values.

## CSRF protection

`ensure_csrf(request, submitted_token)` compares the form's `csrf_token` field to `request.session["csrf_token"]` using `secrets.compare_digest`, returning `403 CSRF_TOKEN_INVALID` on mismatch. Every state-changing POST includes a hidden `<input type="hidden" name="csrf_token" value="{{ csrf_token }}">` rendered by `page_context(...)`. The logout form and every admin form follow this pattern.

`page_context(request, admin, active_page=..., **values)` is the shared context builder that injects `request`, `admin`, `active_page` (used to highlight the sidebar), and `csrf_token` into every authenticated template.

## Database access & dependency injection

- Routes depend on `db: Annotated[AsyncSession, Depends(get_db)]` (from `app.database`) — the same async SQLAlchemy session the API uses.
- `settings: Annotated[Settings, Depends(get_settings)]` injects app configuration.
- Object storage is obtained per-request via `get_admin_storage(request) -> request.app.state.storage` (an `ObjectStorage`).
- Concurrency is guarded with Postgres advisory locks (`acquire_transaction_advisory_lock`) for campaign config, prompt management, report-template candidates, and provider connection/model catalog changes — namespaces like `campaign-configuration`, `prompt-management`, `provider-connection`, `provider-configuration`.
- Optimistic concurrency uses a `configuration_version` / `expected_version` pattern on provider connections, provider models, job-type catalogs, and campaign configs: a stale edit returns `409 PROVIDER_CONFIGURATION_CHANGED` (or `CAMPAIGN_CONFIGURATION_CHANGED`) so the operator refreshes.

## Admin report cache

`app/admin_cache.py` defines `AdminReportCache` — a small **process-local**, in-memory, LRU cache (max 64 entries) protected by an `asyncio.Lock` to prevent same-process stampedes. It is instantiated as the module-level singleton `admin_report_cache`.

- Used only for heavy **read-only** reports: Finance (`build_finance_report`, key `finance:{months}`) and Performance (`build_http_performance_report` + `build_job_performance_report`, key `performance:{minutes}:{hours}`).
- TTL comes from `settings.admin_report_cache_seconds`.
- Mutations that change the underlying numbers call `admin_report_cache.clear()` (e.g. after recording a finance cost) so stale reports are not served.
- Live snapshots (`build_live_performance_report`, `build_active_job_snapshot`, `build_runtime_bottleneck_report`) are deliberately **not** cached.

## Templates & layout

All pages extend `app/templates/admin/base.html`, which renders:
- The `SC` brand and `Studio Control` / *Design operations* title.
- A `language_picker` (`_language_picker.html`).
- The `<nav>` of 14 links, each highlighted when `active_page` matches.
- A sidebar footer showing the signed-in admin's display name and a `POST /admin/logout` button.
- `<main class="content">` where each page's `{% block content %}` lands.

Partials: `_search.html` (live search + status filter form), `_pagination.html` (prev/next + range), `_overview_alerts.html` (the Action Center region that auto-refreshes).

## i18n (admin's own, separate from the docs site)

The admin has an independent bilingual system:
- `app/templates/admin/_i18n.html` defines two Jinja macros:
  - `admin_locale(request)` — returns `"en"` when the `admin_language` cookie equals `"en"`, otherwise `"zh-CN"`.
  - `tr(request, key)` — a dict lookup from English key to Simplified Chinese; unknown keys render the English key itself.
- `_language_picker.html` renders a `<select data-admin-language>` of `zh-CN` / `en`.
- `app/static/admin-language.js` intercepts changes to that select, sets the `admin_language` cookie, and reloads.
- Templates frequently branch directly on `admin_locale(request) == "en"` for phrases not in the `tr` table.

## Static assets & progressive enhancement

- `/static/admin.css` — all admin styling (sidebar, metric grids, panels, tables, status chips, charts built from `<progress>` and inline SVG).
- `/static/admin.js` — vanilla JS, no framework. Key behaviors:
  - **Async in-place mutations**: any form carrying `data-admin-async-mutation="<key>"` is intercepted on submit. The JS POSTs the form, parses the returned HTML document, and swaps the matching `data-admin-async-scope="<key>"` block (or `data-admin-async-sync` targets) instead of reloading. `data-admin-async-remove` removes the row on success. This is how token adjustments, suspend actions, billing edits, and report-config saves feel instant.
  - **Live search**: `data-live-search` + `data-live-results` debounce a search input and fetch the page, replacing the results region.
  - **Auto-submit selects**: `select[data-auto-submit]` submits its parent form on change (used for window/trend filters).
  - **Two-step direct uploads**: `data-asset-upload-form` and `data-legal-upload-form` call `POST .../upload-intents`, PUT the file straight to object storage, then call `POST .../complete`.
  - **Dashboards**: Marketing polling (`data-marketing-*`), payment reconciliation progress polling (`data-payment-reconciliation-*`), report-template editor (`data-report-template-editor` + preview/save status steps), overview alerts auto-refresh, performance DOM refresh.
  - **Scroll preservation**: remembers scroll position across async mutations via `studio-control:auto-submit-scroll`.
- `/static/admin-language.js` — cookie language switch.

Static URLs in `base.html` are cache-busted with a `?v=...` query string.

## Request/response conventions

- Most mutations return a `RedirectResponse(... 303)` to a list page (PRG pattern), so browser refresh does not re-POST.
- Async-mutation forms are the exception: they return the full rendered page HTML and the JS swaps fragments.
- JSON endpoints (`/admin/marketing/data`, `/admin/performance/live`, `/admin/report-templates/*`, reconciliation progress) set `Cache-Control: private, no-store`.
- Errors use stable, documented machine codes in `detail.code` (e.g. `CSRF_TOKEN_INVALID`, `ADMIN_LOGIN_REQUIRED`, `PROVIDER_CONFIGURATION_CHANGED`, `TOKEN_ADJUSTMENT_ZERO`, `LEGAL_DOCUMENT_VERSION_EXISTS`) rather than free-text HTTP details.

## Data models touched (SQLAlchemy)

Admin routes read/write these tables (see `app/db_models.py`): `User`, `Enterprise`, `EnterpriseMembership`, `DesignJob`, `DesignJobType`, `DesignJobSubmission`, `PaymentOrder`, `UserSubscription`, `SubscriptionPlan`, `TokenPackage`, `TokenLedgerEntry`, `ProviderConnection`, `ProviderModelConfig`, `ProviderModelCatalog`, `PromptTemplate`, `PromptVariable`, `PromptOption`, `CampaignConfiguration`, `CampaignCode`, `Asset`/`AssetDisplayMetadata`/`AssetUploadIntent`, `LegalDocument`, `CurrentLegalDocument`, `LegalDocumentAcceptance`, `FinanceCostEntry`.

## Route handler anatomy

Every authenticated route follows the same shape, which makes the ~4,938-line `admin.py` navigable despite its size.

A read page:

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

A mutation:

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

Key conventions:
- `current_admin` for GET pages (redirect to login when absent), `require_admin` for POSTs (raise `401`).
- Forms are parsed into small Pydantic-style form models; numeric ranges are enforced both in Python and as DB `CheckConstraint`s (defense in depth).
- Successful mutations redirect (303) back to the referring page or the list (PRG).
- Async-mutation forms opt into in-place swaps by carrying `data-admin-async-mutation`; their handler still returns the full rendered page, and `admin.js` extracts the replacement scope.

## Stable error codes

Errors are surfaced as structured JSON so `admin.js` can show inline messages. The `detail.code` string is the contract:

| Code | Meaning |
| --- | --- |
| `CSRF_TOKEN_INVALID` | CSRF mismatch. |
| `ADMIN_LOGIN_REQUIRED` | No valid admin session. |
| `ADMIN_SESSION_UNAVAILABLE` | Redis session store unreachable (fail-closed 503). |
| `TOKEN_ADJUSTMENT_ZERO` | Zero-amount token adjustment rejected. |
| `PROVIDER_CONFIGURATION_CHANGED` | Stale `expected_version` on a provider edit. |
| `CAMPAIGN_CONFIGURATION_CHANGED` | Concurrent campaign edit conflict. |
| `LEGAL_DOCUMENT_VERSION_EXISTS` | Duplicate legal version label. |
| `WORKSPACE_MEMBER_LIMIT_BELOW_MEMBERS` | Limit set under current member count. |

## Background jobs & reconciliation

Long-running work is not done inline in a request. Payment reconciliation (`POST /admin/billing/payments/reconcile`) starts an async task, stores its progress under a `progress_id`, and the UI polls `/admin/billing/payments/reconcile/{progress_id}`. Similarly, report-template candidate promotion runs a save-then-promote sequence surfaced as step status rather than blocking the request.

## Page context, partials, and static versioning

`page_context(...)` is the single seam through which every authenticated template receives its data. Beyond `csrf_token`, `admin`, and `active_page`, callers pass page-specific values (rows, pagination, filters, error/success banners). Because it is the only context builder, adding a new global variable to every admin screen is a one-line change.

Three partials are shared across list pages to keep templates small:

- `_search.html` — renders the live-search input and the optional status `<select>`. It binds `data-live-search` and reports an `aria-live` status.
- `_pagination.html` — renders prev/next links that preserve the current query string (`request.url.include_query_params(page=...)`) plus the "X–Y of N" range.
- `_overview_alerts.html` — the dashboard Action Center region, which is also fetched as a standalone fragment by `/admin/overview/alerts` for the 60-second auto-refresh.

Static assets are referenced with a cache-busting query string (`/static/admin.css?v=...`, `/static/admin.js?v=...`, `/static/admin-language.js?v=...`) so a redeploy busts browser caches without changing filenames.

## Theming and responsive behavior

`admin.css` defines the fixed sidebar layout, the metric-card grid, panel styles, and status chips (`overview-alert-critical/warning/info`, status badges). Charts are not a charting library — they are built from lightweight `<progress>` bars, inline SVG, and CSS, which keeps the admin dependency-free and fast. `admin.js` handles mobile collapse of the sidebar and remembers scroll position across async mutations via the `studio-control:auto-submit-scroll` key so operators do not lose their place after adjusting a token balance.

## Extending the admin

To add a new admin section:
1. Add a route handler under the existing `router` in `app/admin.py` (use `require_admin` for POSTs, `ensure_csrf`, `page_context`).
2. Create a template in `app/templates/admin/` extending `base.html`, set `active_page="..."`.
3. Add the sidebar `<a>` to `base.html` with matching `active_page`.
4. If it's a heavy report, wrap it in `admin_report_cache.get_or_create(...)` and `clear()` it after related mutations.
5. Add UI strings to the `tr` dict in `_i18n.html` (or branch on locale directly).
6. Use the `data-admin-async-mutation` / `data-admin-async-scope` convention if you want in-place updates.
