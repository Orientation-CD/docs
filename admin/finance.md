# Finance

The Finance page at `GET /admin/finance` (template `app/templates/admin/finance.html`) reports app revenue, tracked operating costs, and resulting profit, month by month. It is built by `build_finance_report(db, month_count=...)` in `app/finance.py` and served through the process-local admin report cache.

## Controls

| Control | Values | Effect |
| --- | --- | --- |
| Months back | 1 … 36 | How many calendar months to include. |
| Trend view | `overview` / `unit_economics` / `profit` | Which cut of the data to emphasize (see `FinanceTrend`). |

Changing either control auto-submits the form (the selects carry `data-auto-submit`).

## What the report contains

For each month the report reconciles two revenue streams against two deliberately simple cost categories:

**Revenue** (successful payments, fen):
- Subscription revenue + payment count.
- Token-package revenue + payment count.
- Refunds completed in the month.
- Tokens sold (subscription + package).

**Costs** (manually entered — see below):
- `cloud` — cloud infrastructure cost.
- `model_provider` — model/provider usage cost.

**Derived figures**:
- **Gross revenue** = subscription + package revenue.
- **Net revenue** = gross revenue − refunds.
- **Total cost** = cloud + model provider.
- **Profit** = net revenue − total cost.
- **Margin %** = profit ÷ net revenue (null when net revenue ≤ 0).
- Revenue per token and cloud cost per token for unit-economics view.

The Overview dashboard reuses this report (month_count=1) for its MTD revenue/profit/margin KPIs.

## Recording monthly costs

Because provider/cloud spend does not appear automatically in the payment tables, you record it manually. Use the **Record a cost** form, submitted via `POST /admin/finance/costs`.

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Period | month picker | Yes | The billing month, `YYYY-MM`. | current month |
| Category | select | Yes | `cloud` or `model_provider` (`FinanceCostCategory`). | — |
| Amount (fen) | number | Yes | Cost in fen for that month/category. | — |
| Note | text | No | Free-text memo. | — |

This calls `upsert_monthly_cost(...)`: entering the same period+category again **overwrites** that month's figure (upsert). After saving, the admin report cache is cleared so the dashboard and finance page reflect the new cost immediately.

## How to read it

- Use **overview** for the headline: gross → net → costs → profit per month.
- Use **unit_economics** to see revenue-per-token and cost-per-token and spot margin erosion as prices or provider rates shift.
- Use **profit** to track profit and margin trend over the selected window.

## Notes

- All currency is fen; divide by 100 for yuan.
- Refunds are netted in the month they complete, not the month the original sale occurred.
- This is **app-only** finance; external payroll/office costs are not modeled — only `cloud` and `model_provider` are tracked.
