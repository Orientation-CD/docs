# Marketing Data (read-only)

The Marketing dashboard at `GET /admin/marketing` is a **read-only** operational evidence surface (per the read-only policy). It exists so pricing and growth decisions are based on real retained records rather than estimates. It does not attribute results to any campaign and it never changes business state.

## Two-part page

The HTML shell (`app/templates/admin/marketing.html`) only renders the date-range picker and panels. The numbers come from `GET /admin/marketing/data` — a JSON endpoint built by `build_marketing_report(...)` in `app/marketing.py`. The page fetches that JSON (client-side) and draws the charts; this keeps heavy queries off first paint.

## Choosing a date range

Range parsing is done server-side by `parse_marketing_range(start_value, end_value, *, as_of)`, which validates paired ISO dates and derives Shanghai-timezone UTC boundaries.

**Quick ranges** (one click):

| Button | Window |
| --- | --- |
| Today | Current Shanghai day (partial). |
| Yesterday | Previous full Shanghai day. |
| Last 7 days | Rolling 7-day window. |
| Last 30 days | Rolling 30-day window. |

**Custom range**: pick a start and end date and click **Apply custom range**. The displayed range and "last refreshed" timestamp appear at the top.

> "Today is still in progress" — today's figures are partial. Missing history is shown as a gap, never as a fake zero.

## What the report shows

The report is organized into separated panels so people, jobs, money, and tokens are never mixed on one scale:

### Business snapshot
- **New users** — sign-ups in range.
- **Generation-active users** — users who ran a successful job in range.
- **Paying users** — users with a successful payment in range.
- **Net receipts** — actual paid minus refunded amounts (real ledger amounts, not current catalog prices).

### Audience (registration & activation)
- Cumulative retained users and first-successful users over time.
- Completed image jobs and completed report jobs.

### Revenue (payments & usage)
- First paying users, gross receipts, refunds, net receipts.
- Customer tokens vs. provider tokens (what customers paid in vs. what providers consumed).

### Daily evidence / Trends
- Daily charts kept on separate honest scales: people, completed jobs, net receipts in yuan, and token settlement records per UTC day. Gaps remain gaps.

### Conversion, repurchase & retention
- Cohort and conversion readouts derived from the retained records.

## Performance & failure behavior

- The query runs under a **2-second budget** (the data call uses a ~1.8s `anyio` deadline).
- If the query times out or conflicts, the page shows the previous successful result with a "Marketing data is unavailable / Showing the previous successful result" notice and a **Retry** button.
- `Cache-Control: private, no-store` is set on the data endpoint; clicking **Refresh data** re-fetches.

## Data sources

All metrics come from durable operational tables: `User` (registrations, last login), `DesignJob` / token ledger (active users and completed jobs), `PaymentOrder` / `RefundOrder` (receipts, refunds, paying users), and token ledger scopes (customer vs. provider tokens). It is historical truth, not a real-time live feed.
