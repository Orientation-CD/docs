# Performance dashboard

`/admin/performance` separates HTTP pressure, durable Job health and queue/execution phases. Authentication uses the normal admin session; this is not a public metrics endpoint.

## Choose the view

The page preserves independent job-health hours, trend type and rolling minutes. Trend choices cover traffic, latency, failures, admission queue, poll queue and job phases. Historical reports may use a short admin cache; live pressure is collected separately.

| Signal | What it helps distinguish |
| --- | --- |
| Incoming vs handled traffic | Demand and admission/processing capacity |
| Total, admission wait, handler time | Queueing before the handler vs application work |
| p99 estimates / event-loop lag | Tail pressure rather than only average latency |
| 4xx, 5xx, provider/result/interruption failures | Expected rejection vs infrastructure or execution failure |
| Queue depth and oldest age | Backlog size and how long work has waited |
| Submission/finalization phases | Provider dispatch vs result validation/storage |

The page uses authenticated `/admin/performance/refresh` for report HTML and `/admin/performance/live` for bounded live JSON. Missing samples or unavailable collection are not zero traffic. Percentiles are bounded aggregates, not an unlimited request trace database.

## Investigate a bottleneck

Start from the slow stage and a concrete task/request ID. Check [Jobs](/admin/design-jobs) diagnostics for the matching attempt generation, DB pressure for long transactions and storage/provider evidence for external stages. Increasing the provider timeout cannot solve admission saturation.

No button here restarts workers, changes production capacity or authorizes replay of an uncertain paid provider request. Those actions follow [deployment](/deploy/sae-deployment) and the persisted retry contract. See [observability](/backend/observability) for health-probe limits.

---

Source evidence · backend `b13cc566`: [app/admin/performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/performance.py) · [app/core/performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/performance.py) · [app/templates/admin/performance.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/performance.html).
