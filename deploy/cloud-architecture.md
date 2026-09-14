# Cloud Architecture (Aliyun SAE)

Production runs on **Alibaba Cloud Serverless App Engine (SAE)**. This page explains the
design: the immutable image model, the SAE namespace topology, how configuration and
credentials are managed, and the safety contracts that make deployment safe. For
copy-paste commands, use the [SAE Deployment Runbook](/deploy/sae-deployment).

## The immutable image model

**One environment-neutral image per Git commit.**

```text
<registry>/<acr-namespace>/yuanzhu-ai-runtime:<full-git-sha>@sha256:<digest>
```

- Every component — API, submit worker, poll worker, the temporary migration runner —
  uses the **same artifact**. Mock servers are not deployment targets.
- The tag is resolved to a **registry digest** before SAE is touched. Phase 2 rejects
  mutable tags (`:main`, `:<sha>`) and requires the supplied full-SHA tag to resolve to
  the supplied digest.
- Production **never rebuilds**: it promotes an image that already passed cloud-test
  verification.
- Uncommitted workspace changes are **never** included in an image (always a committed
  revision).

## Namespaces: resources are namespaced, stages are separate

SAE namespaces are the **resource boundary**. Two namespaces exist:

| Namespace | Public API origin | OSS bucket | Purpose |
| --- | --- | --- | --- |
| `yuanzhu-test` | `https://test-api.yuanzhushuzhi.com` | `yuanzhu-ai-dev-1785341496` | Cloud-test integration |
| `yuanzhu-prod` | `https://api.yuanzhushuzhi.com` | `yuanzhu-ai-prod` | Production |

Within each namespace the three canonical workload names are fixed:

| Canonical workload | Process command |
| --- | --- |
| `yuanzhu-ai-api` | `/bin/sh -c 'exec uvicorn app.main:app --host 0.0.0.0 --port 8080'` |
| `yuanzhu-ai-submit-worker` | `/bin/sh -c 'exec python -m arq app.worker.SubmitWorkerSettings'` |
| `yuanzhu-ai-poll-worker` | `/bin/sh -c 'exec python -m arq app.worker.PollWorkerSettings'` |

The migration runner is **temporary**: a one-instance SAE application created only for
the duration of a release, then deleted. SAE Job templates cannot reference namespace
Secrets, so the migration executor is a temporary application that copies the API's
network/image-pull settings and maps `MIGRATION_DATABASE_URL` to process variable
`DATABASE_URL`.

### Namespace-safe tooling (#212)

Every deploy script takes an explicit `--namespace` and resolves all resource IDs
(`AppId`, Secret names, RDS instance, CLB, DNS record, bucket) **at runtime** from the
selected namespace. Nothing namespace-specific is hard-coded:

- `configure-network.sh`, `configure-oss.sh`, `configure-migration-db.sh`, and
  `configure-cdn.sh` all accept `--namespace=yuanzhu-test` or `--namespace=yuanzhu-prod`
  and plan/apply against only that namespace's resources.
- Read-only preflight (`--dry-run`) never mutates cloud state and reports drift.
- RAM permissions are scoped to the namespace resources the command resolves.

This means the same script source deploys either environment; you cannot accidentally
point a test run at production resources by editing a constant.

### Release stage is decoupled from namespace (#215)

`--stage` classifies **release risk**, independently of the namespace name:

- `--stage=test` — routine, interactive, allows mocks.
- `--stage=production` — protected promotion/rollback only; forces two-person review,
  evidence capture, and the API-stop database-write fence.

The stage never renames the namespace and never rewrites the cloud-owned
`ENVIRONMENT`. A test-stage deployment of an application already configured with
`ENVIRONMENT=production` is rejected. This decoupling lets a temporarily misnamed
namespace (e.g. `yuanzhu-test` still serving real traffic during a cutover) receive the
correct production safeguards without re-provisioning it.

## Request flow

