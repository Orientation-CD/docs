# Backend Overview

The backend repository (`YuanZhu-AI`) is the **server-side brain** of the
product. It owns the REST API that the WeChat Mini Program talks to, runs the
asynchronous AI design-job pipeline, holds the token ledger and billing state,
authenticates users (WeChat + password), manages workspaces and enterprises,
and renders HTML design reports. This page explains what the backend is made of
and how the pieces fit together; deeper pages follow the links at the end.

If you are new to the project, read this page first, then
[Getting Started](/backend/getting-started) to run it locally.

## What the backend does

At a high level the backend answers four kinds of request:

1. **Interactive API calls** from the Mini Program — login, upload a floor
   plan, create a design job, poll its progress, read billing balance. These
   hit the FastAPI process under `/v1`.
2. **Background AI work** — actually calling an external model provider
   (Seedream, a mock provider, etc.), polling it until the image is ready,
   downloading the result, and settling the token charge. This runs in ARQ
   worker processes, never in the API request path.
3. **A server-rendered admin website** under `/admin` for operators: inspect
   users, design jobs, the multi-provider catalog, prompt templates, billing
   catalog, and performance dashboards.
4. **Periodic maintenance** — expiring subscriptions, anonymizing deactivated
   accounts, cleaning up stale temporary assets, reconciling report templates,
   and recording performance aggregates.

## Tech stack

| Concern | Technology |
| --- | --- |
| Language | Python 3.12 |
| Web framework | FastAPI (ASGI) |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic (`alembic/`) |
| Database | PostgreSQL 16 |
| Job queue / cache / coordination | Redis 7 (ARQ) |
| Object storage | S3-compatible (MinIO locally, Aliyun OSS in the cloud) |
| Async HTTP client | `httpx` |
| Data validation | Pydantic v2 (`BaseModel` + `pydantic-settings`) |
| Password hashing | `argon2-cffi` (Argon2id) |
| Tokens | PyJWT |
| Tests | `pytest` |

Dependencies are declared in `pyproject.toml`. The runtime command for the API
is `uvicorn app.main:app` (configured in `docker-compose.yml` and the SAE
deploy scripts).

## Repository layout

```
YuanZhu-AI/
├── app/                  # all backend source
│   ├── main.py           # FastAPI app factory, router wiring, lifespan
│   ├── config.py         # Settings (pydantic-settings), every env var
│   ├── database.py       # async engine/session, advisory locks
│   ├── db_models.py      # SQLAlchemy ORM models — the schema (~2660 lines)
│   ├── models.py         # Pydantic request/response contracts
│   ├── api.py            # main /api/v1 router (auth, users, design jobs, reports)
│   ├── asset_api.py      # /api/v1/assets/* routes
│   ├── billing_api.py    # /api/v1/billing/* and payment webhooks
│   ├── workspace_api.py  # /api/v1/workspaces/* and enterprise invitations
│   ├── referral_api.py   # /api/v1/referral-invitations/* and /rewards/*
│   ├── account_lifecycle_api.py  # deactivate / reactivate / admin user actions
│   ├── config_export.py  # /admin/config-export.json
│   ├── worker.py         # ARQ WorkerSettings (submit + poll workers)
│   ├── queue_names.py    # SUBMIT_JOB_QUEUE / POLL_JOB_QUEUE constants
│   ├── design_job.py     # the design-job pipeline (reserve → submit → poll → settle)
│   ├── providers/        # provider adapters (base, seedream, doubao_text, ...)
│   ├── provider_configuration.py  # DB-backed provider + model catalog
│   ├── billing.py        # token ledger, reservations, payment orders
│   ├── wechat_pay.py     # WeChat Pay JSAPI + notify verification
│   ├── auth.py           # get_current_user dependency, JWT issue/decode
│   ├── wechat_auth.py    # WeChat code2session + phone-number exchange
│   ├── assets.py / asset_*.py / storage.py  # asset & object storage lifecycle
│   ├── report_*.py       # report config, discovery, library, render, view
│   ├── workspaces.py / workspace_api.py  # personal + enterprise workspaces
│   ├── prompt_templates.py  # admin-managed prompts with variables/options
│   ├── campaign_configuration.py  # runtime campaign token amounts
│   ├── summary_catalog.py / summary_prompt.py  # recording summaries (#208)
│   ├── entitlements.py / subscription_entitlements.py
│   ├── referral_*.py     # referral invitations, rewards, outbox
│   ├── performance.py / overview.py  # metrics, slow-request traces, bottlenecks
│   ├── http_safety.py    # request-id, metrics middleware, error normalization
│   ├── rate_limit.py     # Redis-backed sliding-window rate limits
│   ├── maintenance_jobs.py  # periodic ARQ tasks
│   └── admin.py          # server-rendered FastHTML/Jinja admin site
├── alembic/              # migrations
├── tests/                # pytest suite (unit + E2E + smoke)
├── docker-compose.yml    # local stack: db, redis, api, workers, mock providers
├── .env.example          # the canonical environment-variable list
└── pyproject.toml
```

