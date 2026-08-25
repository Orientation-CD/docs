# Local Development Stack

The backend repository ships one Docker Compose topology with several launcher
entry points. This page explains the full picture so you can run, debug and
extend the local environment with confidence.

## Compose services

The `docker-compose.yml` defines (see [Backend Getting Started](/backend/getting-started)
for the quick commands):

| Service | Image | Role |
| --- | --- | --- |
| `db` | `postgres:16-alpine` | PostgreSQL 16 (named volume `postgres-data`) |
| `redis` | `redis:7-alpine` | Redis 7, append-only (named volume `redis-data`) |
| `minio` + `minio-init` | `quay.io/minio/...` | S3-compatible storage; creates buckets, enables versioning, seeds the mock provider image |
| `migrate` | project runtime image | Runs `alembic upgrade head`, then exits |
| `api` | project runtime image | FastAPI on the API port (default 9090) |
| `submit-worker` | project runtime image | ARQ submit worker |
| `poll-worker` | project runtime image | ARQ poll worker |
| `mock-image-provider` | project runtime image | Fakes the AI provider (`app/mock_image_server.py`) |
| `mock-payment-provider` | project runtime image | Fakes WeChat Pay (`app/mock_payment_server.py`) |
| `mock-wechat-identity-provider` | project runtime image | Fakes WeChat identity (`app/mock_wechat_identity_server.py`) |
| `cloudflared-*` | `cloudflare/cloudflared` | Optional public tunnels for real-WeChat testing |
| `smoke` / `e2e-*` | e2e image | Test runners (profiles) |

Mock providers are gated behind **profiles**:

- `minio` profile — MinIO + init.
- `mock-wechat` profile — mock payment + mock WeChat identity.
- `smoke` / `e2e` profiles — test runners.
- `real-wechat-named` / `real-wechat-quick` — Cloudflare tunnels.

## The launcher (`create_stack.sh`)

`scripts/create_stack.sh` is a thin orchestration over Compose that:

1. Validates the requested `--wechat` / `--storage` modes against `.env`.
2. Derives MinIO ports from the API port using **three non-overlapping port
   bands** (deterministic, collision-free mapping; e.g. API 8080 → MinIO API
   `29584` / console `51088`; API 9090 → `30594` / `52098`).
3. Removes any conflicting Compose project from the same repo (preserving named
   volumes) and refuses to touch unrelated containers.
4. Starts the stack and waits for health.

### Modes

| Mode | Required `.env` keys |
| --- | --- |
| `--wechat mock` | none (isolated mock credentials) |
| `--wechat real` | `WECHAT_APP_ID`, `WECHAT_MINI_PROGRAM_APP_SECRET` |
| `--storage minio` | none (local MinIO defaults) |
| `--storage oss` | `S3_BUCKET`, `S3_REGION`, `S3_PRESIGN_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` |

For OSS mode the bucket needs **versioning enabled** and CORS allowing the LAN
frontend origin; use the signature mode supported by the target
(`S3_SIGNATURE_VERSION=s3` for Aliyun OSS compatibility). The public
`S3_PRESIGN_ENDPOINT` must be reachable from the browser and must **not**
contain `-internal.aliyuncs.com`.

## Environment wiring

The Compose file uses `x-app-environment` anchors for shared settings. Key
defaults:

- `DATABASE_URL` → `postgresql+asyncpg://floorplan:floorplan@db:5432/floorplan`
- `REDIS_URL` → `redis://redis:6379/0`
- `PUBLIC_API_BASE_URL` → `http://localhost:9090`
- `STORAGE_BACKEND=s3`, `S3_ENDPOINT=http://minio:9000`,
  `S3_PRESIGN_ENDPOINT=http://localhost:9000`
- Mock WeChat/Pay endpoints enabled (`MOCK_WECHAT_IDENTITY_ENDPOINTS_ENABLED`,
  `MOCK_PAYMENT_ENDPOINTS_ENABLED`), `WECHAT_PAY_MODE=mock`.
- Secrets mounted from `tests/resources/keys/` mock merchant keys.

Secrets are passed via Docker **secrets** (`wechat_pay_merchant_private_key`,
`wechat_pay_public_key`) — see the `secrets:` block at the bottom of
`docker-compose.yml`.

## Data persistence

- Named volumes (`postgres-data`, `redis-data`, `minio-data`) are **never
  purged** by the launcher.
- Recreating the same stack (same `--port`) preserves both its URLs and its
  volumes.
- Use a distinct `--port` or `--project` when you need two independent stacks.

## Smoke & E2E

Two launcher scripts exercise the live stack:

```bash
./scripts/run_smoke_tests.sh      # smoke paths against the API
./scripts/run_e2e_tests.sh        # user/admin E2E actors
```

Both can run in **local mode** (create a stack) or **cloud mode** (use an
existing remote stack). They authenticate to the existing cloud Admin site to
sync prompt/billing config and report templates, then run against the local
stack. They **never** export provider credentials and refuse
`ENVIRONMENT=production`.

## Config sync for tests

Before test traffic, the runners replace disposable local configuration with a
validated JSON snapshot from cloud (prompt templates, job types, plans,
packages, legal documents) and install exactly
`tests/resources/report_config.json` + `tests/resources/report_template.html`.
The importer requires `--confirm-reset-local-config` and refuses production.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Port conflict on MinIO bands | Stop the other process or choose another API port |
| `curl /health/ready` fails | `docker compose logs api`; ensure `migrate` completed |
| Real WeChat tests need a public URL | Use `cloudflared-*` profiles with a tunnel token |
| OSS uploads fail | Check CORS, versioning, and that `S3_PRESIGN_ENDPOINT` is public |

## Next steps

- [Cloud Architecture (Aliyun SAE)](/deploy/cloud-architecture) — how the same
  topology runs in production.
- [Backend Getting Started](/backend/getting-started) — quick commands.