```text
                          ┌──────────────────────────────────────────────┐
  WeChat (login / pay) ──►│  DNS (AliDNS) → CLB :443 → yuanzhu-ai-api   │
                          │        │   (HTTPS, cert-terminated)         │
                          │        ▼                                    │
                          │  Redis (ARQ queues: admission / poll)       │
                          │        │                                    │
                          │  yuanzhu-ai-submit-worker ──► AI provider   │
                          │  yuanzhu-ai-poll-worker   ──► AI provider   │
                          │        │                                    │
                          │  RDS PostgreSQL        OSS (S3-compatible)  │
                          └──────────────────────────────────────────────┘
```

1. The mini program calls the public API over HTTPS on `443`, terminated by an
   SAE-managed CLB that forwards to container port `8080`.
2. The API reads/writes RDS PostgreSQL and enqueues work onto Redis.
3. The submit worker drains the admission queue and calls the AI provider; the poll
   worker drains the poll queue and reconciles async provider jobs.
4. Binary assets live in OSS; the browser uploads directly via presigned forms and
   downloads private assets via presigned URLs (or the authenticated private CDN).

## Managed cloud resources

| Resource | What it is | How it is managed |
| --- | --- | --- |
| **RDS PostgreSQL** | Primary database per namespace | `configure-migration-db.sh` owns roles/secrets; runtime app uses the `yuanzhu_app` account |
| **Redis** | ARQ queues + short-lived cache | Shared connection string from the API environment |
| **OSS bucket** | Object storage (versioned, AES-256) | `configure-oss.sh` reconciles ACL, CORS, lifecycle |
| **CLB / listener** | SAE-managed load balancer, `443 → 8080` | `configure-network.sh` reconciles |
| **TLS certificate** | CAS certificate covering API + CDN hostnames | Purchased/issued out-of-band; never bought by the scripts |
| **AliDNS** | A records for API + CDN hostnames | `configure-network.sh` / `configure-cdn.sh` |
| **CDN (ESA)** | Public + private asset delivery | `configure-cdn.sh` reconciles |
| **SLS** | Log Service for SAE app/Job logs | Collects deploy + migration output |

### CDN delivery model

Each namespace has two CDN domains, kept strictly separate:

```text
https://public.cdn.yuanzhushuzhi.com/logo.png
  -> oss://yuanzhu-ai-prod/public/logo.png        (anonymous, public only)

https://presign.cdn.yuanzhushuzhi.com/<asset-id>?auth_key=...
  -> oss://yuanzhu-ai-prod/temp/assets/<asset-id>  (Type-A signed, private)

https://test-public.cdn.yuanzhushuzhi.com/...       (test namespace)
https://test-presign.cdn.yuanzhushuzhi.com/...      (test namespace)
```

The public CDN is restricted to the bucket's `public/` prefix. The private CDN
rewrites to `temp/assets/` and requires Alibaba CDN **Type-A URL authentication** with a
per-namespace signing key stored in that namespace's SAE Secret. Browser uploads always
use the public OSS service endpoint (`S3_PRESIGN_ENDPOINT`) — a CDN hostname is **not**
a drop-in replacement for it. Root-level WeChat verification files are served from
`https://static.yuanzhushuzhi.com` (test).

## Configuration management: the provider catalog

Provider dispatch is no longer a single `PROVIDER_*` env blob. The admin console
(Studio Control) configures a **normalized catalog** that the worker reads at runtime:

```text
ProviderConnection  (provider_connections)
  └─ base_url, adapter, submit_path, status_path, auth header/scheme,
     output_hosts, encrypted_api_key (Fernet)
        │
        ▼ 1:N
ProviderModelConfig  (provider_model_configs)
  └─ model_id, image_size, output_format, watermark,
     request_shapes[], supports_masked_input
        │
        ▼ N:N  (provider_model_catalogs)
DesignJobType / Catalog  (design_job_types, key = catalog key)
  └─ display_name, token_cost, result_kind, masked_image_required,
     reference_image_required, is_active, selected_model_config_id
```