## Runtime topology

A deployed backend is built from **one immutable image** and runs as several
processes. They share the same code but are launched with different
`ARQ_*_WORKER_QUEUES` / uvicorn entrypoints:

```
                 ┌──────────────────────────────┐
   WeChat Mini ─► │  FastAPI API (uvicorn)       │  /api/v1/*  /admin/*
   Program        │  - auth, validation, writes │  /openapi.json /metrics
                 └───────┬───────────────┬──────┘
                         │ enqueue        │ read/write
                         ▼               ▼
                 ┌──────────────┐   ┌──────────────┐
                 │ Redis (ARQ)  │   │ PostgreSQL 16 │  system of record
                 │ queue+cache  │   └──────────────┘
                 └──┬───────┬───┘
        dequeue ▼           ▼ dequeue
   ┌─────────────────┐  ┌─────────────────┐
   │ Submit worker    │  │ Poll worker      │
   │ submit_provider_ │  │ poll_provider_   │
   │ job queue        │  │ job queue        │
   └────────┬─────────┘  └────────┬────────┘
            │ HTTPS              │ HTTPS + S3
            ▼                     ▼
   ┌─────────────────┐   ┌──────────────────────┐
   │ AI provider     │   │ Object storage (S3)  │
   │ (Seedream/...) │   │ floorplans, images,  │
   └─────────────────┘   │ report assets        │
                         └──────────────────────┘
```

- **API** (`app.main:app`, uvicorn) only does short, durable work: validate,
  authenticate, write a row, and enqueue a task. It never blocks on an AI
  provider call.
- **Submit worker** consumes the `submit_provider_job` queue. It composes the
  provider request from the stored prompt selection + staged asset keys, calls
  the provider, records the `provider_job_id`, and enqueues a poll task.
- **Poll worker** consumes the `poll_provider_job` queue. It polls the
  provider until completion, downloads the result into object storage, persists
  result metadata, **settles the token charge**, and marks the job complete.
- **PostgreSQL** is the single source of truth. **Redis** is the queue,
  rate-limit counters, admin sessions, and short-lived caches. **Object
  storage** (S3-compatible) holds every binary: uploaded floor plans, provider
  outputs, and report assets.

The two queue names are fixed constants in `app/queue_names.py`:

```python
SUBMIT_JOB_QUEUE = "submit_provider_job"
POLL_JOB_QUEUE = "poll_provider_job"
```

The worker process roles are configured in `app/worker.py` as
`SubmitWorkerSettings` and `PollWorkerSettings`, each listing the exact
functions it claims.

## How the components communicate

| Hop | Mechanism |
| --- | --- |
| Mini program → API | HTTPS REST under `/api/v1`, `Authorization: Bearer <jwt>` |
| API → workers | Redis ARQ queues (no direct worker HTTP) |
| Workers → AI provider | HTTPS via `httpx` (`app/providers/http_transport.py`) |
| API / workers ↔ DB | async SQLAlchemy over `DATABASE_URL` |
| API / workers ↔ cache | async Redis client over `REDIS_URL` |
| API / workers → storage | S3 SDK (boto3-style presign + get/put/delete) |
| Mini program → storage | direct **presigned** upload (bypasses the API) |
| WeChat Pay → API | server-to-server notify webhook (`/api/v1/billing/wechat/notify`) |

## Data ownership summary

| Data | Where it lives |
| --- | --- |
| Users, auth sessions, workspaces, enterprises, memberships | PostgreSQL |
| Design jobs, submissions, progress, result metadata | PostgreSQL |
| Token ledger entries, payment orders, subscriptions, token packages | PostgreSQL |
| Provider connections, model configs, model catalog, prompt templates | PostgreSQL |
| Report configs, report records, report items | PostgreSQL |
| Referral campaigns, rewards, outbox events | PostgreSQL |
| Floor-plan bytes, rendered images, report assets | Object storage (S3) |
| Job queue, rate-limit counters, admin sessions, progress snapshots | Redis |

## Read next

- [Getting Started](/backend/getting-started) — run the whole stack locally.
- [Architecture & Components](/backend/architecture) — modules, request flow,
  worker topology in depth.
- [Design Jobs](/backend/design-jobs) — the reserve → submit → poll → settle
  pipeline and the multi-provider catalog.
- [Authentication](/backend/authentication) — WeChat login, JWT, admin
  sessions, CSRF.
