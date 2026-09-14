# Architecture & Components

This page is the deep tour of how the backend is put together. It starts from a
single incoming HTTP request and traces it through middleware, dependencies,
and the database; then it explains the worker topology and the modules that
own each domain. Read
[Overview](/backend/overview) first if you have not yet seen the high-level
picture.

## Process model

The codebase is one image launched as three logical process types:

| Process | Entrypoint | Owns |
| --- | --- | --- |
| **API** | `uvicorn app.main:app` | all HTTP: `/api/v1/*`, `/admin/*`, `/metrics`, health, OpenAPI |
| **Submit worker** | `arq app.worker.SubmitWorkerSettings` | outbound provider submission + short-lived maintenance |
| **Poll worker** | `arq app.worker.PollWorkerSettings` | provider polling, result persistence, long-lived cleanup/reconcile |

The queues are named in `app/queue_names.py`:

```python
SUBMIT_JOB_QUEUE = "submit_provider_job"
POLL_JOB_QUEUE = "poll_provider_job"
```

`SubmitWorkerSettings.queues` lists only `submit_provider_job`;
`PollWorkerSettings.queues` lists only `poll_provider_job`. Each worker class
also declares the exact set of functions it imports, so a function placed on the
wrong queue is never accidentally claimed.

## Application setup (`app/main.py`)

`app/main.py` builds the FastAPI app inside `create_app()`:

1. Loads `Settings` (env vars) and validates dangerous combinations for
   production (e.g. refusing mock providers / fake endpoints when
   `ENVIRONMENT=production`).
2. Opens the async SQLAlchemy engine and Redis connection.
3. Wires middleware: request-ID propagation, bounded concurrency
   (`MAX_CONCURRENT_REQUESTS_PER_PROCESS`), gzip, CORS, and the
   `http_safety` metrics/error middleware.
4. Mounts routers:
   - `api.router` under `/api/v1` (core API),
   - `asset_api.router` under `/api/v1/assets`,
   - `billing_api.router` under `/api/v1`,
   - `workspace_api.router` under `/api/v1`,
   - `referral_api.router` under `/api/v1`,
   - `account_lifecycle_api.router` (self + reactivation endpoints),
   - `config_export.router` (`/admin/config-export.json`),
   - the admin `admin.router` under `/admin`,
   - health endpoints `/health/live`, `/health/ready`,
   - `/metrics` for performance snapshots.
5. Runs startup/lifespan tasks: schema creation or Alembic upgrade,
   idempotent seed defaults, and worker-task registration.

## Middleware & safety (`app/http_safety.py`)

Every request passes through a thin middleware that:

- assigns or propagates a 32-hex-char request id (logged and returned),
- times the request,
- records one bounded metric per **registered route template** (never a raw
  URL path, to keep cardinality low),
- normalizes uncaught exceptions into a stable JSON error envelope with a
  machine-readable `code`,
- suppresses noisy repeated error logs with a per-minute budget
  (`_UNHANDLED_ERROR_LOG_BUDGET`).

Paths excluded from metrics include `/health/live`, `/health/ready`, and the
admin performance endpoints.

## A typical request lifecycle

Take `POST /api/v1/design-jobs` (create a design job) as an example:

1. **Routing & validation.** FastAPI matches the path and parses the body
   into a Pydantic `DesignJobCreate` model (`app/models.py`).
2. **Auth dependency.** `Depends(get_current_user)` (`app/auth.py`) reads the
   `Authorization: Bearer <jwt>` header, decodes it with PyJWT, checks the
   `typ == "access"` claim, loads the active `User`, and immediately commits
   the read transaction so the user object is not pinned to a connection.
3. **Rate limiting.** Redis-backed sliding-window limits from `rate_limit.py`
   (e.g. `DESIGN_RATE_LIMIT_JOBS` per window, `MAX_ACTIVE_DESIGN_JOBS_PER_USER`).
4. **Workspace admission.** The endpoint resolves the caller's current workspace
   (personal or enterprise) via `app/workspaces.py`, locking rows as needed.
5. **Token reservation.** `app/billing.py:reserve_design_tokens` atomically
   moves tokens from `remaining_tokens` into `reserved_tokens` and writes a
   `TokenLedgerEntries` row — the charge is held, not yet final.
6. **Asset reservation.** `app/design_job.py:reserve_design_job_assets` validates
   the referenced uploaded assets, locks them, and creates the `DesignJob` row
   in a non-terminal state.
7. **Enqueue.** The API enqueues `submit_design_job` onto `submit_provider_job`
   and returns `202 Accepted` (or the equivalent created payload) immediately.
8. **Background work.** The submit worker picks the task, composes the provider
   request via the selected provider adapter, calls the provider, and enqueues
   a poll task. The poll worker later downloads the result, stores it, and
   settles the tokens.

The API request never waits for the model. This split is the core architectural
idea: **the API is a durable transaction + enqueue; the workers are the slow
side.**

## Module map

### Core / cross-cutting

