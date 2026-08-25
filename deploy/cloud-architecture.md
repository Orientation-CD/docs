# Cloud Architecture (Aliyun SAE)

Production runs on **Alibaba Cloud Serverless App Engine (SAE)**. This page
explains the design: the image model, the SAE topology, and the safety
contracts that make deployment safe. For hands-on commands, use the
[SAE Deployment Runbook](/deploy/sae-deployment).

## The immutable image model

**One environment-neutral image per Git commit.**

```text
<registry>/yuanzhu-ai-ns/yuanzhu-ai-runtime:<full-git-sha>
```

- Every component (API, submit worker, poll worker, migration, cloud-test
  mocks) uses **the same artifact**.
- The tag is resolved to a **registry digest** before SAE deployment.
- Production **never rebuilds**: it promotes an image that already passed
  cloud-test verification.
- Uncommitted workspace changes are **never** included in an image (always a
  committed revision).

## SAE topology

The backend is deployed as multiple SAE applications sharing the one image,
each running a different command:

| SAE app / job | Process command |
| --- | --- |
| **API** | `sh -c 'exec uvicorn app.main:app --host 0.0.0.0 --port 8080'` |
| **Submit worker** | `sh -c 'python -m arq app.worker.SubmitWorkerSettings'` |
| **Poll worker** | `sh -c 'python -m arq app.worker.PollWorkerSettings'` |
| **Migration Job** | `alembic upgrade head` + verification (fails closed) |
| **Mock image / payment / WeChat** (cloud test only) | the verified mock commands |

They share:

- **PostgreSQL** (e.g. Alibaba Cloud RDS).
- **Redis** (managed Redis or ECS Redis).
- **Object storage** — **Aliyun OSS** (S3-compatible).
- **Secrets** — WeChat Pay merchant keys, Alibaba credentials, etc.

```
                            ┌───────────────────────────────┐
  WeChat (identity/pay) ───►│  SAE: API (uvicorn, :8080)    │
                            │        │                       │
                            │        ▼                       │
                            │  Redis (ARQ queues, limits)    │
                            │        │                       │
                            │  SAE: Submit worker ──► AI provider
                            │  SAE: Poll worker   ──► AI provider
                            │        │                       │
                            │  SAE: Migration Job (alembic)  │
                            │        │                       │
                            │  PostgreSQL / OSS              │
                            └───────────────────────────────┘
```

## Environments

| Environment | Purpose | Mocks? |
| --- | --- | --- |
| **cloud-test** | Integration testing against the real SAE topology | Mock WeChat identity, mock payment, mock image provider |
| **production** | Live product | Real WeChat, real WeChat Pay, real OSS, real AI provider |

A full cloud-test rollout is intentionally sequential:

```text
migration → mock image → mock payment → mock WeChat → submit worker → poll worker → API → automated verification
```

Production rollout is:

```text
migration → submit worker → poll worker → API → live verification
```

## The migration contract (fails closed)

The **Migration Job** is the gatekeeper:

1. Runs `alembic upgrade head`.
2. Verifies with `alembic current --check-heads` that every packaged head is
   applied.
3. Verifies with `alembic check` that the **live physical schema matches the
   application's SQLAlchemy metadata** (catches incompatible columns/indexes/
   constraints/types even when the revision number is correct).

Application rollout **does not continue** if either verification fails.
The Job template is: `Forbid` concurrency, one replica, 600 s timeout, zero
retries. Read-only preflight (`alembic current`, `heads`,
`history -r current:heads`) runs before the real migration, and the template is
parked back to read-only mode after execution.

## Deployment safety properties

- **Two-phase cloud-test deployment** — Phase 1 publishes the image (host-portable
  anywhere with Git + Docker Buildx); Phase 2 deploys from the immutable digest
  and **rejects mutable tags** (`:main`, `:<sha>`).
- **No Docker socket** in the deploy container — the deploy wrapper cannot
  build or replace application images.
- **Managed-field contract** — for cloud-test, deployment only sets the runtime
  image, `Command`/`CommandArgs`, and merges `APP_VERSION=<full-sha>`; existing
  env/secret refs and lifecycle/scaling settings are preserved.
- **Read-only STS preflight** — Alibaba credentials are checked with
  `GetCallerIdentity` before any cloud write.
- **Retry policy** — read-only Alibaba calls are retried (default 3 attempts,
  2 s delay); **mutating** calls (Deploy/UpdateJob/ExecJob) are **not**
  retried (the server may have accepted the write despite a client timeout).
- **Production safeguards** — production forces interactive approval and
  preflights: selected+rollback images exist in ACR, API/workers start from one
  current revision, ≥2 instances, readiness/probe/preStop/300 s termination
  grace, `WORKER_JOB_COMPLETION_WAIT_SECONDS=270`, expand-compatible migration,
  real WeChat Pay config, cloud-test evidence, two-person review.
- **Rollback** never downgrades the database — only redeploys a recorded image
  when the schema stays backward compatible.

## Observability in the cloud

- SLS (Alibaba Log Service) collects SAE Job/application logs; the migration
  log reader pulls Job output oldest-to-newest in paged SLS queries.
- Release records (secret-free Markdown) are written to
  `RELEASE_RECORD_DIR` with SHA/digest, evidence, change-order IDs, approver
  and verification status.

## Next steps

- [SAE Deployment Runbook](/deploy/sae-deployment) — step-by-step commands.
- [CI/CD with GitHub Actions](/deploy/ci-cd) — automation.
- [Production Promotion & Rollback](/deploy/production) — the production path.