At submit time the worker loads `selected_model_config_id` for the job's catalog key,
validates the connection/model pair against the adapter capability envelope
(`mock_async`, `seedream`, `doubao_text`, `gpt_image`), decrypts the API key, and
captures a **non-secret JSON snapshot** (`schema_version: 2`, connection + model IDs and
versions, base_url, paths, output hosts) plus a separately encrypted key on each
`DesignJobSubmission`. A job always runs against the exact provider generation it was
submitted with, even if an admin re-saves the catalog later.

The normalized request/response contract (`app/providers/base.py`) classifies every
job as one of three shapes — `SINGLE_IMAGE`, `IMAGE_WITH_REFERENCE`, or
`RECORDING_SEQUENCE` — and every adapter must either accept the shape or fail closed.

## Migration credential separation (#214, #234)

Database roles and Secrets are deliberately split:

- The **runtime** account (API + workers) has only application DML: `CONNECT`, schema
  usage, table DML, sequence, type, and matching default privileges — **no ownership**.
- The persistent object owner is `yuanzhu_app`.
- The dedicated migration runner uses a namespace-local Opaque Secret
  `yuanzhu-migration-secrets` containing **only** `MIGRATION_DATABASE_URL`. API and
  workers never mount this Secret; only the temporary migration runner maps its key to
  `DATABASE_URL`.
- `configure-migration-db.sh` is the **only** path that creates accounts, rotates
  passwords, transfers ownership, or writes the migration Secret. It is idempotent,
  defaults to read-only `--dry-run`, and performs ownership transfers in one transaction
  via a short-lived privileged account that is deleted on every exit path. Passwords
  exist only in process memory and are never passed as arguments, files, or app config.

## PostgreSQL snapshot recovery (#238)

Before any migration runner is created, the deploy phase:

1. Validates the namespace's explicit RDS instance ID and backup policy.
2. Requires **at least seven days** of backup retention.
3. Creates a **new full physical or snapshot backup**, polls the returned backup job ID,
   and verifies the exact backup set is successful, manual, full, physical/snapshot, and
   available for recovery.
4. Never calls `DeleteBackup`, so older recovery points rotate under the provider policy
   but a failed release always keeps the new one.

Dry-run only performs the reads and reports the proposed backup; it does not create one.

## Migration contract (fails closed)

The temporary migration runner runs in two phases:

1. **Preflight (read-only):** `alembic current`, `alembic heads`,
   `alembic history -r current:heads --verbose`.
2. **Apply (after interactive approval):** `alembic upgrade head`, then
   `alembic current --check-heads` (every packaged head applied) and
   `alembic check` (live physical schema matches SQLAlchemy metadata).

Application rollout does not continue if either verification fails. The runner stays
alive after printing an explicit success/failure marker so SAE cannot restart and repeat
a finished operation, and is deleted on success, failure, cancellation, and the
top-level cleanup path.

## Environments at a glance

| Environment | Namespace | Mocks? | Rollout |
| --- | --- | --- | --- |
| cloud-test | `yuanzhu-test` | mock image / payment / WeChat | migration → submit worker → poll worker → API → verification |
| production | `yuanzhu-prod` | real WeChat, real WeChat Pay, real OSS, real AI | capture → stop API → backup → migration → workers → API → start → verification |

## Observability

- SLS collects SAE application and Job logs; the migration log reader pulls Job output
  oldest-to-newest in paged SLS queries.
- Release records (secret-free Markdown) are written to `RELEASE_RECORD_DIR` with
  SHA/digest, namespace ID, resolved AppIds, per-role identity/capacity, evidence,
  change-order IDs, approver, and verification status.

## Next steps

- [SAE Deployment Runbook](/deploy/sae-deployment) — step-by-step commands.
- [CI/CD with GitHub Actions](/deploy/ci-cd) — automation.
- [Production Promotion & Rollback](/deploy/production) — the production path.
