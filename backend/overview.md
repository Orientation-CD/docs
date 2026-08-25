# Backend Overview

The backend repository (`YuanZhu-AI`) is the **server-side brain** of the
product. It exposes the REST API the mini program talks to, runs the
asynchronous AI job pipeline, owns billing and authentication, and renders
reports. This section is a deep dive into its architecture and every major
module.

## Tech stack

| Concern | Technology |
| --- | --- |
| Language | Python 3.12 |
| Web framework | FastAPI (ASGI) |
| ORM / migrations | SQLAlchemy 2.0 (async) + Alembic |
| Database | PostgreSQL 16 |
| Job queue | ARQ (Redis-backed) |
| Cache / coordination / rate-limit | Redis 7 |
| Object storage | S3-compatible (MinIO local, Aliyun OSS production) |
| HTTP client | httpx |
| Validation | Pydantic v2 |
| Tests | pytest + dedicated E2E/smoke suites |

## Module map

The application lives in `app/`. The most important modules:

| Module | Responsibility |
| --- | --- |
| `main.py` | App entrypoint, router wiring, lifecycle, startup |
| `config.py` | Settings (pydantic-settings), all env vars |
| `database.py` | Async SQLAlchemy engine/session |
| `db_models.py` | SQLAlchemy ORM models (the database schema) |
| `models.py` | Pydantic request/response models (API contracts) |
| `api.py` | Main REST API: auth, users, legal docs, prompt templates, design jobs, reports |
| `auth.py` | Current-user dependency, JWT issuing/decoding |
| `wechat_auth.py` | WeChat `code2session` + phone-number exchange |
| `design_job.py` | The core design-job pipeline (create, reserve, submit, poll, settle) |
| `worker.py` | ARQ worker settings and job functions |
| `billing.py` | Token ledger, reservations, settlements, payment orders |
| `billing_api.py` | Billing/subscription/token REST endpoints |
| `wechat_pay.py` | WeChat Pay JSAPI + payment notify verification |
| `assets.py` / `asset_api.py` / `asset_completion.py` | Asset lifecycle (upload intents, direct upload, completion) |
| `storage.py` | Object-storage abstraction (S3/MinIO/OSS) |
| `workspaces.py` / `workspace_api.py` | Personal/enterprise workspaces, memberships, invitations |
| `share_invitations.py` | Enterprise invitations |
| `account_lifecycle_api.py` | Account deactivation / removal |
| `report_*.py` | Report system (config, templates, library, rendering, view tokens) |
| `prompt_templates.py` | Prompt templates for AI requests |
| `provider_configuration.py` | Provider registry (Seedream etc.) |
| `admin.py` | Admin website (FastAPI HTML app) |
| `maintenance_jobs.py` | Periodic jobs (cleanup, reconciliation, expiry) |
| `rate_limit.py` | Redis-backed rate limiting |
| `performance.py` | Metrics, slow-request tracing |
| `mock_*_server.py` | Mock WeChat identity / payment / image providers for local dev |

## Runtime topology

A deployed backend consists of **one API process + two worker processes**
(plus, in cloud test, mock providers), all built from the **same immutable
image**:

```
          ┌──────────────┐   enqueue   ┌─────────────────┐
Mini app ─►│  FastAPI API │────────────►│ Redis (ARQ queue)│
          │  (uvicorn)   │             └───┬─────────────┘
          └──────┬───────┘                 │
                 │ read/write              │ dequeue
          ┌──────▼───────┐        ┌────────▼─────────┐   submit   ┌───────────────┐
          │ PostgreSQL   │        │ Submit worker    │───────────►│ AI Provider    │
          │ (durable)    │        └──────────────────┘            │ (Seedream...) │
          └──────────────┘                                         └───────────────┘
                                 ┌──────────────────┐   poll
                                 │ Poll worker      │◄────────────┤
                                 └──────────────────┘   result    ▼
                                                        ┌──────────────────┐
                                                        │ Object storage   │
                                                        │ (images, reports)│
                                                        └──────────────────┘
```

- **API** handles HTTP: validation, auth, durable writes, and enqueueing work.
- **Submit worker** performs outbound AI calls (submit).
- **Poll worker** polls provider status and persists results.
- **PostgreSQL** is the system of record; **Redis** is the queue + coordination;
  **object storage** holds all binary assets.

## How the pieces communicate

| Hop | Mechanism |
| --- | --- |
| Mini program → API | HTTPS REST (`/api/v1`, Bearer JWT) |
| API → workers | Redis ARQ queue (no direct worker HTTP) |
| Workers → AI provider | HTTPS provider API |
| Workers ↔ DB / Redis | SQLAlchemy async / Redis client |
| Workers → storage | S3 API (download provider result, upload) |
| API → storage | S3 presigning + reads |
| WeChat → API | payment notify webhook (server-to-server) |
| Mini program → storage | direct presigned upload (bypasses API) |

## What each worker does (in one paragraph)

- **Submit worker** (`app.worker.SubmitWorkerSettings`) consumes
  `submit_provider_job` tasks. For each reserved design job it composes the
  provider request from the stored prompt selection + staged asset keys, calls
  the provider, stores the `provider_job_id`, and enqueues a poll task.
- **Poll worker** (`app.worker.PollWorkerSettings`) consumes
  `poll_provider_job` tasks. It polls the provider until completion, downloads
  the result into object storage, persists the design-job result metadata,
  **settles tokens**, and marks the job complete. Failed jobs are recorded with
  an error code.

See [Design Jobs](/backend/design-jobs) for the full pipeline.

## Data ownership summary

| Data | Stored in |
| --- | --- |
| Users, sessions, workspaces, memberships | PostgreSQL |
| Design jobs, status, progress, results metadata | PostgreSQL |
| Token ledger, orders, subscriptions | PostgreSQL |
| Report configs / templates / assets metadata | PostgreSQL |
| Prompt templates / provider config / legal docs | PostgreSQL |
| Photos, renderings, report assets (bytes) | Object storage |
| Job queue, rate-limit counters, progress snapshots, cache | Redis |

## Next steps

- [Getting Started](/backend/getting-started) — run it locally.
- [Architecture & Components](/backend/architecture) — deeper dive into the
  runtime and module interactions.
- [Design Jobs](/backend/design-jobs) — the core pipeline.
- [Authentication](/backend/authentication) — how logins and tokens work.
