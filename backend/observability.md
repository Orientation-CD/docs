# Observe the system without changing it

Three evidence surfaces answer different questions: bounded aggregate history finds patterns, current pressure shows the live environment, and a Job's diagnostics connect a specific execution to source code. None is permission to repeat an uncertain paid operation.

## Signals and retention

| Surface | Evidence | Boundary |
| --- | --- | --- |
| HTTP/stage/Job/Operation/provider history | Same-cohort averages, cumulative elapsed and estimated tails | Redis minute buckets48h and daily buckets14d; bounded series and producer coverage |
| Unique terminal totals | Completed/failed Job throughput | Job-ID deduplication, deletion-safe indexes retained25h; generation samples are not Job counts |
| Live pressure | Incoming/handled RPS, in-flight/admission waiters, queue depth/age, loop lag, DB lock/transaction pressure | Observed process/environment, missing is not zero |
| Job diagnostics/chunks | Workflow/Operation/Submission/generation and safe stage evidence | Private authenticated admin access, finite retained chunks; missing/deleted remains unavailable |

History compares a complete UTC24h or seven complete UTC days to the immediately prior equal window. Current partial minute/day is provisional and excluded from change. p95 needs20 samples; p99 needs100. Bucket bounds are estimates, and overflow has no finite invented upper bound. Partial/missing/reset/incompatible/capped data can retain measured values while suppressing improvement directions. Set `APP_VERSION` to the release commit to identify builds.

## Measurement semantics

HTTP total includes admission/handler phases; Operation execution excludes dependency waiting. Enqueue/due→worker delay is separate from dependency delay. Provider-related elapsed includes transport and observed polling delay, not pure inference time or guaranteed supplier acceptance. Cumulative observed time is not CPU consumption or recoverable savings. Do not add overlapping phases or percentiles.

A fast failure cannot prove successful work became faster. Compare matching route, workflow, configuration, build, execution kind and outcome. Unknown deployment membership is disclosed as observed scope, not all-replica coverage.

## Trace one request

`request_stages.py::request_stage` records paired platform stages. The `request_id` is linked to Job identity at admission or read. Workers correlate Workflow run, Operation, Submission, invocation and generation. `performance stage=... event=start|end|failure elapsed_ms=...` uses existing safe logging; no new instrumentation flag/profile is required. An unmatched start is the last observed position, not proof an external action never happened.

High-volume duration observations remain process-local and flush compact replay-safe batches in the background. There is no per-request Redis/SQL telemetry write. `execution_performance.py::observe_on_commit` publishes committed outcomes; rolled-back transitions must not become success samples. Payloads, prompts, signed URLs, credentials and personal data are excluded from telemetry labels/logs.

## Operational reading order

1. Open [Performance](/admin/performance), choose a measurement and outcome, then inspect priority candidates and cohort/coverage warnings.
2. Check live queue age, DB pressure and process CPU/memory; keep infrastructure monitoring alongside the application view.
3. Open a matching recent Job and align stage evidence with [the runtime tracing guide](/reference/flows/runtime-debugging).
4. Read the persisted retry disposition before deciding recovery. `UNKNOWN` paid acceptance requires reconciliation, not automatic rerender.

Liveness proves this process responds. Readiness proves bounded DB/Redis access; neither proves worker readiness, supplier credits, storage publication or functional AI output. See [deployment recovery](/deploy/production) for authorized actions.

---

Source evidence · backend `e59716c8`: [app/core/request_stages.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/request_stages.py) · [app/core/execution_performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/execution_performance.py) · [app/core/performance_history.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/performance_history.py) · [app/core/performance_reports.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/performance_reports.py) · [app/core/terminal_performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/terminal_performance.py) · [app/core/workflow_diagnostics.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/workflow_diagnostics.py).
