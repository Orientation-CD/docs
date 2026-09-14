# Performance

The Performance page at `GET /admin/performance` (template `app/templates/admin/performance.html`) shows how the running service is behaving: HTTP throughput/latency, job execution times, queue depths, and a live snapshot. Reports come from `app/performance.py`.

## Controls

| Control | Values | Effect |
| --- | --- | --- |
| Minutes | 5 … 60 | Sliding window for HTTP minute charts. |
| Hours | 1 … 24 | Window for job-performance aggregation. |
| Trend | traffic / latency / failures / admission_queue / poll_queue / jobs | Which chart/table emphasis to show (`PerformanceTrend`). |

Changing a control auto-submits.

## HTTP performance

`build_http_performance_report(db, window_minutes=...)` aggregates request events into per-minute buckets. Each minute includes:

- Incoming count, handled count.
- Total average and p99 latency ms, split into **admission** (queue wait) and **handler** (work) segments.
- Status 4xx, 429 (rate limited), 5xx counts.
- Admission-queue average depth, max depth, and oldest queued request age.

## Job performance

`build_job_performance_report(db, window_hours=...)` aggregates design-job duration and outcomes:

- Per-minute job throughput and duration metrics.
- Failure counts by normalized error code.
- Terminal outcome summary (completed/failed and completion rate) — also used by the dashboard.

Both HTTP and job reports are cached in the process-local `AdminReportCache` (keyed by window settings).

## Live performance snapshot

`build_live_performance_report(...)` is **not cached**. It is served as JSON at `GET /admin/performance/live` and rendered by the page. It reports:

- Incoming RPS, handled RPS, in-flight requests.
- Admission waiters, HTTP p99, server-error rate, rate-limited rate.
- Admission-queue depth and event-loop lag.
- Active job count and DB lock waiters.

### Active job snapshot & runtime bottleneck

- `build_active_job_snapshot(...)` lists currently running jobs.
- `build_runtime_bottleneck_report(...)` cross-references slow jobs, queue depths, and lock waiters to point at the actual bottleneck (worker pool vs. provider vs. DB).

## Refresh mechanism

- `GET /admin/performance/refresh` performs a **full page replacement** — it rebuilds the HTML with freshly computed reports (cache-refreshed) and the browser swaps the document.
- The live snapshot (`/admin/performance/live`) polls independently on an interval so the top-of-page live metrics move without disturbing the historical charts.
- Because cached reports have a TTL, the charts may lag the live snapshot by up to the cache window; use `/refresh` to force a recompute.

## How to use it

- **Latency trend rising** → check admission-queue depth: waiters piling up means the worker/admission pool is saturated (queue bottleneck), not the DB.
- **5xx climbing** → correlate with [providers](/admin/providers) and [failed jobs](/admin/design-jobs?status=failed).
- **Slow active jobs** → the runtime-bottleneck section and the dashboard alert tell you whether to inspect a job or scale out a provider.
