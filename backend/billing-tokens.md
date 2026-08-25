# Billing & Tokens

This page explains the token economy and how payments, orders, subscriptions
and entitlements work.

## The token economy

**Tokens** are the internal currency paid for design jobs. Every account has a
ledger (`token_ledger_entries`) that records every credit and debit with a
reason:

| Ledger reason | Direction | When |
| --- | --- | --- |
| `INITIAL_TOKEN_GRANT` | credit | New user registration (configurable; 0 in production if no free tokens) |
| `DESIGN_JOB_RESERVE` | debit (reserved) | Job submission |
| `DESIGN_JOB_SETTLE` | debit (final) | Job completion |
| `DESIGN_JOB_REFUND` | credit | Job failure / cancellation |
| `TOKEN_PURCHASE` | credit | WeChat Pay token package purchase |
| Subscription allowance | credit | Monthly allowance from an active subscription |

The current balance is `users.remaining_tokens`; the ledger is the auditable
history.

## Reserve → settle model

1. **Reserve** (`billing.reserve_design_tokens`): at submission, atomically
   check `remaining_tokens >= estimated_cost` and debit it as a reservation
   (a ledger entry that can be refunded).
2. **Settle** (`billing.settle_design_tokens`): at completion, debit the exact
   final cost and mark the reservation closed.
3. **Refund** (`billing.refund_design_tokens`): on failure, credit back the
   reservation.

This model prevents overspending and ensures users only pay for completed work.

## Store catalog

The billing catalog (`billing_api.py`) exposes:

- **Token packages** — one-off purchases (e.g. N tokens).
- **Subscription plans** — recurring entitlements (currently **single payment +
  manual renewal**, no auto-charge in the first version).

Both are seeded with clearly labelled demo prices locally
(`SEED_DEMO_BILLING_CATALOG`); the admin site manages the real catalog.

## Purchasing with WeChat Pay

### 1. Create the order

The mini program calls e.g.
`POST /api/v1/billing/token-packages/{id}/checkout` (or the subscription
equivalent). The backend:

1. Loads the package/plan and computes the price.
2. Creates a **billing order** (`pending`).
3. Calls **WeChat Pay JSAPI** (`wechat_pay.py`) to create a prepay transaction,
   returning the **payment parameters** (`timeStamp`, `nonceStr`, `package`,
   `signType: RSA`, `paySign`).

### 2. User pays

The mini program calls `uni.requestPayment` with those parameters. WeChat
shows the payment sheet; the user confirms.

### 3. Payment notify

WeChat Pay sends a server-to-server **payment notification** to the backend
webhook. The backend:

1. **Verifies the signature** using the WeChat Pay public key
   (`wechat_pay.py`), and verifies the payload (amount, merchant, out_trade_no).
2. Marks the order **paid**.
3. **Credits tokens** (for a token package) or **activates the subscription**
   (with its monthly allowance).
4. Returns the required WeChat acknowledgement (success).

### 4. Reconciliation & expiry

- `reconcile_old_pending_payments` (cron) handles stale/unconfirmed orders.
- `process_subscription_expirations` (cron) expires subscriptions whose term is
  over.
- `payment_expiry.py` / `payment_reconciliation.py` cover the edge cases.

## Payment modes

- **Mock mode** (local/dev): `MOCK_PAYMENT_ENDPOINTS_ENABLED` +
  `WECHAT_PAY_MODE=mock` route through a **mock payment provider**
  (`mock_payment_server.py`), so the whole purchase flow works without WeChat
  merchant credentials.
- **Real mode** (production): `WECHAT_PAY_MODE=wechat` with real merchant
  keys/certs, JSAPI pay, and the real notify webhook.

## Entitlements & subscriptions

`entitlements.py` + `subscription_entitlements.py` compute what a user is
allowed to do:

- Personal token balance.
- Active subscription benefits (monthly token allowance, feature access).
- Enterprise workspace seats/allowances.

These are checked by the design-job admission path and surfaced to the mini
program (store/subscription pages).

## Workspace billing (seats)

Enterprise workspaces are monetized via **seats** (席位): the owner allocates
seats for members. Seat management lives in the workspace/org module (see
[Workspaces & Organizations](/backend/workspaces-orgs)).

## Full call chain

See [Payment Flow](/reference/flows/payment-flow) for the complete
frontend → backend → WeChat Pay → notify trace.

## Next steps

- [Design Jobs](/backend/design-jobs) — how tokens are consumed.
- [Workspaces & Organizations](/backend/workspaces-orgs) — seats & members.
