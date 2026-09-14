# Production Promotion & Rollback

This page covers moving a **proven** image to the production SAE namespace and rolling
back when needed. Production is a controlled environment: it never rebuilds, forces
interactive approval, stops the API as a database-write fence, captures a fresh RDS
recovery point, and records every release.

## What "production" means here

Production uses `--stage=production` against a namespace (typically
`yuanzhu-prod`, whose public API is `https://api.yuanzhushuzhi.com`). The stage selects
the protected release policy; it does not rename the namespace or rewrite the
cloud-owned `ENVIRONMENT`. A routine test-stage deployment of an application already
configured with `ENVIRONMENT=production` is rejected.

Promotion **never rebuilds**. It promotes a full-SHA image that already exists in ACR
and has cloud-test evidence.

## Promotion

```bash
./deploy/sae/deploy.sh \
  --namespace=yuanzhu-prod \
  --stage=production \
  --promote=<40-char-cloud-tested-sha> \
  --rollback-sha=<40-char-current-safe-sha> \
  --cloud-test-workflow='https://github.com/.../actions/runs/...' \
  --smoke-evidence='change-ticket-or-artifact-reference' \
  --approver='second-reviewer' \
  --change-record='CHG-1234'
```

### Required inputs

| Input | Why |
| --- | --- |
| `--promote=<sha>` | Full 40-char SHA that passed cloud-test verification |
| `--rollback-sha=<sha>` | Known-good full SHA to fall back to |
| `--cloud-test-workflow=<url>` | Evidence the image was verified in cloud-test |
| `--smoke-evidence=<ref>` | Smoke/change-ticket artifact reference |
| `--approver=<name>` | Second reviewer (two-person rule) |
| `--change-record=<id>` | Change-ticket ID, e.g. `CHG-1234` |

The deployer resolves the four canonical workload names inside the namespace
(`yuanzhu-ai-api`, `yuanzhu-ai-submit-worker`, `yuanzhu-ai-poll-worker`, plus the
temporary migration runner) and validates any `SAE_*_APP_ID` override against the
resolved ID.

### Preflight checks (interactive approval)

Before any mutation, the script verifies:

- Selected **and** rollback images already exist in ACR.
- API and both workers currently run **one immutable image revision** with one full
  `APP_VERSION`; each role's configured and fully running replica count is captured.
- Selected, rollback, and captured-current SHAs are descendants of the normalized-Provider
  floor `3059428f0fe1bdda95abe329eb97bcaae50e87c2` (or the sole reviewed PR #249
  squash-source equivalent), and every full-SHA tag resolves to its observed immutable
  digest.
- API and both workers have **at least two** configured/running instances.
- API readiness, preStop, minimum-ready, and **300-second termination grace**; worker
  300-second termination grace with
  `WORKER_JOB_COMPLETION_WAIT_SECONDS=270`.
- Production provider settings, shared RDS/Redis/OSS configuration, and one matching
  whole-Secret reference across API/workers.
- Explicit operator confirmation for: expand-compatible migration, Seedream timeout,
  **real** WeChat Pay configuration (mock mode is forbidden; `disabled` or `live` are
  accepted), cloud-test evidence, and two-person review.

### Rollout order (deliberate API outage)

```text
capture current state
  -> stop API (prove STOPPED, 0 running, no active change order)
  -> create full RDS snapshot backup (#238, wait for available)
  -> migration on the promoted image (alembic upgrade head + checks)
  -> yuanzhu-ai-submit-worker
  -> yuanzhu-ai-poll-worker
  -> yuanzhu-ai-api (at captured capacity)
  -> live verification
```

The API outage is a **database-write fence**. Stopped state is revalidated around
backup/migration boundaries, on both sides of every application cutover, and immediately
before start. A worker capacity change detected before outage or after any cutover stops
the flow before the next mutation.

If migration or a cutover fails, the script restores every already-changed role to the
captured pre-outage image/`APP_VERSION` (only when that exact identity passed the
pre-outage floor and digest checks), then restarts the API. If verification fails after
traffic was accepted, the API is stopped but **no automatic revision recovery** is
attempted — the two schema representations may already have diverged.

## Smoke tests

- **Built-in rollout verification** runs automatically after the API starts:
  `/health/ready` (PostgreSQL + Redis) and a release-critical OpenAPI route contract.
- **Credentialed smoke** (when a `.env.cloud-test` secret is available) runs
  `scripts/run_smoke_tests.sh` for the real API → Redis → workers → mock-provider path.
  Triggered with `--require-smoke` on `--verify-only`.
- Evidence is recorded in the secret-free release record.

## Database migrations

- Migrations run **only** on the promoted image, inside the stopped-API window.
- The migration runner uses the dedicated `yuanzhu-migration-secrets` Secret
  (`MIGRATION_DATABASE_URL`), never the runtime `DATABASE_URL` (#214/#234).
- The runner fails closed: `alembic current --check-heads` and `alembic check` must both
  pass or application rollout aborts.
- Migrations must be **expand-compatible** (additive, backward-read compatible) so a
  rollback image keeps working against the post-migration schema.

## Rollback

Rollback is an incident/recovery operation, not a routine post-deployment step. It
**never downgrades or executes the database migration**.

```bash
./deploy/sae/deploy.sh \
  --namespace=yuanzhu-prod \
  --stage=production \
  --rollback=<40-char-rollback-sha> \
  --approver='second-reviewer' \
  --change-record='CHG-1234'
```

Rollback order:

```text
capture current state -> compatibility + digest proof -> stop API
  -> NO migration -> submit worker -> poll worker -> API
  -> start API at captured capacity -> verification
```

Before the API is stopped, both the selected rollback and captured-current revisions must
prove against the Git floor and bind each `APP_VERSION` to its immutable ACR digest. The
legacy `image_provider_configs` table and `design_job_types.provider_adapter` column were
removed by a normalized-only cleanup migration; recovery is **forward-only**: use a
prevalidated compatible image, or restore the fresh RDS recovery point created at the
start of the failed/rolled-back release. If the schema is not backward compatible, stop
and forward-fix instead.

## Release records

Real production attempts write a **secret-free Markdown release record** to:

```text
${RELEASE_RECORD_DIR:-/tmp/yuanzhu-sae-release-records}
```

The record includes the namespace ID, every resolved AppId, selected SHA/digest, each
role's captured image/`APP_VERSION`/capacity, the exact floor proof method, stop/start
and migration-runner change-order IDs, uncertainty states, target/recovery change orders,
approver/operator, live verification status, and rollback information. Set
`RELEASE_RECORD_DIR` to an operations-managed location so records persist.

## Safety summary

| Property | Enforcement |
| --- | --- |
| No rebuild in production | Promote an existing ACR digest only |
| Human approval | Two-person review + `--approver` + change record |
| Migration safety | API-stop fence; fails closed; dedicated migration Secret |
| Recovery point | Fresh full RDS snapshot before every migration (#238) |
| Evidence trail | `--cloud-test-workflow`, `--smoke-evidence`, release records |
| Graceful shutdown | 300 s termination grace > 270 s worker completion wait |
| Forward-only schema | No DB downgrade on rollback; legacy tables removed |

## Next steps

- [SAE Deployment Runbook](/deploy/sae-deployment) — the full operator flow.
- [CI/CD with GitHub Actions](/deploy/ci-cd) — automation around it.
