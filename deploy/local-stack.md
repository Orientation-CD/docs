# Local Development Stack

The backend repository (`YuanZhu-AI`) ships one Docker Compose file (`docker-compose.yml`)
that describes the *entire* local topology — database, cache, object storage, the API,
both ARQ workers, and three fake external services (WeChat identity, WeChat Pay, and the
AI image provider). You almost never invoke `docker compose` directly; instead you use
the launcher `scripts/create_stack.sh`, which derives collision-free ports, wires
secrets, and waits for health.

This page explains every service, port, and environment variable so you can run, debug,
and extend the local environment with confidence.

## Prerequisites

- Docker Desktop with the Compose plugin.
- A Python 3.12 virtualenv at `.venv/` (the launcher uses `.venv/bin/python` to parse
  your `.env`; it falls back to `python3`).
- A copy of `.env` (copy from `.env.example`). The launcher refuses to start without it.

## Quick start

From the repository root:

```bash
cp .env.example .env
./scripts/create_stack.sh
```

With no arguments this starts the **default stack**: API on host port `9090`, mock
WeChat, mock payment, mock image provider, and local MinIO object storage. When it
finishes it prints the API URL, the browser-visible LAN API URL, and the browser asset
endpoint, then runs `docker compose exec api alembic current` so you can confirm the
schema version.

## Compose services — full inventory

Every service name below is the exact name used in `docker-compose.yml`. The runtime
services build the same project image (`Dockerfile`, stage `runtime`); the test runners
build the `e2e` stage.

| Service (container) | Image / target | Role | In-container port | Host port |
| --- | --- | --- | --- | --- |
| `db` | `postgres:16-alpine` | PostgreSQL 16, named volume `postgres-data` | 5432 | internal only |
| `redis` | `redis:7-alpine` | Redis 7, AOF enabled, named volume `redis-data` | 6379 | internal only |
| `minio` | `quay.io/minio/minio` | S3-compatible storage (profile `minio`) | 9000 / 9001 | derived band (see below) |
| `minio-init` | `quay.io/minio/mc` | Creates buckets, enables versioning, seeds mock image | — | — |
| `migrate` | project `runtime` | Runs `alembic upgrade head`, then exits | — | — |
| `mock-image-provider` | project `runtime` | Fakes the AI provider (`app.mock_image_server`) | 8082 | internal only |
| `mock-payment-provider` | project `runtime` | Fakes WeChat Pay (`app.mock_payment_server`) | 8081 | internal only |
| `mock-wechat-identity-provider` | project `runtime` | Fakes WeChat login (`app.mock_wechat_identity_server`) | 8083 | internal only |
| `api` | project `runtime` | FastAPI / uvicorn (6 workers) | 9090 | `${API_PORT:-9090}` |
| `submit-worker` | project `runtime` | ARQ, `app.worker.SubmitWorkerSettings` | — | — |
| `poll-worker` | project `runtime` | ARQ, `app.worker.PollWorkerSettings` | — | — |
| `cloudflared-named` | `cloudflare/cloudflared` | Named Cloudflare tunnel (profile `real-wechat-named`) | — | — |
| `cloudflared-quick` | `cloudflare/cloudflared` | Quick Cloudflare tunnel (profile `real-wechat-quick`) | — | — |
| `smoke` | project `e2e` | Runs `pytest smoke_tests -m smoke` (profile `smoke`) | — | — |
| `e2e-admin` | project `e2e` | E2E admin actor (profile `e2e`) | — | — |
| `e2e-user` | project `e2e` | E2E user actor (profile `e2e`) | — | — |

### Profiles

Services are gated by Compose profiles so a plain `docker compose up` starts only the
minimum needed to develop:

| Profile | Pulled in by | Services it adds |
| --- | --- | --- |
| (default) | `create_stack.sh` | `db`, `redis`, `migrate`, `mock-image-provider`, `api`, `submit-worker`, `poll-worker` |
| `minio` | `--storage minio` | `minio`, `minio-init` |
| `mock-wechat` | `--wechat mock` | `mock-payment-provider`, `mock-wechat-identity-provider` |
| `real-wechat-named` | `--wechat real --tunnel named` | `cloudflared-named` |
| `real-wechat-quick` | `--wechat real --tunnel quick` | `cloudflared-quick` |
| `smoke` | manual / CI | `smoke` |
| `e2e` | CI / endurance | `e2e-admin`, `e2e-user` |

