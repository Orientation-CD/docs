# Production Promotion & Rollback

This page covers moving a **proven** image to the production SAE environment
and rolling back when needed. Production is a controlled environment: it never
rebuilds, forces interactive approval, and records every release.

## Promotion

Production **promotes a full-SHA image** that already exists in ACR and has
cloud-test evidence. The image is never rebuilt.

```bash
./deploy/sae/deploy.sh \
  --env=production \
  --promote=<40-char-cloud-tested-sha> \
  --rollback-sha=<40-char-current-safe-sha> \
  --cloud-test-workflow='https://github.com/.../actions/runs/...' \
  --smoke-evidence='change-ticket-or-artifact-reference' \
  --approver='second-reviewer' \
  --change-record='CHG-1234'
```

### Required SAE IDs

Production SAE targets must be supplied explicitly:

```
SAE_MIGRATION_JOB_ID
SAE_SUBMIT_WORKER_APP_ID
SAE_POLL_WORKER_APP_ID
SAE_API_APP_ID
```

And `PUBLIC_API_BASE_URL` must point at the production HTTPS API origin.

### Preflight checks (production forces interactive approval)

- Selected **and** rollback images already exist in ACR.
- API and workers start from **one current image revision**.
- API and both workers have **at least two configured/running instances**.
- API readiness, preStop, minimum-ready, and **300-second termination grace**.
- Worker **300-second termination grace** and
  `WORKER_JOB_COMPLETION_WAIT_SECONDS=270`.
- Production mock/live-provider settings and shared database/Redis/secret/
  storage environment references.
- Explicit operator confirmation for: expand-compatible migration, Seedream
  timeout, real WeChat Pay configuration, cloud-test evidence, and **two-person
  review**.

### Rollout order

```text
migration → submit worker → poll worker → API → live verification
```

## Rollback

Rollback **never downgrades or executes the database migration**. The operator
must confirm the already-deployed schema remains backward compatible with the
rollback image.

```bash
./deploy/sae/deploy.sh \
  --env=production \
  --rollback=<40-char-rollback-sha> \
  --approver='second-reviewer' \
  --change-record='CHG-1234'
```

Rollback order:

```text
NO migration → submit worker → poll worker → API → verification
```

If the schema is not backward compatible, **stop and forward-fix** instead of
rolling back.

## Release records

Real production attempts write a **secret-free Markdown release record** to:

```text
${RELEASE_RECORD_DIR:-/tmp/yuanzhu-sae-release-records}
```

The record includes: selected SHA/digest, cloud-test evidence, migration Job
ID, SAE change-order IDs, old/new application images, approver/operator, live
verification status, and rollback information. Set `RELEASE_RECORD_DIR` to an
operations-managed location so records persist.

## Live verification

After rollout, production is verified against the live endpoint — readiness
(PostgreSQL + Redis) and a release-critical OpenAPI route contract. The
verification-only form of the script (`--verify-only`) performs no writes.

## Safety summary

| Property | Enforcement |
| --- | --- |
| No rebuild in production | Promote existing ACR digest only |
| Human approval | Two-person review + `--approver` + change record |
| Migration safety | Migration Job fails closed; no DB downgrade on rollback |
| Evidence trail | `--cloud-test-workflow`, `--smoke-evidence`, release records |
| Graceful shutdown | 300 s termination grace > 270 s worker completion wait |

## Next steps

- [SAE Deployment Runbook](/deploy/sae-deployment) — the full operator flow.
- [CI/CD with GitHub Actions](/deploy/ci-cd) — automated cloud test.
