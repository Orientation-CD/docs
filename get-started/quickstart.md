# Quick Start

This guide gets the **entire stack running on your own machine** in a few
minutes, with **zero backend infrastructure** of your own. You will run:

1. The **backend local stack** (PostgreSQL, Redis, MinIO, API, workers, mock
   WeChat / payment / image providers) with Docker Compose.
2. The **mini program frontend** and open it in WeChat DevTools.

::: tip Why mock mode first?
The local stack ships with a **mock WeChat identity provider**, a **mock
payment provider** and a **mock AI image provider**. This lets you exercise the
whole flow — login, submit a design job, watch the workers run, get a result —
**without any real credentials or model costs**.
:::

## 1. Prerequisites

Install these tools first:

| Tool | Why you need it | Check it works |
| --- | --- | --- |
| **Git** | Clone the repositories | `git --version` |
| **Docker + Docker Compose** | Run the backend stack | `docker compose version` |
| **Node.js ≥ 18** | Run the frontend toolchain | `node --version` |
| **pnpm** | Frontend package manager | `pnpm --version` |
| **WeChat DevTools** | Open / preview the mini program | WeChat Developer Tools desktop app |

::: tip macOS note
On macOS the backend deploy scripts require **Bash 4+** (the system `/bin/bash`
is 3.2). For local development with `create_stack.sh` a normal shell is fine;
only the SAE deploy scripts need Bash 4. See
[SAE Deployment Runbook](/deploy/sae-deployment) for details.
:::

## 2. Get the code

Clone the two application repositories. This documentation assumes a
`~/MyPrj/zyz` working directory; use whatever you prefer.

```bash
# Backend — use the main branch
git clone -b main https://github.com/Orientation-CD/YuanZhu-AI.git

# Frontend — use the ui-integration branch
git clone -b ui-integration https://github.com/Orientation-CD/wechat_mini_program.git
```

## 3. Start the backend local stack

The backend repository contains a launcher script that brings up a complete
local stack. From the backend repo root:

```bash
cd YuanZhu-AI

# Prepare the .env file (Compose reads shared settings from it)
cp .env.example .env

# Create the default stack: port 9090, mock WeChat, MinIO storage
./scripts/create_stack.sh
```

The script prints the published endpoints. On the default settings you get:

- **API**: `http://localhost:9090`
- **MinIO API / console**: derived from the API port
- **PostgreSQL**: `postgresql://floorplan:floorplan@localhost:5432/floorplan`
- **Redis**: `redis://localhost:6379/0`

The stack includes:

| Service | Role |
| --- | --- |
| `db` | PostgreSQL 16 |
| `redis` | Redis 7 |
| `minio` / `minio-init` | S3-compatible object storage |
| `migrate` | Runs Alembic migrations, then exits |
| `api` | FastAPI service on port 9090 |
| `submit-worker` | ARQ submit worker |
| `poll-worker` | ARQ poll worker |
| `mock-wechat-identity-provider` | Fakes WeChat `code2session` / phone |
| `mock-payment-provider` | Fakes WeChat Pay |
| `mock-image-provider` | Fakes the AI image provider |

::: tip Verify it's healthy
```bash
curl http://localhost:9090/health/ready
```
returns `{"status":"ready"}` when PostgreSQL and Redis are reachable and the
database is migrated.
:::

### Other stack flavors

The launcher supports different combinations of WeChat and storage:

```bash
# Port 8080 (used by the frontend test example), mock WeChat, MinIO
./scripts/create_stack.sh --port 8080 --wechat mock --storage minio --secret .env

# Real WeChat (needs WECHAT_APP_ID / WECHAT_MINI_PROGRAM_APP_SECRET in .env)
./scripts/create_stack.sh --port 8080 --wechat real --storage minio --secret .env

# Mock WeChat + real Aliyun OSS (needs S3_* keys in .env)
./scripts/create_stack.sh --port 8080 --wechat mock --storage oss --secret .env
```

All commands preserve named volumes, so recreating a stack never wipes your
data. See [Local Development Stack](/deploy/local-stack) for the full details.

## 4. Run the mini program frontend

Open a second terminal, then:

```bash
cd wechat_mini_program
pnpm install

# Mock mode — no backend needed at all (fastest for UI work)
pnpm dev:mp-weixin:mock
```

When you want to talk to the **real local backend**, use the API mode with a
**mock login/payment** (so no WeChat credentials are required):

```bash
# API mode against http://127.0.0.1:8080 (or your stack port)
pnpm dev:mp-weixin:api-local
```

::: tip Which port?
`dev:mp-weixin:api-local` targets `http://127.0.0.1:8080` by default. If you
started the stack on `9090` instead, run:
```bash
VITE_API_BASE_URL=http://127.0.0.1:9090 pnpm dev:mp-weixin:api-local
```
:::

## 5. Open the mini program in WeChat DevTools

1. Open **WeChat DevTools** and create/import a mini-program project.
2. Point the project directory at the build output:
   - Dev (HMR) build: `wechat_mini_program/dist/dev/mp-weixin`
   - Production build: `wechat_mini_program/dist/build/mp-weixin`
3. Set your **AppID** to the project's WeChat AppID
   (`wxec0d577de41255aa` — ask a maintainer for the AppSecret; it must **never**
   be committed).
4. WeChat DevTools compiles and opens the mini program simulator.

You should see the **ad splash → brand splash → home page** with the six feature
cards. Tap any feature to walk through the flow.

::: tip Phone testing
To run the mini program on a real phone against your local backend, connect the
phone and Mac to the same LAN and use:
```bash
./scripts/build_mp-weixin.sh          # auto-detects your LAN IP, port 8080
pnpm build:mp-weixin:api-device-wechat
```
:::

## 6. First "hello world" design job

With the API-mode frontend open in the simulator:

1. Open any feature (e.g. **Interior design**).
2. Pick a room photo from the simulator's local files.
3. Complete the steps and tap **Submit**.
4. The frontend will trigger the **WeChat registration/login gate** — in mock
   mode it succeeds automatically without a phone number.
5. Watch the design job page: the frontend **polls** the backend while the
   workers run the job against the **mock image provider**.
6. A result image appears, and you can generate a **design report**.

You can watch the backend do the work in real time:

```bash
docker compose logs -f api submit-worker poll-worker
```

## Troubleshooting

| Problem | Likely cause / fix |
| --- | --- |
| `curl http://localhost:9090/health/ready` fails | Stack not up — run `docker compose logs api` and `./scripts/create_stack.sh` again |
| Frontend shows "无法连接后端服务" | `VITE_API_BASE_URL` wrong, or mini program not on HTTPS/loopback — use `api-local` mode |
| Port already in use | Choose a different `--port` (1024–22527) |
| Mock login fails in DevTools | Some WeChat DevTools versions need "不校验合法域名" (skip domain validation) enabled for local HTTP testing |

## Next steps

- Read the [Frontend deep dive](/frontend/overview).
- Read the [Backend deep dive](/backend/overview).
- When you are ready to deploy, follow [Deploy](/deploy/local-stack).