## Parallel development sessions (user-selected ports)

The launcher derives every published port from **one API port** you choose. This is what
lets several developers (or several stacks on one machine) run side-by-side without
collisions.

```bash
# Developer A uses the default
./scripts/create_stack.sh --port 9090

# Developer B picks a different API port
./scripts/create_stack.sh --port 9100
```

The API port must be between `1024` and `22527`. The MinIO ports are computed by
`scripts/stack_ports.py` into three non-overlapping port bands
(`(65535 - 1024 + 1) / 3 = 21504` wide):

| API port | MinIO API port | MinIO console port | Compose project name |
| --- | --- | --- | --- |
| `9090` (default) | `30594` | `52098` | `yuanzhu-9090` |
| `9100` | `30604` | `52108` | `yuanzhu-9100` |
| `1024` | `22528` | `43056` | `yuanzhu-1024` |

Rules enforced by the launcher:

- The Compose project defaults to `yuanzhu-<API_PORT>` (override with `--project`).
- If the API port is already published by a **different** YuanZhu stack from this repo,
  the old stack is removed (its named volumes are preserved).
- If the port is owned by an **unrelated** container or a host process, the launcher
  stops and asks you to free it or pick another port — it never kills foreign processes.
- Derived MinIO ports that collide with another stack cause a hard failure; ports are
  never reassigned dynamically.

## The launcher (`scripts/create_stack.sh`)

```text
./scripts/create_stack.sh [options]

  --port PORT        Host/API port (default: 9090, range 1024-22527)
  --ip HOST          Browser-visible host; auto-detect LAN IPv4 when omitted
  --wechat mock|real WeChat identity mode (default: mock)
  --tunnel named|quick  Public callback tunnel for real WeChat (default: named)
  --storage minio|oss   Object storage mode (default: minio)
  --secret FILE      Dotenv file (default: .env)
  --project NAME     Compose project (default: yuanzhu-PORT)
```

What it does, in order:

1. Validates flags and that `--secret` exists.
2. Auto-detects the LAN IPv4 (unless `--ip` is given) so `S3_PRESIGN_ENDPOINT` and
   `PUBLIC_API_BASE_URL` are browser-reachable.
3. Derives MinIO ports via `scripts/stack_ports.py` and checks them for collisions.
4. Removes conflicting YuanZhu stacks from this repo (volumes retained).
5. Brings up MinIO (if selected), waits for it healthy, then runs `minio-init`.
6. Starts the mock WeChat/payment servers in `mock` mode.
7. Force-recreates `db`, `redis`, `migrate`, `mock-image-provider`, `api`,
   `submit-worker`, `poll-worker`.
8. Polls `http://127.0.0.1:<port>/health/ready` until ready (up to
   `STACK_READY_TIMEOUT_SECONDS`, default 300 s).
9. In `real` mode, brings up the Cloudflare tunnel and probes the WeChat Pay callback
   until it returns the expected `401`.

## WeChat and storage modes

