# Payment Flow (End-to-End)

This is the full call chain for **buying tokens or a subscription** — from opening the
billing page to receiving credit. It covers both a token package and a subscription, the
WeChat JSAPI hand-off, the async callback, and the (dev-only) mock shortcut.

## Part 0 — Frontend opens billing

```
User opens billing / plans
        │
        ▼
GET /v1/billing/catalog
  (billing_api.py → /v1/billing/catalog)
  → TokenPackages + SubscriptionPlans + current entitlements
Frontend pkg-plans + pkg-account/services
  (plansPage.ts, mockWallet.ts for local mock mode)
```

## Part 1a — Create a token purchase

```
POST /v1/token-purchases
  body: { package_id }
        │
        ▼
billing_api.py: create_token_purchase
  1. get_current_user; ensure_payment_mode(settings)
       WECHAT_PAY_MODE = mock | live | disabled
  2. load TokenPackages row (active), resolve price in CNY fen
  3. payment_response_lock: serialize concurrent order creation
  4. idempotency on (user_id, package_id, openid)
  5. insert payment_orders row:
       status=PENDING, type=token_purchase,
       provider_order_id=<wechat out_trade_no>,
       amount_in_fen
  6. return PaymentOrderResponse { id, status, amount, ... }
```

## Part 1b — Create a subscription

```
POST /v1/subscriptions
  body: { plan_id }
        │
        ▼
billing_api.py: create_subscription
  1. get_current_user; load SubscriptionPlans row
  2. validate interval (monthly/yearly), price, trial, cap
  3. check active subscription slot
  4. payment_response_lock; idempotency on (user_id, plan_id, period_start)
  5. insert payment_orders row (type=subscription) + subscription state row
  6. return PaymentOrderResponse
```

## Part 2 — Get the JSAPI pay params

```
POST /v1/payments/{payment_order_id}/pay
  body: {}            (or { openid? })
        │
        ▼
billing_api.py: resume_owned_payment / pay
  1. load payment_orders row owned by user
  2. checkout_openid(user, payment_type) → openid (mini-program JSAPI requires it)
  3. wechat_pay.create_jsapi_order(...):
       POST https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi
       with merchant serial + private key signing (wechat_pay.py)
       ──► prepay_id
  4. package the JSAPI params:
       { appId, timeStamp, nonceStr, package: "prepay_id=...",
         signType: "RSA", paySign: <signed> }
  5. return payment params + payment_status
```

```
Frontend pkg-account/services/payment.ts
  paymentBridge.pay(paymentParams)
    └─ uni.requestPayment({ provider: "wx", ...paymentParams })
        ──► WeChat paysheet UI
```

## Part 3 — WeChat calls the callback (async)

```
WeChat servers ──► POST /v1/webhooks/wechat/payments
  (webhook_router prefix /v1/webhooks/wechat)
        │
        ▼
billing_api.py: wechat_pay_notification
  1. decrypt the WeChat Pay V3 notification (AES-GCM, api v3 key)
  2. idempotent by event id into wechat_payment_events
  3. load payment_orders by provider_order_id (out_trade_no)
  4. if SUCCESS:
       billing.complete_payment_order(db, order)
         • mark payment_orders.status = PAID, paid_at
         • if token_purchase → insert purchased_token_batches
             + credit user.remaining_tokens (token_ledger_entries: PURCHASE)
         • if subscription → activate/renew subscription
             (add_subscription_interval, set expires_at)
         • notify entitlement update
  5. return 204 No Content
```

Refunds arrive on the parallel route `POST /v1/webhooks/wechat/refunds`
(`refund_notification`), which records the refund and debits the ledger.

## Part 4 — Frontend learns the result

```
Frontend polls / resumes:
  POST /v1/payments/{id}/pay     (resume a pending order, refresh pay params)
  GET  /v1/payments             (PaymentHistoryResponse)
  GET  /v1/payments/{id}         (payment_detail)
```

The mini program does **not** trust the front end's view of the pay result alone —
entitlements are granted server-side from the verified callback. The frontend just polls
until `payment_orders.status = PAID`.

## Order lifecycle

```
PENDING ──(callback SUCCESS)──► PAID ──(refund callback)──► REFUNDED
   │
   └──(POST /v1/payments/{id}/close, or timeout)──► CLOSED
```

Expired pending orders are swept by a cron (`close_payment_orders`) so they cannot linger
forever.

## Dev / cloud-test shortcut

In `WECHAT_PAY_MODE=mock` (local + cloud-test), the mock payment provider
(`mock-payment-provider:8081`) stands in for WeChat:

```
POST /v1/billing/mock/payments/{id}/complete   (mock_complete_payment)
  → marks the order paid, credits tokens/subscription
```

The mini program routes through `paymentBridge`; in mock mode it resolves to this local
complete instead of `uni.requestPayment`. Real WeChat Pay requires a valid merchant
certificate (`WECHAT_PAY_MERCHANT_*`) and the live mode.

## Data written

| Table | What |
| --- | --- |
| `payment_orders` | one row per purchase/subscription order |
| `wechat_payment_events` | decrypted, idempotency-checked callback events |
| `purchased_token_batches` | token grant after PAID (token purchases) |
| `token_ledger_entries` | `PURCHASE` credit / refund debit |
| subscription state rows | activated/renewed on subscription orders |

## Related call chains

- [Design Job Lifecycle](/reference/flows/design-job-lifecycle) — where tokens are
  spent.
- [WeChat Login Flow](/reference/flows/wechat-login-flow) — JWT protects all routes.
