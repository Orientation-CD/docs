# Tokens, subscriptions and member quotas

Feature prices, plan benefits, grants and order amounts are server authority. Read `GET /v1/billing/features`; catalog ETag/304 permits reuse of an unchanged representation. A failed read means unknown availability. The [quota full chain](/reference/flows/member-quota-flow) explains the new enterprise member boundary.

## Wallet arithmetic

Spendable balance is `remaining_tokens - reserved_tokens`. A personal workspace bills its User wallet; an enterprise bills its Enterprise wallet, with no personal fallback.

| A10-Token task, starting at1000 | Remaining | Reserved | Spendable |
| --- | ---: | ---: | ---: |
| Before acceptance |1000|0|1000|
| Accepted, reserved |1000|10|990|
| Successful, settled |990|0|990|
| Alternatively failed, released |1000|0|1000|

Reservation ledger deltas are audit evidence, not a second balance debit. Exactly-once transitions prevent a repeated finalizer from settling twice. Enterprise consumption summaries count settled consumption, not reservations, releases or funding.

## Member monthly capacity is a separate calculation

| Field | Meaning |
| --- | --- |
| `limit` | null unlimited; otherwise the effective current member cap |
| `used` | Accepted reservations and settled consumption counted once |
| `reserved` | Pending subset of `used`; **never add it again** |
| `source` | `default`, `custom` or `owner` |
| `month` | Asia/Shanghai calendar month, `YYYY-MM` |

Usage follows the reservation's month even if settlement/release happens later. Released generations contribute zero. Explicit retry generations are separate reservations. Immutable event identities retain attribution after Job deletion. Only historical attributed consumption without a recorded reservation falls back to its settlement month. This differs deliberately from `consumption.current_month`, which remains a settlement-month view.

The current owner can set a global member limit (null or strict integer1..10,000,000) or a member override (null or0..10,000,000). **Every global save clears all overrides**, even unchanged/null values and overrides belonging to departed members. Individual0 is a persistent pause across month changes. An individual save is `custom` even if equal to the default; leaving/rejoining retains it unless a global save cleared it. Owners are unlimited; their consumption is still attributable.

Admission checks enterprise available balance first (`TOKEN_SHORTAGE_WORKSPACE`), then finite member capacity (`used + required <= limit`). A quota rejection is402 `MEMBER_MONTHLY_TOKEN_LIMIT_REACHED`, with `limit`, `used`, `required`. It creates no new Job/reservation/outbox. Same-key accepted replay does not reserve again. Explicit retry uses the original frozen price and its new reservation month; already accepted work can settle/release after a cap is reduced.

## Products, orders and refunds

Plans grant Features and personal-workspace discounts. Checkout snapshots purchased plan identity/numeric benefits; later catalog edits do not rewrite past purchases. Customer Token purchases fund personal wallets. Enterprise funding remains a separate audited administrative adjustment. Quota configuration writes a configuration audit, never a financial event or new balance.

`POST /v1/subscriptions` and `/v1/token-purchases` use durable action keys. Provider-confirmed evidence authorizes fulfillment; a successful client checkout screen alone does not. Payment GETs read local state, while explicit reconciliation queries the provider. See [payment chain](/reference/flows/payment-flow), [refund chain](/reference/flows/refund-flow), [Douyin](/reference/douyin-payment) and [integration status](/reference/integration-status) for current UI availability and operational boundaries.

---

Source evidence · backend `e59716c8`: [app/billing/billing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/billing.py) · [app/billing/member_token_quotas.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/member_token_quotas.py) · [app/workflows/workflow_admission.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/workflow_admission.py) · [app/workflows/submissions/workflow_submission_retry.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/submissions/workflow_submission_retry.py).