| Mode | Required keys in `.env` |
| --- | --- |
| `--wechat mock` | none (uses built-in mock credentials) |
| `--wechat real` | `WECHAT_APP_ID`, `WECHAT_MINI_PROGRAM_APP_SECRET`, `WECHAT_PAY_MERCHANT_ID`, `WECHAT_PAY_API_V3_KEY`, `WECHAT_PAY_MERCHANT_SERIAL`, `WECHAT_PAY_MERCHANT_PRIVATE_KEY_FILE`, `WECHAT_PAY_PUBLIC_KEY_ID`, `WECHAT_PAY_PUBLIC_KEY_FILE`; for `--tunnel named` also `WECHAT_PAYMENT_NOTIFY_URL`, `CLOUDFLARE_TUNNEL_TOKEN` |
| `--storage minio` | none (local MinIO defaults) |
| `--storage oss` | `S3_BUCKET`, `S3_REGION`, `S3_PRESIGN_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, optionally `S3_SIGNATURE_VERSION` |

For `--storage oss`, `S3_PRESIGN_ENDPOINT` must be browser-reachable and must **not**
contain `-internal.aliyuncs.com` (a local machine cannot reach VPC-only endpoints). The
OSS bucket needs versioning enabled and CORS allowing the LAN frontend origin. Use
`S3_SIGNATURE_VERSION=s3` for the Aliyun OSS compatibility endpoint.

## Key environment variables

The Compose file shares settings through the `x-app-environment` YAML anchor. These are
the variables you will actually touch (full list in `.env.example`):

| Variable | Default in Compose | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://floorplan:floorplan@db:5432/floorplan` | Async SQLAlchemy DB URL |
| `REDIS_URL` | `redis://redis:6379/0` | ARQ queue + cache |
| `PUBLIC_API_BASE_URL` | `http://<client-host>:<port>` | Public API origin the browser uses |
| `ENVIRONMENT` | `development` | App environment (cloud sets this per namespace) |
| `STORAGE_BACKEND` | `s3` | `local` or `s3` |
| `S3_BUCKET` | `backend` | Object bucket |
| `S3_ENDPOINT` | `http://minio:9000` | Server-side S3 endpoint |
| `S3_PRESIGN_ENDPOINT` | `http://<client-host>:<minio-port>` | Browser-facing presign endpoint |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `admin` / `password` | MinIO credentials |
| `S3_SIGNATURE_VERSION` | `s3v4` | MinIO; use `s3` for Aliyun OSS |
| `WECHAT_PAY_MODE` | `mock` | `mock` / `live` / `disabled` |
| `WECHAT_CODE_TO_SESSION_URL` | `http://mock-wechat-identity-provider:8083/sns/jscode2session` | `jscode2session` exchange |
| `WECHAT_PHONE_NUMBER_URL` | `http://mock-wechat-identity-provider:8083/wxa/business/getuserphonenumber` | Phone code exchange |
| `PROVIDER_BASE_URL` | `http://mock-image-provider:8082` | Default image provider |
| `PROVIDER_ADAPTER` | `mock_async` | Adapter until an admin saves DB provider config |
| `INITIAL_USER_TOKENS` | `1000` | New-user starter balance |
| `INITIAL_USER_ALLOWED_WORKSPACES` | `2` | Personal + one owned enterprise |
| `REPORT_VIEW_TOKEN_SECONDS` | `30` (Compose) / `300` (example) | Report view-token TTL |

Secrets are mounted as Docker secrets rather than baked into the image:
`wechat_pay_merchant_private_key` and `wechat_pay_public_key` default to
`tests/resources/keys/mock_wechat_private_key.pem` and
`tests/resources/keys/mock_wechat_public_key.pem`. For `--wechat real`, set
`WECHAT_PAY_MERCHANT_PRIVATE_KEY_FILE` / `WECHAT_PAY_PUBLIC_KEY_FILE` to host paths and
the launcher mounts them read-only under `/run/secrets`.

## Health checks

| Endpoint | What it proves |
| --- | --- |
| `GET /health/live` | Process is up (no dependencies). |
| `GET /health/ready` | PostgreSQL reachable, Redis reachable, migrations applied, config loaded. The launcher waits on this. |

Container-level healthchecks back them: `pg_isready -U floorplan -d floorplan` for `db`,
`redis-cli ping` for `redis`, and an HTTP probe of `/health` for each mock server. The
`api` service `depends_on: migrate: service_completed_successfully`, so migrations
always finish before the API starts.

## Data persistence

- Named volumes `postgres-data`, `redis-data`, `minio-data` are **never purged** by the
  launcher. Recreating a stack on the same `--port` preserves its URLs and its data.
- Use a distinct `--port` (or `--project`) when you want two independent, disposable
  stacks.
- E2E / endurance runs (`profile: e2e`) run with `--volumes --remove-orphans` teardown
  and are self-cleaning.

## Stop or reset the local stack

