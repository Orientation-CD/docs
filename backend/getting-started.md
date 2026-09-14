# Getting Started

This page gets a brand-new developer from zero to a running backend on their
machine. It assumes you have never seen the codebase before. By the end you
will have the API, the two ARQ workers, PostgreSQL, Redis, object storage, and
the bundled mock providers all running, and you will know how to create your
first authenticated request.

The canonical source for every setting below is `.env.example` and the
`Settings` class in `app/config.py`. If a value on this page ever disagrees
with those files, the files win.

## Prerequisites

| Tool | Why | Typical version |
| --- | --- | --- |
| Docker + Docker Compose | runs PostgreSQL, Redis, MinIO, mock providers | recent |
| Python 3.12 | runs the API and workers locally (optional, if not using Compose) | 3.12.x |
| `uv` or `pip` | installs Python dependencies | recent |

The fastest local path is **Docker Compose**, because it starts every external
dependency (database, cache, storage, and the mock WeChat/payment/image
servers) in one command.

## 1. Clone and enter the repo

```bash
git clone <your-fork-or-upstream-url> YuanZhu-AI
cd YuanZhu-AI
```

## 2. Create your local environment file

Copy the example and edit the values you need:

```bash
cp .env.example .env
```

The example is already tuned for local development. The lines that matter most
on first run:

```dotenv
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://floorplan:floorplan@db:5432/floorplan
REDIS_URL=redis://redis:6379/0

# Used to sign access/refresh JWTs. Change this to any long random string.
JWT_SECRET=replace-with-at-least-32-random-bytes

# Admin website login (/admin).
ADMIN_PHONE=+8613800000000
ADMIN_PASSWORD=replace-with-a-strong-admin-password

# Bundled mock provider is the default until you save a real one in the admin UI.
PROVIDER_ADAPTER=mock_async
PROVIDER_BASE_URL=http://mock-image-provider:8082
MOCK_IMAGE_PROVIDER_CONTROLS_ENABLED=true

# Storage. Local Compose uses an isolated MinIO overlay.
STORAGE_BACKEND=s3

# WeChat / payment run against bundled mocks locally.
WECHAT_PAY_MODE=mock
MOCK_PAYMENT_ENDPOINTS_ENABLED=true
MOCK_WECHAT_IDENTITY_ENDPOINTS_ENABLED=true
```

::: warning Never commit real secrets
Do not put a real WeChat AppSecret, WeChat Pay merchant private key, Aliyun
AccessKey, or production JWT secret in `.env` that is tracked by git. Real
secrets live outside the repo (the deploy scripts expect them under paths like
`~/.config/yuanzhuai/wechat-pay/`). In docs and examples we always write
`<your-app-secret>` or `********`.
:::

## 3. Start the stack with Docker Compose

`docker-compose.yml` defines these services:

| Service | Image / command | Port |
| --- | --- | --- |
| `db` | `postgres:16` | 5432 |
| `redis` | `redis:7` | 6379 |
| `api` | `uvicorn app.main:app` | 8000 |
| `submit-worker` | ARQ worker on the `submit_provider_job` queue | — |
| `poll-worker` | ARQ worker on the `poll_provider_job` queue | — |
| `mock-wechat-identity-provider` | local WeChat `code2session` mock | 8083 |
| `mock-payment-provider` | local WeChat Pay mock | 8081 |
| `mock-image-provider` | local image-generation mock | 8082 |
| `cloudflared` | optional tunnel for WeChat callbacks | — |

Start it:

```bash
docker compose up --build
```

On first boot the API runs its startup lifespan (see `app/main.py`), which:

- connects to PostgreSQL and Redis;
- creates the schema or applies Alembic migrations depending on
  `DATABASE_AUTO_CREATE`;
- seeds idempotent defaults (demo billing catalog when
  `SEED_DEMO_BILLING_CATALOG=true`, built-in design-job types, report prompt
  templates, the voice-summary template, provider bootstrap fallback).

## 4. Smoke-test the API

Health checks are unauthenticated:

```bash
curl http://localhost:8000/health/live
curl http://localhost:8000/health/ready
```

- `/health/live` — process is up (cheap liveness probe).
- `/health/ready` — process can reach PostgreSQL **and** Redis (readiness probe).

The interactive OpenAPI playground is served by FastAPI:

```
http://localhost:8000/docs          # Swagger UI
http://localhost:8000/openapi.json # raw schema
```

See [OpenAPI](/reference/openapi) for what is and isn't published there.

## 5. Running API + workers without Docker (optional)

If you prefer to run Python directly (e.g. for a debugger), start the
dependencies first, then the app processes in separate terminals:

```bash
# 1. Install dependencies
uv sync            # or: pip install -e .

# 2. Postgres + Redis (the Compose service names resolve via the Compose network;
#    if you run host-side, point DATABASE_URL/REDIS_URL at localhost)

# 3. Apply / create schema
uv run alembic upgrade head

# 4. API (one terminal)
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 5. Submit worker (another terminal)
python -m arq app.worker.SubmitWorkerSettings

# 6. Poll worker (third terminal)
python -m arq app.worker.PollWorkerSettings
```

The two worker classes live in `app/worker.py`. They deliberately claim
**different queues** (`submit_provider_job` vs `poll_provider_job`) and
different function sets, so you can scale them independently.

## 6. Your first authenticated call

There is no username/password signup in the Mini Program flow. Authentication
is WeChat-first. Locally, the bundled `mock-wechat-identity-provider` accepts
any login code and returns a fake OpenID, so you can exercise the whole flow:

1. `POST /v1/auth/wechat-login` with a `{ "code": "<any-code>" }` body.
   The server exchanges the code with WeChat (or its local mock) for an
   `openid`, upserts/creates the `User`, and returns an **access token** plus a
   **refresh token**.
2. Call any protected endpoint with the bearer token:

```bash
curl http://localhost:8000/v1/me \
  -H "Authorization: Bearer <access_token>"
```

3. When the access token (default `ACCESS_TOKEN_SECONDS=900`, i.e. 15 minutes)
   expires, call `POST /v1/auth/refresh` with the refresh token to rotate.

Password login (`/v1/auth/login`) exists for accounts that set a phone +
password; see [Authentication](/backend/authentication).

## 7. Open the admin website

Point a browser at:

```
http://localhost:8000/admin
```

Log in with the `ADMIN_PHONE` / `ADMIN_PASSWORD` from your `.env`. The admin
site is where you manage the multi-provider model catalog, prompt templates,
billing catalog, users, and performance dashboards. It uses a signed browser
session + CSRF token, not a bearer JWT; see
[Authentication](/backend/authentication#admin-sessions-and-csrf).

## Where to go next

- [Architecture & Components](/backend/architecture) — what every module does
  and how a request flows through them.
- [Configuration](/reference/configuration) — every environment variable,
  grouped, with defaults and whether it is required.
- [REST API](/reference/rest-api) — the complete route table.
- [Data Model](/reference/data-model) — every SQLAlchemy table.
