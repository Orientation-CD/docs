# Backend Getting Started

This page shows you how to run the backend on your own machine, including the
different local stack flavors, tests, and common day-to-day commands.

## Prerequisites

- **Docker + Docker Compose** (the stack runs in containers).
- **Git**.
- Python 3.12 is only needed if you want to run tests directly (outside the
  E2E containers) or develop the deploy tooling.

## The launcher

The repository's `scripts/create_stack.sh` is the main entry point. It brings
up one retained local server stack from `docker-compose.yml` with:
PostgreSQL, Redis, MinIO, migrations, the API, both workers, and (depending on
flavor) mock providers.

```bash
cd YuanZhu-AI

# Prepare the .env (Compose reads shared settings from it)
cp .env.example .env

# Default: port 9090, mock WeChat, MinIO storage
./scripts/create_stack.sh
```

### Stack flavors

```bash
# Explicit flavor and port (valid API ports: 1024–22527)
./scripts/create_stack.sh --port 8080 --wechat mock --storage minio --secret .env
./scripts/create_stack.sh --port 8080 --wechat real --storage minio --secret .env
./scripts/create_stack.sh --port 8080 --wechat mock --storage oss --secret .env
```

- **`--wechat mock`** → mock WeChat identity + payment providers (no real
  credentials). This is the default and what you want for most local work.
- **`--wechat real`** → requires `WECHAT_APP_ID` / `WECHAT_MINI_PROGRAM_APP_SECRET`
  in `.env`; talks to real WeChat for login.
- **`--storage minio`** → local MinIO (default).
- **`--storage oss`** → real Aliyun OSS (requires `S3_BUCKET`, `S3_REGION`,
  `S3_PRESIGN_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` in `.env`; the bucket
  must have versioning + CORS).

All launchers **preserve named volumes** — recreating a stack never wipes your
database or object buckets. Use a distinct `--port` (or `--project`) for
independent stacks.

## Verify it works

```bash
curl http://localhost:9090/health/ready
# {"status":"ready"}
```

The API also exposes an interactive OpenAPI UI at `http://localhost:9090/docs`
(FastAPI's built-in Swagger UI) — a great way to explore every endpoint.

## Watch the workers

```bash
docker compose logs -f api submit-worker poll-worker
```

You should see job tasks being submitted and polled whenever a design job runs.

## Smoke & E2E tests

The repo ships two live test modes that create/recreate a stack and then run
against it:

```bash
# Smoke paths (real API -> Redis -> workers -> provider)
./scripts/run_smoke_tests.sh

# E2E user/admin actors (needs cloud config for admin setup, see runbook)
./scripts/run_e2e_tests.sh
```

For containerized smoke tests there is also:

```bash
docker compose --profile smoke up --build
```

See `scripts/runbook.md` in the repo for the complete local/live-test runbook
(including cloud-mode configuration).

## Running the API outside Compose (optional)

If you prefer to run uvicorn directly (e.g. with a debugger), point the env at
the Compose services:

```bash
export DATABASE_URL=postgresql+asyncpg://floorplan:floorplan@localhost:5432/floorplan
export REDIS_URL=redis://localhost:6379/0
export STORAGE_BACKEND=s3
export S3_ENDPOINT=http://localhost:9000
export S3_PRESIGN_ENDPOINT=http://localhost:9000
# ... plus the mock provider / WeChat settings from .env.example
uvicorn app.main:app --reload --port 9090
```

## Common tasks

| Task | Command |
| --- | --- |
| Recreate the stack | `./scripts/create_stack.sh` (same port) |
| Tear down a stack | `docker compose -p yuanzhu-<port> down` (volumes preserved) |
| Run migrations manually | `docker compose run --rm migrate` |
| View API logs | `docker compose logs -f api` |
| Inspect the database | `docker compose exec db psql -U floorplan -d floorplan` |
| Inspect Redis | `docker compose exec redis redis-cli` |
| Browse MinIO files | open the MinIO console port (printed by the launcher) |

## Next steps

- [Architecture & Components](/backend/architecture) — how everything fits.
- [Design Jobs](/backend/design-jobs) — the core pipeline to try next.
- [Deploy → Local Development Stack](/deploy/local-stack) — deeper Compose
  details.
