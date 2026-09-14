# Observability

The backend is designed to be observable in production without leaking secrets
or unbounded metric cardinality. This page covers structured logging, the
in-process metrics pipeline, performance reports, the admin performance
dashboard, and the safety guarantees around what is (and is not) recorded. Code
lives in `app/performance.py`, `app/http_safety.py`, `app/overview.py`, and
`app/maintenance_jobs.py`.

## Request ID & structured logging

Every request gets a 32-hex-char **request id** (`http_safety.py`): it is
generated if the client does not send one, attached to the response, and used
as the correlation id in every log line emitted while handling that request.
Log paths are sanitized: raw UUID path segments are normalized to `/{id}` and any
non-safe character is replaced, so user-supplied path text can never inject into
log output.

## What is never logged

A hard safety rule documented in the env comments: **no payloads,
credentials, phone numbers, or raw unregistered URL paths are stored in
metrics.** The metric pipeline records only registered route templates, status
codes, durations, and error codes — never query strings or body contents.

## HTTP performance metrics

`app/performance.py` aggregates every request **in memory**, then flushes one
compact snapshot to Redis every `PERFORMANCE_METRICS_FLUSH_SECONDS` (default 10s).

| Setting | Default | Meaning |
| --- | --- | --- |
| `REQUEST_SLOW_LOG_SECONDS` | 2 | requests slower than this are traced |
| `REQUEST_TRACE_SAMPLE_RATE` | 0.001 | sample 0.1% of healthy requests |
| `REQUEST_TRACE_LOG_BUDGET_PER_MINUTE` | 30 | cap on trace lines per minute |
| `PERFORMANCE_METRICS_FLUSH_SECONDS` | 10 | flush cadence to Redis |
| `PERFORMANCE_METRICS_STREAM_MAX_ENTRIES` | 5000 | bound on raw duration samples |

Only **slow/failed** requests are traced in full; healthy requests are sampled
at 0.1%. Repeated identical errors are suppressed by a per-minute budget
(`_UNHANDLED_ERROR_LOG_BUDGET`) so a runaway failure mode cannot flood logs.

Excluded from metrics: `/health/live`, `/health/ready`,
`/admin/performance/live`, `/admin/performance/refresh`.

## Design-job performance

Job-level tracing is governed by separate thresholds:

| Setting | Default | Meaning |
| --- | --- | --- |
| `DESIGN_JOB_QUEUE_SLOW_LOG_SECONDS` | 30 | flag slow provider-queue wait |
| `DESIGN_JOB_SLOW_LOG_SECONDS` | 120 | flag slow end-to-end job |
| `DESIGN_JOB_TRACE_LOG_BUDGET_PER_MINUTE` | 20 | cap on job trace lines per minute |

Successful jobs are logged only when their queue or end-to-end time is unusual;
**failures are always eligible** (subject to the budget).
`record_job_performance_event` feeds a bounded event stream used by the job
performance report.

## Exposed metrics & reports

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `/metrics` | internal | compact performance snapshot |
| `/health/live` | public | liveness |
| `/health/ready` | public | readiness (Postgres + Redis reachable) |
| `/admin/performance/live` | admin | live HTTP + job performance report |
| `/admin/performance/refresh` | admin | force a metrics refresh |

`build_http_performance_report` aggregates per-route request rate, error rate,
and latency percentiles over a rolling window. `build_job_performance_report`
combines `DurationMetric`, `JobMinuteMetric`, `ActiveJobSnapshot`, and
`TerminalOutcomeSummary`. `build_runtime_bottleneck_report` highlights where
workers are stuck (queue depth, active job snapshots, terminal outcome mixes).

The admin overview page (`app/overview.py`) surfaces these aggregates to
operators. `ADMIN_REPORT_CACHE_SECONDS` (default 10) caches rendered admin
reports briefly.

## Periodic maintenance jobs

`app/maintenance_jobs.py` registers ARQ tasks that also double as observability
touchpoints:

| Job | Pool | Purpose |
| --- | --- | --- |
| `process_expire_user_subscriptions` | both | flip expired personal subscriptions |
| `process_expire_locked_user_subscriptions` | both | expire under a lock |
| `process_anonymize_due_user_accounts` | both | irreversibly anonymize past-grace accounts |
| `process_reconcile_stale_design_jobs` | both | re-drive jobs lost mid-flight |
| `process_cleanup_temporary_assets` | both | delete expired un-completed uploads |
| `process_cleanup_provider_staging_artifacts` | both | remove provider staging objects |
| `process_cleanup_report_result_artifacts` | poll | garbage-collect old report results |
| `process_reconcile_report_templates` | poll | align stored reports with current templates |
| `process_record_provider_job_performance_events` | both | flush job-performance events |
| `process_record_runtime_bottleneck_metrics` | both | refresh bottleneck report |

Worker verbose logs are off by default (`WORKER_VERBOSE_LOGS=false`); enable it
only when debugging a specific pipeline issue.

## A typical log line

Requests carry the request id as a structured field, so a single user action
can be traced from the API through both workers. Error lines include a stable
`error_code` (normalized from PostgreSQL `sqlstate` and domain exceptions) but
never the offending SQL, the payload, the phone number, or raw URL path. Slow
requests additionally carry the bounded route template, status, duration, and
which dependency was slow. This keeps logs useful for triage without becoming a
data-leak vector.

## Safety & recovery posture

- **PostgreSQL snapshot recovery** (#238): the system of record is PostgreSQL;
  recovery procedures rely on taking and restoring database snapshots rather
  than rebuilding from logs, so durable state always lives in the DB and never
  only in Redis or logs.
- **Idempotent workers** make maintenance jobs safe to retry; cleanup and
  reconciliation tasks are deliberately idempotent and bounded by batch sizes.
- **Bounded budgets everywhere** (per-minute log budgets, stream entry caps,
  batch sizes) mean a failure storm degrades logging gracefully instead of
  overwhelming storage.

## Read next

- [Architecture](/backend/architecture) — middleware and worker topology.
- [Getting Started](/backend/getting-started) — health checks.
