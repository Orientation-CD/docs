# Overview Dashboard

The dashboard is the landing page at `GET /admin` (template `app/templates/admin/dashboard.html`). It is a decision-focused, at-a-glance summary of the business. It does not replace the detailed Marketing, Finance, Performance, or Jobs pages — it points you to them.

## Report source & window

The page is built by `build_overview_report(db, redis, settings, days=...)` in `app/overview.py`. The `days` query parameter accepts only **7** or **30**; the header control lets you switch between them. All figures are computed from durable operational records (token ledger, design jobs, payments, refunds, users) — nothing is estimated.

## KPI cards

The top row shows the following metrics:

| KPI | Meaning |
| --- | --- |
| Completed Today | Jobs successfully completed in the current UTC day (personal + enterprise). |
| 24h Completion Rate | Share of terminal jobs in the last 24 hours that completed successfully (from the terminal-outcome summary). |
| Active Users · 30 days | Non-admin accounts that were active and logged in within the last 30 days. |
| Net Revenue · MTD | Month-to-date net revenue in fen (successful payments minus refunds), from the Finance report. |
| Profit · MTD | Month-to-date profit in fen (net revenue minus tracked cloud + model cost), with a margin percentage. |
| Provider Tokens Consumed | Sum of provider-side tokens billed for completed design jobs. |

## Charts

- **Completed Jobs by Account Type** — a daily bar/area chart splitting completed jobs into **personal** and **enterprise** scope, over the selected 7- or 30-day window. It is driven by `TokenLedgerEntry` rows of reason `DESIGN_JOB_CONSUMED`.
- **Active Account Mix** — a donut showing the composition of active non-admin accounts: **personal** users, **enterprise members**, and **enterprise owners**. Admins are excluded.

## Action Center (alerts)

The "Needs Attention" panel (`app/templates/admin/_overview_alerts.html`) lists actionable conditions. It auto-refreshes every **60 seconds** from `GET /admin/overview/alerts`, which returns the same alert list as a JSON fragment. Each alert has a severity and a deep link:

| Alert | Severity | When it fires | Deep link |
| --- | --- | --- | --- |
| Active jobs need attention | critical | Jobs still pending/running beyond the configured slow-job threshold (`design_job_slow_log_seconds`). | `/admin/design-jobs` |
| Job failures in 24 hours | warning | Failed jobs within the last 24h. | `/admin/design-jobs?status=failed` |
| Refund activity needs review | warning | Refund orders that failed, or have been pending for over an hour. | `/admin/billing` |
| Pending payments need reconciliation | warning | Payment orders that passed their payment deadline + close grace period without resolving. | `/admin/billing?status=pending` |
| Enterprise accounts are full | info | Active workspaces whose member count has reached their member limit. | `/admin/workspaces?capacity=full` |

When no alerts exist, the panel shows a "no immediate action required" message.

## Jobs needing attention

Below the charts, a list of up to 8 jobs that need eyes: failed jobs first (sorted to the top), then stuck pending/running jobs, newest first. Each links to the [job detail](/admin/design-jobs) screen.

## Interpreting the dashboard

- Treat the dashboard as a **triaging surface**, not a report you export. Numbers are bounded and may lag the live system by up to a minute because of the 60s alert refresh and report caching.
- The MTD revenue/profit figures come from the same [Finance](/admin/finance) report; open Finance if you need monthly breakdowns or to record costs.
- "Active jobs need attention" is your prompt to open [Jobs](/admin/design-jobs) and inspect or mark-failed stuck work.
