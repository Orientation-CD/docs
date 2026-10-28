# SAE Deployment Runbook

This page explains the standard **cloud-test** path and its checkpoints. Executing a release requires the environment owner's authorization and credentials. Production uses the [protected promotion procedure](/deploy/production).

## Prepare inputs

Use a clean reviewed checkout and record the full candidate SHA. Prepare ignored deployment credentials, configured ACR repository, namespace/RDS identity and an SSH agent authorized to read the private `jinqiuai` dependency. Do not print dotenv files or full cloud environment arrays.

Inspect the pinned upstream runbook before a release: it contains migration-specific preparation and recovery instructions that a generic copy-paste command cannot replace. Confirm the target namespace's runtime database account, migration Secret, storage settings and pull-Secret selection first.

## Two-phase build and deploy

From the backend checkout, validate the handoff without publishing or mutating cloud state:

```bash
revision="$(git rev-parse HEAD)"
image_ref="$(./deploy/sae/build-image.sh --revision="$revision" --dry-run)"
./deploy/sae/run-deploy-container.sh \
  --namespace=yuanzhu-test --stage=test \
  --image="$image_ref" --revision="$revision" --dry-run
```

A synthetic all-zero digest is accepted only in dry-run. For an authorized standard cloud-test release, omit `--dry-run` in both phases. Phase one builds/pushes the exact committed `linux/amd64` runtime and returns the digest reference. Phase two proves the full-SHA tag/digest relationship before writes.

The deployment-tools container uses pinned deployment tooling, a read-only source checkout and a read-only selected dotenv mount. It receives no Docker socket and cannot build application images. It is test-stage only. A prepared Linux deployment host may run `deploy-image.sh` directly for the same standard path.

## Migration and rollout checkpoints

1. Verify one consistent captured API/submit/poll identity, capacities, approved registry transport and pull credentials.
2. Verify the namespace/RDS/database/runtime-role binding and dedicated migration Secret; complete any separately approved reconciliation beforehand.
3. Follow required backup, migration and schema-drift checks. A failed migration or `alembic check` blocks rollout.
4. Install compatible workers and API from the selected immutable image, waiting for each change order and verifying actual identity/capacity.
5. Check live/ready endpoints, then authorized authenticated operational flows. Health alone does not validate legal documents, subscription grants, prompts, provider configuration or payment callbacks.

Several current migrations require a **stopped-fleet maintenance window**. In particular, Project activity revision `c8d5f1a2e730` uses the host-side `deploy.sh --maintenance-mode` path; do not assume a standard two-phase rolling deployment is valid for every candidate. For approved cloud test, the upstream form is:

```bash
./deploy/sae/deploy.sh --namespace=yuanzhu-test --stage=test \
  --branch=main --commit="$RELEASE_SHA" --maintenance-mode --interactive
```

The maintenance path proves all API/worker roles stopped with zero running instances, backs up, migrates once, installs compatible stopped roles, then starts workers before API. Preserve the existing outcomes flag; first outcome activation belongs to a separate window.

## Separate infrastructure reconciliation

`configure-migration-db.sh`, `configure-network.sh`, `configure-oss.sh` and `configure-cdn.sh` are separate plan/apply tools, not required mutations to repeat at every release. Review their `--help` and read-only dry run against the exact namespace. Apply only the needed approved change. Do not hand-edit migration Secret contents or database ownership to bypass a failed preflight.

`configure-env.sh` supports its approved payment keys, not arbitrary feature switches. The outcome flag requires the complete-cloud-Envs procedure while the API outage is proven. See [production promotion and recovery](/deploy/production).

## Verify and retain evidence

Record candidate/supplier revisions, digest, namespace, resolved application IDs, captured/final capacities, migration head, backup/recovery reference, change orders and operational results. Store secrets separately. Cloud smoke commands need an explicit cloud-test URL and authorized test identities; they do not create a local stack or collect remote source coverage.

If a lifecycle response is ambiguous, reconcile the existing change order and actual workload state before another write. Never infer success from a timeout or rerun the whole release blindly.

## Schema and source evidence for this revision

The current migration path includes Video Assets/reference media, input archive receipts/owned append provenance and member quota configuration/audits. Capture the heads packaged in the candidate and both `alembic current --check-heads` and `alembic check`; a migration that returns zero without schema proof is insufficient.

The private video builder consumes the dependency's default branch and prints its resolved commit. Backend source SHA alone therefore does not identify that supplier wheel. Retain the supplier revision and built image digest, then run the relevant authorized supplier/deployed acceptance gates. A new frontend screen or candidate fixture is not deployed server evidence. Input repair is [separate targeted recovery](/deploy/production#input-recovery), not a routine migration step.

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions). Runtime values and cloud activation must be checked separately.

- [Complete operational runbook](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md)
- [Immutable image build](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/deploy/sae/build-image.sh)
- [Containerized test deployment](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/deploy/sae/run-deploy-container.sh)
- [Protected deployment implementation](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/deploy/sae/deploy.sh)
