# Tokens, subscriptions and payments

The server owns Feature prices, subscription benefits, package grants and order amounts. Clients discover current products through public `GET /v1/billing/features` and never submit a Token cost or authoritative payment amount.

Catalog responses support ETag/`If-None-Match` and `304 Not Modified`. A failed catalog request means availability is unknown, not that every product is disabled.

## Wallet arithmetic

`remaining_tokens` includes held Tokens; the spendable amount is **remaining minus reserved**. A personal workspace uses its User wallet. An enterprise workspace uses its own Enterprise wallet with no personal-balance fallback.

For a 10-Token task and a starting balance of 1,000:

| Transition | Remaining | Reserved | Spendable |
| --- | ---: | ---: | ---: |
| Before admission | 1000 | 0 | 1000 |
| Accepted: reserve | 1000 | 10 | 990 |
| Successful: settle | 990 | 0 | 990 |
| Alternatively failed: release | 1000 | 0 | 1000 |

Ledger events distinguish reservations, consumed work, releases, funding and adjustments. Reservation deltas are audit events, not an additional balance debit. Idempotent state transitions prevent repeated settlement/release. Enterprise settled consumption excludes temporary holds and funding changes.

## Products and entitlements

Features own current Token prices and map to executable Workflows. Standard/premium subscription plans grant Features and personal-workspace discounts. Checkout snapshots the purchased plan identity and numeric benefits, so later catalog edits do not rewrite an existing purchase. A user has at most one pending or active subscription across tiers; there is no current tier-switch/early-renewal API.

Token packages separate paid and bonus grants. Customer purchases fund the **personal** account; enterprise pools are managed separately through audited administrator adjustments. New-account grants use the current New user registration Campaign amount, with `INITIAL_USER_TOKENS` as fallback; changes affect future grants.

## Payment lifecycle

Create `/v1/subscriptions` or `/v1/token-purchases` with a durable idempotency key and the supported checkout `type`. Use `/v1/payments` for history and the order's pay/close/refunds operations. Provider-confirmed evidence, not a successful client checkout screen, authorizes fulfillment. Purchased-token batches and refund reservations protect used Tokens from being refunded twice.

WeChat and Douyin have separate signing, callback and compensation paths. Douyin uses `type: douyin`, channel reconciliation endpoints and its own mock/live mode. See [Douyin payments](/reference/douyin-payment). Payment polling reads local state; channel reconciliation actively queries provider evidence.

Referral rewards become claimable only after the qualifying purchase/use conditions, then require an explicit claim. [Campaigns](/admin/campaigns) changes amounts for future events, not historical ledger entries. Detailed errors and refund rules are in [REST API](/reference/rest-api).

At this baseline both Mini Programs keep refund-application entry points closed. Server refund APIs remain implemented, but WeChat query recovery and subscription reclamation have documented gaps; admin anomaly display is not a manual approval/resolution workflow. See [Billing operations](/admin/billing).

---

Source evidence · backend `b13cc566`: [app/billing/billing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/billing/billing.py) · [app/billing/billing_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/billing/billing_api.py) · [documents/PAYMENT_REFUNDS.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/PAYMENT_REFUNDS.md).
