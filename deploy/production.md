# Production Promotion and Recovery

Promotion reuses an image already verified in cloud test. It does not rebuild. The namespace owner approves the outage, candidate, distinct rollback identity, evidence and second reviewer before execution.

## Protected promotion

From the reviewed backend checkout on the approved deployment host:

```bash
./deploy/sae/deploy.sh \
  --namespace=yuanzhu-test --stage=production \
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
  --namespace=yuanzhu-test --stage=production \
  --rollback="$ROLLBACK_SHA" --approver="$APPROVER" \
  --change-record="$CHANGE_RECORD"
```

Rollback redeploys application code; it does not downgrade PostgreSQL. Normalized-provider, subscription-tier, Project-schema and activity compatibility checks still apply. Once a boundary is active, an older image is not made safe by possessing its digest. If no compatible recovery image exists after migration, keep the affected fleet stopped and use an approved forward repair or separately authorized verified backup recovery with explicit RPO/data-loss acceptance.

## Incident evidence

Retain the secret-free release record, exact change orders, workload IDs/capacities, candidate/current/recovery digests, migration state, backup reference and any external activity receipt. Reconcile uncertain stop/start/deploy responses read-only before retrying. A canceled checkpoint can invoke recovery and restart API while preserving current cloud Envs; keep the session open during manual configuration reconciliation and do not assume cancellation reverses staged flags.

## Targeted input recovery {#input-recovery}

New admissions archive owned inputs durably before acceptance. An existing completed task with eligible historical input may need an explicitly targeted repair; normal deployment does not scan and rewrite every input.

From the matching backend environment, inspect the exact authorized Job/Asset pair first:

```bash
python -m app.assets.input_asset_repair --job-id '<job-uuid>' --asset-id '<asset-uuid>'
```

This is dry-run by default. `--apply` is an operator action for that same verified pair. The CLI does not discover targets, start services or create schema. It preserves executed physical pins, task status, charges and original content identity. `INPUT_REPAIR_AMBIGUOUS_OWNER` requires an ownership decision, not selecting the first consumer. Preserve copy receipts/leases after uncertain acknowledgements and use the documented recovery authority instead of deleting metadata.

Record packaged Alembic heads, `alembic current --check-heads` and `alembic check`; do not hardcode one forever-current revision. The new input/video/quota schema does not remove existing stopped-fleet or compatibility requirements. Read [the current repair implementation](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/assets/input_asset_repair.py) and [archival implementation](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/assets/asset_input_archival.py) before any write.

## Sales stages add a persistent activation boundary

The current production user population is `test-api.yuanzhushuzhi.com` / `yuanzhu-test`, despite its historical name. Test/development is `api.yuanzhushuzhi.com` / `yuanzhu-prod`. Preserve these mappings and choose protected release risk from users, not labels.

Pending sales-stage migration `a6b876c1d430` requires complete-fleet maintenance even when assignment migration `f4a843b2c610` is already applied. `PROJECT_SALES_STAGES_ENABLED` defaults false; applying schema alone does not initialize historical stage facts. First enablement requires the complete compatible fleet and `PROJECT_SALES_STAGES_COMPATIBILITY_V1`, a separately approved stopped-writer window, and the pinned runbook's captured maintenance session. Stage one identical mode binding for API/submit/poll through complete merged Envs while all writers remain stopped. Preserve unrelated bindings; Secret/ConfigMap-owned values use their existing configuration owner.

`sales-stage-inspection` reads the real persistent singleton in a READ ONLY transaction. The initializer commits recovered source evidence/audit, projections and `enabled_at` atomically, then reads back before any role starts. An already enabled start verifies instead of replaying history. Preserve the categorized backfill report; an empty eligible set does not prove nonempty recovery. Test the intended legacy clients and rehearse the reviewed production replica before production enablement.

After `enabled_at` exists, disabling the flag or selecting an unmarked recovery image is refused even if there are no Projects. `BOOTSTRAP_PRE_ACTIVATION_ONLY` is evidence of a predecessor, not permission to restart it after activation. Uncertain initialization leaves the fleet stopped for read-only reconciliation and compatible forward recovery; do not erase the marker, blindly retry a cloud write or downgrade schema. Normal dry-run does not execute the new database probe and is not activation proof.

Source: [deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md) · [deploy/sae/lib/migration.sh](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/deploy/sae/lib/migration.sh) · [deploy/sae/lib/preflight.sh](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/deploy/sae/lib/preflight.sh).

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions). Runtime values and cloud activation must be checked separately.

- [Production, outcome and activity procedures](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md)
- [Protected release implementation](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/deploy/sae/deploy.sh)
- [Activity operator](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/project_activity_operator.py)
- [Activity compatibility marker](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/deploy/sae/PROJECT_ACTIVITY_COMPATIBILITY_V1)
