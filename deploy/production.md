# Production Promotion and Recovery

Promotion reuses an image already verified in cloud test. It does not rebuild. The namespace owner approves the outage, candidate, distinct rollback identity, evidence and second reviewer before execution.

## Protected promotion

From the reviewed backend checkout on the approved deployment host:

```bash
./deploy/sae/deploy.sh \
  --namespace=yuanzhu-prod --stage=production \
  --promote="$RELEASE_SHA" --rollback-sha="$ROLLBACK_SHA" \
  --cloud-test-workflow="$CLOUD_TEST_WORKFLOW_URL" \
  --smoke-evidence="$SMOKE_EVIDENCE" --approver="$APPROVER" \
  --change-record="$CHANGE_RECORD"
```

Both SHAs are full immutable revisions. The script proves current/selected/recovery full-SHA tags against ACR digests and compatibility boundaries, captures all three roles' identities and configured/running capacities, stops API and repeatedly proves `STOPPED`/zero/no active change order, establishes an RDS recovery point, migrates and installs compatible workloads, then explicitly restores service and verifies capacity. Complete each interactive checkpoint.

A candidate whose pending migrations require stopped workers must additionally use the upstream `--maintenance-mode` procedure. It stops API and both workers, installs the complete compatible fleet while stopped, then starts workers before API. A failure after migration can intentionally leave the fleet stopped for deliberate forward repair; this is not a checkpoint-resumable release.

## Project outcomes are an activation boundary

`PROJECT_OUTCOMES_ENABLED` defaults to `false`. First deploy outcome-capable API and workers with the flag off and verify migration `b7c4e8a1d629`. Confirm the matching frontend supports WON/LOST, loss details, separate counts and complete project lists, and allow time for client adoption.

Activation uses a separately approved API outage and the **ordinary protected** path, not maintenance-mode. At the migration-success/submit-worker checkpoint, keep the prompt waiting and independently prove API stopped/zero. Stage the literal flag on API and both workers through freshly read, complete merged Envs arrays with SAE `DeployApplication --Deploy false`; preserve unrelated values, Secret references, image/version and capacity. Read back each result. Only then let the protected process roll workers and, after verifying both enabled workers, the API. `configure-env.sh` is not a general flag editor.

Do not run enabled and disabled API instances together: enabled instances can write WON/LOST that disabled readers cannot project. Before outcome data exists, the reviewed stopped-fleet procedure can restore the previous configuration. After any WON/LOST write, keep the flag enabled, compatible readers/writers and schema; disabling it or downgrading schema is not a valid rollback. Do not erase outcomes to bypass the boundary.

## Project activity has its own recovery boundary

Activity migration `c8d5f1a2e730` requires maintenance-mode while pending. Preserve outcomes configuration and use a separate window from first outcome activation. The `PROJECT_ACTIVITY_COMPATIBILITY_V1` Git-tree marker distinguishes compatible writers from older Project-schema images. A bootstrap predecessor recorded as `BOOTSTRAP_PRE_MIGRATION_ONLY` is not authorized for recovery after migration begins. A marker proves image compatibility identity, not database trust.

If old writers actually ran after the activity boundary, stop/isolate every writer, prove open transactions ended with authorized DBA visibility, install compatible configurations while stopped and use the focused `app.workspaces.project_activity_operator` show/advance procedure with its exact expected epoch and incident reference. Preserve its receipt and projections. A backup restore also needs reconciliation of snapshot time and the incident interval; missing/older/null state must not silently restore trust. Do not clear or decrease the activity epoch.

## Application rollback

For a reviewed compatible recovery image:

```bash
./deploy/sae/deploy.sh \
  --namespace=yuanzhu-prod --stage=production \
  --rollback="$ROLLBACK_SHA" --approver="$APPROVER" \
  --change-record="$CHANGE_RECORD"
```

Rollback redeploys application code; it does not downgrade PostgreSQL. Normalized-provider, subscription-tier, Project-schema and activity compatibility checks still apply. Once a boundary is active, an older image is not made safe by possessing its digest. If no compatible recovery image exists after migration, keep the affected fleet stopped and use an approved forward repair or separately authorized verified backup recovery with explicit RPO/data-loss acceptance.

## Incident evidence

Retain the secret-free release record, exact change orders, workload IDs/capacities, candidate/current/recovery digests, migration state, backup reference and any external activity receipt. Reconcile uncertain stop/start/deploy responses read-only before retrying. A canceled checkpoint can invoke recovery and restart API while preserving current cloud Envs; keep the session open during manual configuration reconciliation and do not assume cancellation reverses staged flags.

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions). Runtime values and cloud activation must be checked separately.

- [Production, outcome and activity procedures](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md)
- [Protected release implementation](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/deploy/sae/deploy.sh)
- [Activity operator](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/project_activity_operator.py)
- [Activity compatibility marker](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/deploy/sae/PROJECT_ACTIVITY_COMPATIBILITY_V1)