Use `scripts/delete_stack.sh` from the backend repository root. This is the
companion cleanup workflow for [backend issue #539](https://github.com/Orientation-CD/YuanZhu-AI/issues/539);
your checkout must contain the script before using these commands.

```text
./scripts/delete_stack.sh --port PORT [--project NAME] [--volumes] [--dry-run]

  --port PORT       Required API port, range 1024–22527 (no default)
  --project NAME    Compose project name (default: yuanzhu-PORT)
  --volumes         Irreversibly remove the project's declared local named volumes
  --dry-run         List exact resources and data policy without changing anything
```

```bash
# Inspect the default port-8080 project
./scripts/delete_stack.sh --port 8080 --dry-run

# Stop/remove all project containers and networks, retaining volumes
./scripts/delete_stack.sh --port 8080

# Preview a complete reset, then delete the local data
./scripts/delete_stack.sh --port 8080 --volumes --dry-run
./scripts/delete_stack.sh --port 8080 --volumes

# Match a custom project name used at creation
./scripts/delete_stack.sh --port 8080 --project my-local-stack --dry-run
./scripts/delete_stack.sh --port 8080 --project my-local-stack
# Add --volumes to reset that custom project's local data as well
./scripts/delete_stack.sh --port 8080 --project my-local-stack --volumes
```

### Port selection and custom project names

`--port 8080` without `--project` selects `yuanzhu-8080`. It does **not**
discover the project that currently publishes port 8080. A stack created with
a custom project such as `yuanzhu-nine-clean-8080` requires that same name for
cleanup. Otherwise, an empty preview means the selected default project has
no resources, even when another project uses that port.

Find the actual project from Docker's Compose label:

```bash
docker ps --filter publish=8080 --format '{{.Names}}: {{.Label "com.docker.compose.project"}}'
# For stopped containers, include --all and list all Compose project labels:
docker ps --all --format '{{.Names}}: {{.Label "com.docker.compose.project"}}'

# Preview this custom project, then remove --dry-run after checking the target:
./scripts/delete_stack.sh --port 8080 --project yuanzhu-nine-clean-8080 --volumes --dry-run
```

Cleanup requires Docker with the Compose plugin, Git and Python 3 ≥ 3.10.
Unlike creation, it does not require the original `.env`, secret files or
WeChat/storage mode arguments. The script verifies ownership using the
containers' checkout labels: the current checkout or another existing Git
worktree of the same repository is accepted. Foreign or unverifiable
ownership and conflicting resource labels are rejected before deletion.
Do not create, replace or delete the same project concurrently.

By default, cleanup removes **all** selected project containers (including
stopped, orphan, mock, migration, initialization and local tunnel containers)
and Compose networks, while retaining named volumes. `--volumes` additionally
removes the project's declared local named volumes: `postgres-data`,
`redis-data`, `minio-data` and `smoke-coverage`. This **irreversibly deletes**
local PostgreSQL records, Redis data, MinIO objects and smoke coverage. It
also works for volumes retained after an earlier container cleanup.

`--dry-run` lists the exact selected resources and whether volumes will be
retained or deleted; it performs no mutation. Repeating cleanup for an absent
project succeeds. If Docker inspection or teardown fails, the script reports
failure; some resources may already have been removed. Inspect the remaining
resources, resolve the reported problem and retry the same explicit target.
Busy/shared volumes are not force-removed by deleting another project's containers.

Other projects, shared images, build caches, source files, `.env`, keys,
frontend dependencies and artifacts, and external networks/volumes are
preserved. External OSS objects and cloud/tunnel registrations are untouched;
removing a local tunnel container does not deregister its tunnel.

## Smoke and E2E runners

Two launcher scripts exercise a live stack:

```bash
./scripts/run_smoke_tests.sh      # smoke paths against the API
./scripts/run_e2e_tests.sh        # user/admin E2E actors
```

Both run in **local mode** (create a stack) or **cloud mode** (target an existing remote
stack, e.g. `--local localhost --port 6060`). In cloud mode they authenticate to the
existing cloud Admin site to sync prompt/billing config and report templates, then run
against the remote API. They never export provider credentials and refuse
`ENVIRONMENT=production`.

Before test traffic the runners replace disposable local configuration with a validated
JSON snapshot from cloud (prompt templates, job types, plans, packages, legal
documents) and install exactly `tests/resources/report_config.json` +
`tests/resources/report_template.html`. The importer requires
`--confirm-reset-local-config` and refuses production.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Port conflict on MinIO bands | Stop the other process or choose another `--port` |
| `/health/ready` returns 503 | `docker compose logs api`; confirm `migrate` completed; check PostgreSQL/Redis |
| Real WeChat tests need a public URL | Use `cloudflared-named` (token) or `cloudflared-quick` (auto URL) profiles |
| OSS uploads fail | Check CORS, bucket versioning, and that `S3_PRESIGN_ENDPOINT` is public |
| Two stacks fight over a port | Give each its own `--port`; project names are `yuanzhu-<port>` |

## Next steps

- [Cloud Architecture (Aliyun SAE)](/deploy/cloud-architecture) — how the same
  topology runs in production.
- [SAE Deployment Runbook](/deploy/sae-deployment) — step-by-step cloud deployment.
