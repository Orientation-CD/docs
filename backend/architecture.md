# Backend Architecture & Components

This page goes deeper into how the backend is built and how its components
interact at runtime.

## Application lifecycle (`app/main.py`)

The FastAPI app is created in `main.py`:

1. Load settings (`config.py`).
2. Build the async SQLAlchemy engine/session factory (`database.py`).
3. Build the object-storage client (`storage.py`).
4. Initialize WeChat Pay (loads merchant keys/certs, `wechat_pay.py`).
5. Mount routers (`/api/v1/...`, admin app, health, webhooks).
6. On startup, optionally apply pending migration checks; on shutdown, close
   resources cleanly.

## The API process

The API exposes:

| Area | Router file | Prefix |
| --- | --- | --- |
| Auth & users | `api.py` | `/api/v1/auth`, `/api/v1/users` |
| Legal documents | `api.py` | `/api/v1/legal-documents` |
| Prompt templates | `api.py` | `/api/v1/prompt-templates` |
| Design jobs | `api.py` | `/api/v1/design-jobs`, `/api/v1/workspace/design-jobs` |
| Assets | `asset_api.py` | `/api/v1/assets` |
| Billing & subscriptions | `billing_api.py` | `/api/v1/billing/...` |
| Workspaces | `workspace_api.py` | `/api/v1/workspaces` |
| Account lifecycle | `account_lifecycle_api.py` | `/api/v1/account/...` |
| Health | `api.py` | `/health/live`, `/health/ready` |
| Admin site | `admin.py` | `/admin` (HTML) |
| WeChat Pay notify | `billing_api.py` / `wechat_pay.py` | webhook path |
| Mock endpoints (local) | mock servers | `/mock/...` |

Every request goes through **dependencies** (`get_db`, `get_settings`,
`get_storage`, `get_queue`) and, for protected routes, `get_current_user`
(`auth.py`), which decodes the Bearer JWT, loads the user, and enforces active
status.

## Configuration (`config.py`)

A single pydantic-settings `Settings` class reads every environment variable
(see [Configuration Reference](/reference/configuration)). It covers: database,
Redis, JWT, WeChat, payment, storage, providers, rate limits, job limits,
report config, legal docs, performance metrics and more. All settings are
available through `Depends(get_settings)`.

## Database access (`database.py`, `db_models.py`)

- **Engine**: async SQLAlchemy (`create_async_engine` with `asyncpg`), a
  connection pool sized per process.
- **Sessions**: a session factory used by request handlers and worker tasks.
- **Schema**: ORM models in `db_models.py`, managed by **Alembic** migrations
  (`alembic upgrade head`). The migration Job is a mandatory pre-deploy step
  and **fails closed** if the live schema doesn't match the model metadata
  (see [SAE Deployment](/deploy/sae-deployment)).

Key tables: `users`, `auth_sessions`, `workspaces`, `workspace_memberships`,
`design_jobs`, `design_job_assets`, `assets`, `token_ledger_entries`,
`billing_orders`, `subscriptions`, `report_configs`, `report_templates`,
`prompt_templates`, `legal_documents`, `legal_acceptances` and more.

## Redis usage

- **ARQ queues** — two named queues: `ADMISSION_QUEUE` (submit) and
  `POLL_QUEUE` (poll + cron). See `queue_names.py`.
- **Rate limiting** — Redis counters keyed by subject + namespace
  (`rate_limit.py`).
- **Progress metrics** — moving-average duration data used to estimate design
  job progress.
- **Coordination** — locks for idempotency and job admission.

## Object storage abstraction (`storage.py`)

`ObjectStorage` wraps an S3 client with two endpoint personalities:

- **`S3_ENDPOINT`** — server-side endpoint (used by the backend/workers).
- **`S3_PRESIGN_ENDPOINT`** — the endpoint embedded in presigned URLs handed to
  browsers / mini program (publicly reachable).

It provides: presigned upload forms, presigned download URLs, object metadata,
copy/delete, and multi-part support. Local dev uses MinIO; production uses
Aliyun OSS (S3-compatible).

## The ARQ workers (`worker.py`)

Two worker settings classes define what each process runs:

**SubmitWorkerSettings** (queue `ADMISSION_QUEUE`)
- `submit_design_job` — enqueued by the API on `POST /design-jobs`; performs
  admission + provider submission.
- `process_design_job` — legacy alias.

**PollWorkerSettings** (queue `POLL_QUEUE`)
- `poll_design_job` — polls the provider and completes the job.
- `reconcile_stale_design_jobs` (cron) — re-enqueues lost steps.
- `process_subscription_expirations` (cron) — expire subscriptions.
- `reconcile_old_pending_payments` (cron) — settle/handle stale payments.
- `cleanup_expired_temp_assets` (cron) — delete temp uploads past retention.
- `cleanup_orphaned_report_results` (cron) — clean orphaned report objects.
- `promote_report_template` / `reconcile_report_templates` (cron) — report
  template lifecycle.
- `process_account_anonymization` (cron) — GDPR-style deactivation/anonymization.

Both settings share a startup that builds engine, session factory, storage,
WeChat Pay client, and an httpx provider client. Workers are graceful: on
SIGTERM they stop claiming new work and let in-flight jobs finish
(`job_completion_wait`), which is why SAE termination grace must exceed it.

## AI provider layer (`app/providers/`)

The provider layer abstracts AI image generation behind a small interface:

- `providers/base.py` — the provider interface (submit, poll, result fetch).
- `providers/seedream.py` — the primary Seedream provider implementation.
- Provider configuration (`provider_configuration.py`) registers which
  provider/endpoint each job type uses.

The backend treats the model as an **asynchronous job service**: submit → get
`provider_job_id` → poll → fetch result. A **mock provider**
(`mock_image_server.py`) implements the same contract locally so the full
pipeline runs without external model access.

## Request safety (`http_safety.py`, `rate_limit.py`)

- **Rate limits**: auth attempts (per IP), design-job submissions (per user,
  hourly), share invitations, registration concurrency.
- **Max concurrent requests**: per-process backpressure
  (`MAX_CONCURRENT_REQUESTS_PER_PROCESS`).
- **Upload bounds**: `MAX_UPLOAD_BYTES`, `MAX_REQUEST_BYTES`, `MAX_IMAGE_PIXELS`.
- **Concurrency safety**: admission slots ensure a user can't exceed
  `MAX_ACTIVE_DESIGN_JOBS_PER_USER` active jobs.

## Observability (`performance.py`)

- Aggregates request metrics in memory, flushes compact Redis snapshots every
  10 s.
- Traces slow/failed requests within a bounded per-minute log budget.
- Design-job queue & end-to-end duration logging for unusual cases.
- **No payloads, credentials, phones or raw URLs are logged.**

See [Observability & Safety](/backend/observability).

## Next steps

- [Authentication](/backend/authentication)
- [Design Jobs](/backend/design-jobs)
- [Billing & Tokens](/backend/billing-tokens)
- [Assets & Object Storage](/backend/assets-storage)
- [Reports](/backend/reports)
