# SAE Deployment Runbook

This is the copy-paste **operator runbook** for deploying the backend to Aliyun SAE. It
mirrors `deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md` in the backend repo. You should already
understand the [Cloud Architecture](/deploy/cloud-architecture).

> **Where a routine release stops.** Section 5 below is the complete standard
> deployment. A successful section 5 — including its built-in health and contract
> checks — is the **stopping point** for a routine release (#237). Sections 5a, 6, 6a,
> and 6b are **one-time namespace setup / drift reconciliation** procedures; use them
> when preparing a namespace or fixing reported drift, **not** on every deployment.
> Sections 7–11 are optional verification, protected promotion, rollback, and
> troubleshooting.

## 0. Prerequisites

- **Bash 4+** (macOS `/bin/bash` is 3.2 — use Homebrew Bash and invoke it explicitly,
  e.g. `/opt/homebrew/bin/bash`), Git, Docker + Buildx, Python 3, curl, the **Alibaba
  Cloud CLI**, and GNU `timeout`/Homebrew `gtimeout`.
- Credentials in an **ignored** dotenv file (default `.env`; override with
  `DEPLOY_ENV_FILE`). Never commit them:

```dotenv
ACR_REGISTRY=registry.example.com
ACR_NAMESPACE=yuanzhu-ai-ns
ACR_REPOSITORY=yuanzhu-ai-runtime
ACR_USERNAME=<registry-user>
ACR_PASSWORD=<registry-password>
ALIYUN_ACCESS_KEY_ID=<access-key-id>
ALIYUN_ACCESS_KEY_SECRET=<access-key-secret>
SAE_REGION=cn-chengdu
SAE_API_ENDPOINT=sae.cn-chengdu.aliyuncs.com
```

Exported environment variables take precedence over the dotenv file. The deploy script
performs a read-only STS `GetCallerIdentity` preflight before any cloud write.

## 1. Prepare the checkout

Run every command from the backend repo root. Deploy a **committed** revision;
uncommitted changes are excluded from the image.

```bash
git status --short
revision="$(git rev-parse HEAD)"
printf 'Deploying revision: %s\n' "$revision"
```

## 2. Two-phase dry run (no cloud mutation)

Phase 1 simulates publication (returning a synthetic all-zero digest when the real
artifact does not exist). Phase 2 loads the pinned Linux deploy container and simulates
SAE operations without mutating cloud resources.

```bash
image_ref="$(./deploy/sae/build-image.sh --revision="$revision" --dry-run)"

./deploy/sae/run-deploy-container.sh \
  --namespace=yuanzhu-test \
  --stage=test \
  --image="$image_ref" \
  --revision="$revision" \
  --dry-run
```

Do not continue if either command fails.

## 3. Build and publish the image (Phase 1)

This phase builds the committed revision for `linux/amd64`, pushes it to ACR, and returns
its immutable registry digest.

```bash
image_ref="$(./deploy/sae/build-image.sh --revision="$revision")"
printf 'Published image: %s\n' "$image_ref"
```

Keep this terminal open — `revision` and `image_ref` are needed next.

## 4. Deploy a standard namespace (Phase 2)

On a local workstation run Phase 2 in its pinned Linux tools container
(`deploy/sae/Dockerfile.deploy`). The wrapper mounts the repo read-only and the selected
dotenv read-only; it **never mounts `/var/run/docker.sock`**, so it cannot build or
replace application images.

```bash
./deploy/sae/run-deploy-container.sh \
  --namespace=yuanzhu-test \
  --stage=test \
  --image="$image_ref" \
  --revision="$revision" \
  --interactive
```

On a provisioned Linux host, the equivalent direct command is:

```bash
./deploy/sae/deploy-image.sh \
  --namespace=yuanzhu-test \
  --stage=test \
  --image="$image_ref" \
  --revision="$revision" \
  --interactive
```

The deploy phase performs a read-only ACR lookup and requires the supplied full-SHA tag
to resolve to the supplied digest. A swapped revision and image therefore fails before
migration or application deployment.

## 5. Standard rollout and built-in verification

The standard test-stage rollout is sequential:

```text
capture RDS backup policy → create full snapshot backup → wait for it available
  → temporary migration runner (alembic upgrade head + checks)
  → yuanzhu-ai-submit-worker
  → yuanzhu-ai-poll-worker
  → yuanzhu-ai-api
  → built-in health + contract verification
```

What the script does automatically:

- **PostgreSQL snapshot recovery point (#238):** before creating the migration runner it
  verifies the namespace's RDS backup policy (≥7 days retention), creates one full
  physical/snapshot backup, polls the exact returned backup job, and confirms the backup
  set is available for recovery. It never deletes older backups.
- **Migration credential separation (#214/#234):** the runner maps
  `MIGRATION_DATABASE_URL` from the namespace Secret `yuanzhu-migration-secrets` to
  `DATABASE_URL`. API and workers keep their existing runtime `DATABASE_URL` and never
  mount that Secret.
- **Migration fail-closed:** preflight reads (`alembic current/heads/history`) run first;
  after your interactive approval the runner applies `alembic upgrade head`, then
  `alembic current --check-heads` and `alembic check`. Application rollout stops if
  either fails.
- **Managed-field contract:** SAE deployment only sets the runtime image,
  `Command`/`CommandArgs`, and merges `APP_VERSION=<full-sha>` into the existing
  environment array. Lifecycle probes, autoscaling, SLS, and Secret references are
  preserved.

Review the read-only migration preflight and the migration approval prompt.

**Standard deployment ends here.** Do not continue through sections 5a–6b as if they
were required.

### 5a. Plan / reconcile migration database credentials (one-time)

Run only when initially configuring a namespace or when its read-only plan reports
drift:

```bash
# Inspect without changing anything
./deploy/sae/configure-migration-db.sh --namespace=yuanzhu-prod --dry-run

# Apply idempotently after reviewing the plan
./deploy/sae/configure-migration-db.sh --namespace=yuanzhu-prod --apply --interactive
```

The plan resolves the API's runtime `DATABASE_URL` in memory, verifies RDS instance
binding, `yuanzhu_app` ownership, runtime grants, and the dedicated migration Secret.
Apply is idempotent and returns no-op when the contract already matches.

### 6. Reconcile public SAE ingress and DNS (one-time)

```bash
./deploy/sae/configure-network.sh --namespace=yuanzhu-prod --dry-run   # plan
./deploy/sae/configure-network.sh --namespace=yuanzhu-prod --apply --interactive
```

It manages the single HTTPS listener on public `443` → container `8080`, rotates the
certificate only when the listener shape is otherwise exact, and moves DNS only after
direct liveness/readiness pass. Use `--skip-dns` to provision ingress without touching
AliDNS.

### 6a. Reconcile OSS controls (one-time)

```bash
./deploy/sae/configure-oss.sh --namespace=yuanzhu-prod --dry-run
./deploy/sae/configure-oss.sh --namespace=yuanzhu-prod --apply --interactive
```

It reconciles private ACL, Block Public Access, AES-256 encryption, versioning, exact
browser CORS, and a 7-day lifecycle limited to `temp/assets/`. A lifecycle rule that
overlaps durable prefixes fails closed and requires `--replace-unsafe-lifecycle`.

### 6b. Reconcile CDN delivery (one-time)

```bash
./deploy/sae/configure-cdn.sh --namespace=yuanzhu-prod --dry-run
./deploy/sae/configure-cdn.sh --namespace=yuanzhu-prod --apply --interactive
```

The public scope is safe to apply once the CAS certificate covers the nested hostname.
The private scope additionally requires `--private-signer-ready` and a per-namespace
`PRIVATE_ASSET_CDN_AUTH_KEY` (injected via the protected env or gitignored `.env`, never
on the command line).

## 7. Re-verify cloud test (optional, no redeploy)

Section 5 already ran the built-in checks. Use this only when you must re-verify
without redeploying:

```bash
export CLOUD_TEST_PUBLIC_API_BASE_URL='https://test-api.yuanzhushuzhi.com'

./deploy/sae/deploy.sh \
  --namespace=yuanzhu-test --stage=test \
  --verify-only \
  --api-base="$CLOUD_TEST_PUBLIC_API_BASE_URL"
```

For credentialed E2E smoke evidence:

```bash
./deploy/sae/deploy.sh \
  --namespace=yuanzhu-test --stage=test \
  --verify-only \
  --api-base="$CLOUD_TEST_PUBLIC_API_BASE_URL" \
  --smoke-secret=.env.cloud-test \
  --require-smoke
```

`--verify-only` performs no build/push, registry login, migration, or SAE write.

## 8. Promote to production

See [Production Promotion & Rollback](/deploy/production). Production promotion and
rollback are separate protected workflows; the standard test-stage container entrypoint
rejects production mutations because it does not collect protected-release evidence.

## 9. Alternative flags

| Flag | Meaning |
| --- | --- |
| `--build-only` | Ensure the commit `runtime` image exists locally (no push, no SAE) |
| `--publish-only` | Ensure the immutable full-SHA image is in ACR (no SAE) |
| `--single=<target>` | Test-stage only: deploy one target (`migrate`, `api`, `submit-worker`, `poll-worker`) |
| `--dry-run` | Print every write/verification/approval, mutate nothing |
| `--interactive` | Migration approval gates + prompts |
| `--rebuild` | Force a fresh BuildKit build (with `--build-only`) |
| `--install-deps` | Opt-in Homebrew install of `aliyun-cli` / `coreutils` only |

## 10. Common failures

| Failure | Action |
| --- | --- |
| Missing local command | Install the prerequisite and rerun the unchanged command |
| Alibaba identity check fails | Verify the AccessKey is active, STS allowed, outbound HTTPS works |
| Network privilege check lists missing actions | Add only the listed RAM actions, rerun the read-only plan |
| No matching certificate | Issue/purchase the namespace hostname certificate first |
| Canonical workload name missing | Create `yuanzhu-ai-api`, `yuanzhu-ai-submit-worker`, `yuanzhu-ai-poll-worker` in the namespace |
| Canonical migration Secret missing | Create `yuanzhu-migration-secrets` with only `MIGRATION_DATABASE_URL`; never mount it in API/workers |
| RDS recovery-point preflight fails | Check RDS instance ID, `rds:DescribeBackupPolicy/Tasks/Backups/CreateBackup`, and ≥7-day retention |
| Migration preflight/execution fails | Inspect the sanitized runner output; do not deploy apps manually |
| `alembic check` reports operations | Add a new forward migration; never edit an applied revision |
| `/health/ready` returns 503 | Inspect RDS, Redis, config, and API logs |

## 11. Validate deploy-script changes

```bash
find deploy/sae -type f -name '*.sh' -print0 | xargs -0 -n1 bash -n
./deploy/sae/tests/refactor_smoke.sh
./deploy/sae/tests/provider_schema_compatibility_smoke.sh
./deploy/sae/tests/protected_release_outage_smoke.sh
/bin/bash deploy/sae/deploy.sh --help   # clear prerequisite error on Bash 3
```

## Next steps

- [CI/CD with GitHub Actions](/deploy/ci-cd) — automation.
- [Production Promotion & Rollback](/deploy/production).
