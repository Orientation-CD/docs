# Local Development Stack

Use the backend's retained Docker Compose stack to integrate the mini program with PostgreSQL, Redis, MinIO and the workers. A frontend mock build alone does not exercise this stack.

## Select and record the session port

Before starting, recreating or testing a stack, choose the API port with its owner. Record the port, Compose project, checkout and session owner. Commands below deliberately require that value; they do not choose a port for you.

```bash
export DEV_TEST_PORT='<owner-selected API port>'
export DEV_TEST_PROJECT="yuanzhu-${DEV_TEST_PORT}"
```

Valid API ports are 1024–22527. MinIO ports are derived without collisions: API port + 21504 for the MinIO API, and API port + 43008 for its console. Check all three ports, running/stopped containers and retained volumes before each run. The launcher can remove a conflicting Compose project from this repository; that behavior does not grant permission to take over another session. On conflict, select a new port with the owner or obtain explicit takeover authorization.

## Build prerequisites

Install Docker with Compose/Buildx, Git and the Python dependencies needed by the launcher's settings/import tooling. Create an ignored `.env` from `.env.example`; do not run a dotenv file as shell code.

Current images also build the private video dependency from `Orientation-CD/jinqiuai` (`master`) over GitHub SSH port 443. The calling shell needs `SSH_AUTH_SOCK` and an agent key authorized to read that repository. Compose declares SSH forwarding; direct image builds require `--ssh default`. Record the resolved supplier commit from the image-build log because rebuilding the same backend revision can consume a newer supplier revision. A missing key causes a build failure even if this session will not generate video.

## Create an integration stack

Run these commands from the backend checkout after the ownership preflight:

```bash
cp .env.example .env
./scripts/create_stack.sh \
  --port "${DEV_TEST_PORT:?Select the session port first}" \
  --project "$DEV_TEST_PROJECT" --ip localhost \
  --wechat mock --storage minio --secret .env \
  --import-cloud-config
```

`--import-cloud-config` needs `CLOUD_API_URL`, `CLOUD_ADMIN_USERNAME` and `CLOUD_ADMIN_PASSWORD` for an authorized cloud-test Admin account. It validates a product-configuration snapshot before recreation, then imports prompts, Features, Workflow graphs, subscription plans, token packages and legal documents into a **fresh** local PostgreSQL volume. Provider credentials are not exported; local mock providers replace them. The flag is MinIO-only.

A bare stack can start without usable legal documents or purchase/Feature configuration. API readiness alone does not prove that login, consent or job creation will work. On a retained configured volume, ordinary recreation preserves configuration. A partial/unknown retained configuration fails closed; use a new owned project/port instead of overwriting consent and product data. Do not repeatedly import cloud configuration into a migrated upgrade-test volume.

Check readiness and open the Admin console:

```bash
curl --fail "http://localhost:${DEV_TEST_PORT}/health/ready"
```

Admin runs at `http://localhost:<selected-port>/admin`. Use the configured administrator identity; mock mobile login does not grant administrator access.

## Connect the mini program

Use the explicit environment + `pnpm exec uni build -p mp-weixin` recipe in [Quick Start](/get-started/quickstart). It carries your selected API, storage and report origins and disables demo entitlement overrides. The shorter `dev:mp-weixin:api-local` script hard-codes port **8080**; prefixing it with another URL does not override that assignment.

For a physical phone, use a reachable LAN address and the frontend's permitted local-HTTP configuration/build script. `localhost` on a phone refers to the phone. Real WeChat or Douyin login is a separate mode with real application credentials, approved domains and the corresponding provider setup. Check `./scripts/create_stack.sh --help` before changing modes.

## Inspect and preserve the owned environment

Use an explicitly selected project and secret file when inspecting Compose:

```bash
docker compose --env-file .env -p "$DEV_TEST_PROJECT" ps
docker compose --env-file .env -p "$DEV_TEST_PROJECT" logs --tail 100 api
```

Ordinary launch and smoke/E2E commands preserve named database, Redis and MinIO volumes. Do not append `down -v` as routine cleanup. Optional host PostgreSQL publishing is separate from the API port; smoke/E2E disable that mapping. See [storage and test environments](/testing/storage-environments) for precedence, MinIO versus OSS and runner behavior.

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions). Runtime values and cloud activation must be checked separately.

- [Local stack/runbook](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/runbook.md)
- [Launcher and ownership-sensitive behavior](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/create_stack.sh)
- [Session and storage test policy](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/tests/documents/TEST_STRATEGY.md)
- [Image build and private supplier dependency](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/Dockerfile)