| Module | Responsibility |
| --- | --- |
| `config.py` | `Settings` (pydantic-settings BaseSettings), the single typed view of every env var; validators reject dangerous production combos |
| `database.py` | async engine, `get_db` session dependency, PostgreSQL advisory-lock helpers |
| `db_models.py` | all SQLAlchemy ORM models (52 tables) and enums |
| `models.py` | Pydantic request/response schemas (the API contract) |
| `rate_limit.py` | Redis sliding-window rate limits used across auth, uploads, design jobs, referrals |
| `http_safety.py` / `http_errors.py` | middleware, request id, metric aggregation, coded error envelope |
| `performance.py` | in-memory HTTP aggregates flushed to Redis, job-performance event stream, bottleneck report |
| `overview.py` | aggregates used by the admin overview page |

### Domain modules

| Domain | Module(s) | Notes |
| --- | --- | --- |
| Auth | `auth.py`, `wechat_auth.py` | JWT issue/decode, Argon2id password hashing, WeChat `code2session` + phone exchange |
| Design jobs | `design_job.py`, `design_job_types` | reserve → submit → poll → settle; reconciles stale jobs |
| Providers | `providers/`, `provider_configuration.py` | adapters + DB-backed connection/model/catalog config |
| Billing & tokens | `billing.py`, `billing_api.py`, `wechat_pay.py` | token ledger, subscriptions, packages, payment orders, refunds |
| Entitlements | `entitlements.py`, `subscription_entitlements.py` | personal subscription projection & benefit display |
| Assets & storage | `assets.py`, `asset_api.py`, `asset_*.py`, `storage.py` | upload intents, direct upload, completion, cleanup |
| Reports | `report_config.py`, `report_discovery.py`, `report_library.py`, `report_render*.py`, `report_view.py` | per-workspace report config, HTML report rendering, signed view tokens |
| Workspaces & orgs | `workspaces.py`, `workspace_api.py`, `share_invitations.py` | personal workspaces, enterprises, memberships, invitations |
| Prompt templates | `prompt_templates.py` | admin-managed prompts with variables/options, archive import/export |
| Campaigns | `campaign_configuration.py` | runtime campaign token amounts with optimistic versioning |
| Summaries | `summary_catalog.py`, `summary_prompt.py` | recording → Markdown summary job type + system prompt (#208) |
| Referrals | `referral_api.py`, `referral_rewards.py`, `referral_attribution.py`, ... | single-use invitation bearers, reward grants, outbox events |
| Account lifecycle | `account_lifecycle_api.py`, `billing.py` deactivate/anonymize | deactivate → grace → anonymize; admin suspend/reactivate/archive |
| Admin | `admin.py`, `admin_sessions.py` | server-rendered admin site, signed sessions, CSRF |

## Worker topology in detail

Both workers share helper functions (expire subscriptions, anonymize due
accounts, record performance events, reconcile stale jobs, clean up temporary
assets) but differ in their **primary** queue and the jobs unique to their role.

**Submit worker** (`SubmitWorkerSettings`) additionally runs functions that
drive outbound provider calls:

- `submit_design_job` — reserve the job, build the provider request, submit,
  enqueue poll.
- `process_terminate_design_job` — admin-forced failure of a stuck job.
- `process_reconcile_stale_design_jobs` — re-drive jobs lost mid-flight.
- plus shared maintenance: `process_cleanup_temporary_assets`,
  `process_cleanup_provider_staging_artifacts`, `process_expire_user_subscriptions`,
  `process_expire_locked_user_subscriptions`, `process_anonymize_due_user_accounts`,
  `process_record_provider_job_performance_events`,
  `process_record_runtime_bottleneck_metrics`.

**Poll worker** (`PollWorkerSettings`) additionally runs:

- `poll_design_job` — poll the provider, download result, persist, settle.
- `process_cleanup_report_result_artifacts`,
  `process_reconcile_report_templates` — report-specific housekeeping.
- the same shared maintenance functions as the submit worker.

Worker graceful shutdown honors `WORKER_JOB_COMPLETION_WAIT_SECONDS` (default
270s): on `SIGTERM` the worker stops claiming new work and lets in-flight jobs
finish. The deployment's container termination grace must be longer than this
value.

## Consistency and locking

The codebase uses a small, consistent set of concurrency primitives:

- **PostgreSQL row locks** (`SELECT ... FOR UPDATE`) for workspace and token
  mutations, with a strict ordering (e.g. enterprise → user → membership) to
  avoid deadlocks.
- **Transaction advisory locks** (`acquire_transaction_advisory_lock`) for
  logically serialized updates that don't map to a single row, such as
  campaign-configuration saves.
- **Redis short locks with leases + renewal** (`design_job.py: _acquire_short_lock`
  / `_renew_short_lock`) around provider operations so two workers never
  double-submit the same job.
- **Idempotency keys** (`Idempotency-Key` HTTP header, 8–128 chars) for
  upload intents, referral invites, reward claims, and payment actions.

## Read next

- [Design Jobs](/backend/design-jobs) — the pipeline and provider catalog.
- [Authentication](/backend/authentication) — JWT, WeChat, admin sessions.
- [Observability](/backend/observability) — logging, metrics, performance.
