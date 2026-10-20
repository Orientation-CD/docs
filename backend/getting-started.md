# Run the backend locally

Use the backend repository at the audited revision and Python 3.12 or newer. Docker Compose runs PostgreSQL, Redis, object storage, mock external services, API and workers. The image also builds a private video dependency, so image builds need the repository's documented GitHub SSH/BuildKit setup.

## Prepare a session

Read [local stack](/deploy/local-stack) before starting or recreating services. Select and record an API port for this session; agents must obtain that choice from the user. Check that the API port, derived MinIO ports and Compose project belong to this session. Do not take over another retained stack.

From the **backend repository root**:

```bash
cp .env.example .env
# Set DEV_TEST_PORT to the port selected for this session.
./scripts/create_stack.sh --port "${DEV_TEST_PORT:?Set the selected session port}" \
  --wechat mock --storage minio --secret .env
```

Keep real `.env` and private keys outside Git. The launcher migrates the local schema and waits for readiness. It prints browser-reachable API/storage URLs; use those on a phone rather than `localhost`.

```bash
curl "http://localhost:${DEV_TEST_PORT}/health/live"
curl "http://localhost:${DEV_TEST_PORT}/health/ready"
```

Readiness checks PostgreSQL and Redis; it does not prove a real provider or payment gateway has passed acceptance.

## First authenticated flow

1. Publish current Terms and Privacy through [Legal Documents](/admin/legal-documents). Login/registration must use their current IDs and explicit consent.
2. Use password registration/login, mock WeChat login or the configured Douyin flow following [authentication](/backend/authentication).
3. Read `/v1/me`, `/v1/me/workspaces` and the public `/v1/billing/features` catalog.
4. Configure an executable Workflow, active Feature and any required subscription permissions in [Studio Control](/admin/getting-started).
5. Create and complete [upload intents](/backend/assets-storage), then submit `/v1/workflows` with an explicit workspace and a durable idempotency key.

`ADMIN_PHONE` and `ADMIN_PASSWORD` bootstrap a configured admin at API startup. Existing accounts are promoted; an existing password is not automatically reset. Open the printed API origin plus `/admin`.

For test commands and port ownership use the backend's pinned runbook below; do not start live/paid or cloud tests merely to view these docs. Full environment variables are in [configuration](/reference/configuration).

---

Source evidence · backend `b13cc566`: [scripts/runbook.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/runbook.md) · [scripts/create_stack.sh](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/create_stack.sh) · [app/main.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/main.py).
