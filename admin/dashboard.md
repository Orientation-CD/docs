# Overview dashboard

`/admin` combines durable business results, current account composition and operational follow-up. It is a read-only summary; use the linked domain page for any mutation.

## Read the panels

The summary includes today's completions, the 24-hour terminal-job completion rate, 30-day active users and month-to-date financial results. These have different windows; changing the completed-jobs chart does not redefine every headline metric.

The completed-jobs chart accepts **7 or 30 days**, groups by UTC day, and separates personal/enterprise billed work. The active account mix classifies current non-admin customers as personal, enterprise member or enterprise owner. It is not the same metric as generation-active users in [Marketing](/admin/marketing).

The action center refreshes through authenticated `/admin/overview/alerts`. Each alert links to its detailed operational surface. Jobs requiring attention link into [Jobs](/admin/design-jobs); inspect the task family and generation before intervening.

## Follow an alert

| Observation | Next step |
| --- | --- |
| Slow or failed work | Inspect task detail/diagnostics, then [Performance](/admin/performance) |
| Commercial or balance issue | Inspect [Billing](/admin/billing), wallet ledger and settled consumption |
| Configuration unavailable | Check model modalities, node selection and Feature activation |
| Missing financial result | Check complete monthly costs and the chosen time window |

A summary does not prove payment gateway settlement or a supplier's real-time health. Use durable order/task evidence and [observability](/backend/observability) to explain a particular incident.

---

Source evidence · backend `e59716c8`: [app/admin/dashboard.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/dashboard.py) · [app/admin/overview.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/overview.py) · [app/templates/admin/dashboard.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/dashboard.html).
