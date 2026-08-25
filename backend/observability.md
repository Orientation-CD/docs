# Observability & Safety

The backend is built with production safety and observability in mind. This
page summarizes the mechanisms you should know before deploying or debugging.

## Observability

### Request metrics (`performance.py`)

- Every request is aggregated **in memory**, then flushed as a **compact Redis
  snapshot every 10 seconds** (`PERFORMANCE_METRICS_FLUSH_SECONDS`).
- **Slow / failed requests** are traced within a bounded per-minute log budget
  (`REQUEST_TRACE_LOG_BUDGET_PER_MINUTE`, `REQUEST_TRACE_SAMPLE_RATE`).
- Raw duration samples are bounded
  (`PERFORMANCE_METRICS_STREAM_MAX_ENTRIES`); exact 24-hour terminal totals use
  separate indexes.

### Design-job logging

- **Queue / end-to-end durations** are logged only when unusual
  (`DESIGN_JOB_QUEUE_SLOW_LOG_SECONDS`, `DESIGN_JOB_SLOW_LOG_SECONDS`), and
  failures always eligible subject to the per-minute budget
  (`DESIGN_JOB_TRACE_LOG_BUDGET_PER_MINUTE`).
- **No payloads, credentials, phones or raw unregistered URL paths are
  stored/logged** — this is a deliberate privacy property.

### Health endpoints

- `GET /health/live` — liveness (process is up).
- `GET /health/ready` — readiness (PostgreSQL + Redis reachable, migrations
  applied). Returns `503` until ready.

## Safety mechanisms

### Rate limiting (`rate_limit.py`)

Redis-backed sliding counters. Applied to:

| Scope | What's limited |
| --- | --- |
| IP | WeChat login attempts (`AUTH_RATE_LIMIT_ATTEMPTS` / window) |
| User | Design-job submissions (`DESIGN_RATE_LIMIT_JOBS` / hourly window) |
| User | Share-invitation preview / accept |
| IP | Registration concurrency (`REGISTRATION_CONCURRENT_REQUESTS_PER_PROCESS`) |

### Backpressure

- `MAX_CONCURRENT_REQUESTS_PER_PROCESS` — per-process cap applied before
  request-scoped dependencies (async semaphore).
- `DATABASE_POOL_SIZE` / `DATABASE_MAX_OVERFLOW` — bounded DB pool.

### Input limits

- `MAX_UPLOAD_BYTES` (default 20 MiB), `MAX_REQUEST_BYTES`,
  `MAX_IMAGE_PIXELS` (40M px) — enforced by asset/upload validation.
- `image_validation.py` checks image dimensions/type before storage.

### Concurrency safety for design jobs

- **Admission slots**: `MAX_ACTIVE_DESIGN_JOBS_PER_USER` (5) — active jobs per
  user are capped; extra submissions are rejected until slots free.
- **Idempotency keys**: design submissions and asset uploads carry client
  idempotency keys; the backend dedupes retries.
- **Row locking** (`with_for_update`) prevents race conditions on token
  reservations and first-login user creation.

### Job reconciliation

- `reconcile_stale_design_jobs` cron re-enqueues jobs left inconsistent after
  a crash, so a dead worker never permanently stalls a user's job.
- `reconcile_old_pending_payments` and payment expiry handle stale payment
  orders.
- `cleanup_expired_temp_assets` and `cleanup_orphaned_report_results` keep
  storage tidy.

### HTTP safety (`http_safety.py`)

- Report rendering enforces CSP, `X-Frame-Options`, `Referrer-Policy`,
  `nosniff`, `no-store`.
- Provider result fetches are restricted to allow-listed output hosts
  (`PROVIDER_OUTPUT_HOSTS`) to prevent SSRF.
- Upload URLs and report viewer origins are validated (HTTPS / allow-list).

### Worker graceful shutdown

- Workers stop claiming new work on SIGTERM and let in-flight jobs finish
  (`WORKER_JOB_COMPLETION_WAIT_SECONDS`, default 270 s).
- SAE termination grace must be **longer** than this value (deployment
  preflight enforces it).

## Privacy properties

- Token/phone data never enters logs or metrics.
- Legal consent (agreements) is recorded per user.
- Account lifecycle: users can deactivate; a cron anonymizes due accounts
  (GDPR-style) after the grace period (`ACCOUNT_DEACTIVATION_GRACE_DAYS`).

## Next steps

- [Deploy](/deploy/cloud-architecture) — how these properties are preserved in
  the SAE topology.
- [Configuration Reference](/reference/configuration) — all the tuning knobs.
