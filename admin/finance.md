# Finance and monthly costs

`/admin/finance` combines recorded customer receipts/refunds with manually recorded cloud/model costs. All monetary inputs use integer **fen**; 10,000 fen is CNY 100.

## Record costs

Choose a month, `cloud` or `model_provider`, nonnegative amount and optional note. Saving the **same month and category replaces its total**; it does not append another invoice. Aggregate all intended invoices before submitting that monthly total and keep invoice context in the note/evidence.

The page accepts a 1–36-month range (default 12) and overview, unit-economics or profit trends. Finance aggregates use UTC month boundaries. Marketing's monthly finance projection shares the finance basis, while its daily customer window uses Shanghai dates.

## Interpret the result

| Value | Interpretation |
| --- | --- |
| Gross receipts | Confirmed customer receipts in the defined period |
| Refunds | Recorded successful refunded amounts |
| Net receipts | Gross less refunds |
| Cloud/model costs | Explicit monthly cost entries |
| Operating difference | Net receipts less complete recorded costs |

Missing costs are missing evidence, not zero expense. Do not claim complete profit or compare margins when required categories are unavailable. Internal Token consumption is a separate operational unit, not the payment amount in fen.

This page is not a refund approval or provider invoice payment screen. Payment reconciliation and anomaly display are in [Billing](/admin/billing). For customer funnel/retention use [Marketing](/admin/marketing).

---

Source evidence · backend `e59716c8`: [app/admin/billing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/billing.py) · [app/billing/finance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/finance.py) · [app/templates/admin/finance.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/finance.html).
