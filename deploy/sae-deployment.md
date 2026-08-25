# SAE Deployment Runbook

This page is the copy-paste **operator runbook** for deploying the backend to
Aliyun SAE. It mirrors `deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md` in the backend
repo and assumes you already understand the
[Cloud Architecture](/deploy/cloud-architecture).

## 0. Prerequisites

- **Bash 4+** (macOS `/bin/bash` is 3.2 — use Homebrew Bash and invoke it
  explicitly), Git, Docker + Buildx, Python 3, curl, the **Alibaba Cloud CLI**,
  and GNU `timeout`/`gtimeout`.
- Credentials in an **ignored** dotenv file (never commit them):

```dotenv
ACR_USERNAME=<registry-user>
ACR_PASSWORD=<registry-password>
ALIYUN_ACCESS_KEY_ID=<access-key-id>
ALIYUN_ACCESS_KEY_SECRET=<access-key-secret>
```

Exported env vars take precedence over the dotenv file.

## 1. Prepare the checkout

Run every command from the backend repo root. Deploy a **committed** revision;
uncommitted changes are excluded from the image.

```bash
git status --short
revision="$(git rev-parse HEAD)"
printf 'Deploying revision: %s\n' "$revision"
```

## 2. Dry run first (no cloud mutation)

```bash
image_ref="$(./deploy/sae/build-image.sh --revision="$revision" --dry-run)"
./deploy/sae/run-deploy-container.sh \
  --env=cloud-test \
  --image="$image_ref" \
  --revision="$revision" \
  --dry-run
```

Do not continue if either command fails.

## 3. Build and publish the image (Phase 1)

```bash
image_ref="$(./deploy/sae/build-image.sh --revision="$revision")"
printf 'Published image: %s\n' "$image_ref"
```

Keep this terminal open — `revision` and `image_ref` are needed next.

## 4. Deploy cloud test from the immutable image (Phase 2)

On macOS use the pinned Linux tools container (no Docker socket mounted):

```bash
./deploy/sae/run-deploy-container.sh \
  --env=cloud-test \
  --image="$image_ref" \
  --revision="$revision" \
  --interactive
```

On a provisioned Linux host, the equivalent direct command is:

```bash
./deploy/sae/deploy-image.sh \
  --env=cloud-test \
  --image="$image_ref" \
  --revision="$revision" \
  --interactive
```

Review the read-only migration preflight and **both migration approval gates**.
The script stops before application rollout if migration execution or schema
verification fails.

## 5. Verify cloud test

```bash
export CLOUD_TEST_PUBLIC_API_BASE_URL='https://test-api.example.com'

./deploy/sae/deploy.sh \
  --env=cloud-test \
  --verify-only \
  --api-base="$CLOUD_TEST_PUBLIC_API_BASE_URL"
```

For the stricter cloud smoke verification (when credentials are available):

```bash
./deploy/sae/deploy.sh \
  --env=cloud-test \
  --verify-only \
  --api-base="$CLOUD_TEST_PUBLIC_API_BASE_URL" \
  --smoke-secret=.env.cloud-test \
  --require-smoke
```

## 6. Alternative flags

| Flag | Meaning |
| --- | --- |
| `--build-only` | Ensure the commit image exists locally (no push, no SAE) |
| `--publish-only` | Ensure the immutable full-SHA image is in ACR (no SAE) |
| `--single=<target>` | Cloud-test diagnostics: deploy only one target |
| `--dry-run` | Print every write/verification/approval, mutate nothing |
| `--interactive` | Migration approval gates + prompts |

## 7. Promote to production

See [Production Promotion & Rollback](/deploy/production).

## 8. Common failures

| Failure | Action |
| --- | --- |
| Missing local command | Install the prerequisite and rerun unchanged |
| Alibaba identity check fails | Verify AccessKey active, STS allowed, outbound HTTPS works |
| SLS unauthorized | Grant deployment identity read access to the migration Job logstore |
| Migration preflight/execution fails | Inspect the Job output; do not deploy apps manually |
| `alembic check` reports operations | Add a new forward migration; never edit an applied revision |
| `/health/ready` returns 503 | Inspect PostgreSQL, Redis, configuration, API logs |

## 9. Validate deploy-script changes

```bash
find deploy/sae -type f -name '*.sh' -print0 | xargs -0 -n1 bash -n
./deploy/sae/tests/refactor_smoke.sh
/bin/bash deploy/sae/deploy.sh --help   # clear prerequisite error on Bash 3
```

## Next steps

- [CI/CD with GitHub Actions](/deploy/ci-cd) — automated cloud-test deploys.
- [Production Promotion & Rollback](/deploy/production).
