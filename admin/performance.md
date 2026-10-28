# Performance investigations

`/admin/performance` is an authenticated operational dashboard. It now combines priority investigations, outcome-separated historical durations, current runtime pressure and bounded recent Job evidence. It is not a permanent audit store and does not authorize retries, worker restarts or capacity changes.

## Start with one measurable question

Select a history family/measurement, then a complete UTC24h or7d window. Compare to the preceding equal window. Current partial minute/day is provisional; it is visible but excluded from change. Filter route/workflow/configuration/build/execution/outcome before judging a change.

| Measurement | Answers | Does not mean |
| --- | --- | --- |
| HTTP total/admission/handler | Where user-visible HTTP elapsed accumulates | AI generation time or CPU utilization |
| Job generation/total age | A generation's execution vs lifetime | Unique completed Job count |
| Operation execution/dependency/enqueue wait | Running vs waiting for dependencies vs delivery delay | Three additive percentiles |
| Provider-related elapsed | Request through observed result, including transport/poll delay | Pure inference or confirmed supplier acceptance |
| Platform stage | Correctly paired start/end of a named boundary | Every unpaired start completed or never ran |

Rank within the selected measurement by cumulative observed time or estimated p95/p99. Cumulative time is not recoverable savings; parallel/overlapping phases and percentiles cannot be added. Fast failures do not prove successful responses improved. Expand a candidate for count, average, bucket range, previous values and matching cohort details; HTTP phase detail is loaded when expanded.

## Read coverage before reading arrows

| Indicator | Reading rule |
| --- | --- |
| p95/p99 | Need at least20/100 samples; estimates are bucket ranges |
| Overflow | No fabricated finite upper bound |
| Missing/unmeasured | Do not replace with zero |
| Partial/reset/incompatible/capped history | Keep available values, suppress improvement direction |
| Unknown deployment membership | Scope is observed producers, not guaranteed all replicas |
| Build label | Set `APP_VERSION` to the deployed release/commit |

History keeps bounded Redis minute buckets48h and daily buckets14d, flushed replay-safely in the background. Redis loss affects recent operational history, not SQL financial/business facts. Terminal totals use a separate rolling24h default, Job-ID deduplication and deletion-safe indexes for25h. Partial totals are last-recorded, incomplete and possibly stale; they do not establish a failure rate. Separate completed and failed throughput.

## Use evidence to choose the next boundary

Current pressure shows incoming/handled RPS, in-flight/admission waiters, admission/poll queue depth and oldest age, maximum observed event-loop lag, PostgreSQL lock waiters and longest transactions. Pair it with infrastructure CPU/memory/restarts, connections and storage errors.

Recent evidence lists up to ten matching oldest active/recent Jobs. These are investigation entry points, not exact histogram exemplars. Deleted Jobs or missing/truncated diagnostic chunks remain explicitly unavailable. Follow a concrete request/Job/workflow/operation/invocation/generation through [runtime tracing](/reference/flows/runtime-debugging). An absent stage end is a clue, not proof that a paid supplier action did not happen.

## Refresh and implementation map

Detail refresh is60s; live/active Job refresh is10s. Both pause in hidden tabs and preserve filters, expanded details and chart scroll. `/admin/performance/refresh` returns authenticated report HTML; `/admin/performance/live` returns bounded pressure JSON. Unsupported history selection returns422 `PERFORMANCE_HISTORY_SELECTION_INVALID`.

| Source | Responsibility |
| --- | --- |
| `app/admin/performance.py::_performance_page_context` | Build bounded history, health and matching evidence; cache by selection |
| `app/core/performance_reports.py::build_history_performance_report` | Complete equal windows and comparability rules |
| `app/core/performance_history.py::PerformanceHistory` | Bounded process aggregation and replay-safe Redis batches |
| `app/core/execution_performance.py::observe_on_commit` | Publish committed operation/Job outcomes |
| `app/core/request_stages.py::request_stage` | Paired request-stage observation and safe correlation |

See [observability semantics](/backend/observability) before exporting or interpreting the measurements. Read persisted retry classification before any paid recovery action.

---

Source evidence · backend `e59716c8`: [app/admin/performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/performance.py) · [app/core/performance_history.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/performance_history.py) · [app/core/performance_reports.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/performance_reports.py) · [app/templates/admin/performance.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/performance.html).
