# Payment Flow (End-to-End)

This is the full call chain for **buying tokens or a subscription with WeChat
Pay** — from tapping "购买" in the mini program's store to tokens appearing on
the account (or the subscription activating).

## Part 0 — User taps buy (frontend)

```
User opens 购买权益 (store) → taps a token package or subscription
        │
        ▼
Frontend pkg-account (Billing repository)
  1. GET /api/v1/billing/catalog → list packages & plans
  2. user taps "购买" on a package
  3. POST /api/v1/token-purchases   (or /api/v1/subscriptions)
       body: { package_id / plan_id, ... }
```

## Part 1 — Backend creates the checkout

```
POST /api/v1/token-purchases   (billing_api.py:create_token_purchase)
        │
        ▼
FastAPI
  1. authenticate (get_current_user)
  2. load the TokenPackage / SubscriptionPlan from catalog
  3. enforce pending-order limit (WECHAT_TOKEN_PURCHASE_PENDING_LIMIT)
  4. create PaymentOrder:
       kind = token_purchase | subscription
       status = pending
       amount = package.price
       expires_at = now + WECHAT_PAYMENT_EXPIRE_SECONDS
  5. return { payment_order_id, ... }
```

## Part 2 — Client asks for payment parameters

```
POST /api/v1/payments/{payment_order_id}/pay
        │
        ▼
FastAPI → wechat_pay.py
  1. authenticate; load the pending order (must belong to user, not expired)
  2. call WeChat Pay JSAPI to create a prepay transaction
       (mock mode: mock-payment-provider; real mode: api.weixin.qq.com)
       ──► prepay_id
  3. build the JSAPI payment parameters:
       { timeStamp, nonceStr, package: "prepay_id=...",
         signType: "RSA", paySign }
  4. return them to the mini program
```

## Part 3 — User pays in WeChat

```
Frontend paymentBridge.pay(parameters)  (pkg-account/services/payment.ts)
  uni.requestPayment({ provider: "wxpay", timeStamp, nonceStr,
                       package, signType, paySign })
        │
        ▼
WeChat shows the payment sheet; user confirms.
  success → frontend waits for the order to become paid
  cancel  → frontend shows "已取消微信支付"
```

Note: `requestPayment` success only means WeChat accepted it — **the real
authority is the server-side payment notify**.

## Part 4 — WeChat Pay notifies the backend

```
WeChat Pay (server) ──► POST /api/v1/webhooks/wechat/payments
        │   (signed payload: out_trade_no, amount, transaction_id, ...)
        ▼
FastAPI → billing_api.py (webhook) + wechat_pay.py
  1. verify the notification SIGNATURE with the WeChat Pay public key
     (reject unsigned / tampered payloads)
  2. verify amount, merchant, out_trade_no match the stored order
  3. load PaymentOrder by out_trade_no
     • already paid → idempotent ack (no double credit)
  4. mark order status = paid
  5. credit the purchase:
       • token purchase → PurchasedTokenBatch + TokenLedgerEntry(TOKEN_PURCHASE)
                          remaining_tokens += amount
       • subscription  → UserSubscription status = active,
                          grant the monthly allowance
  6. return the required WeChat success acknowledgement
```

## Part 5 — Frontend confirms

```
Frontend polls GET /api/v1/payments/{payment_order_id} (or refreshes orders)
  • status = paid → show success, refresh token balance / subscription page
```

If the user closed the mini program before the notify arrived, the order is
still credited server-side — the next time they open orders/tokens they see it.

## Part 6 — Failure & reconciliation

- **Expired order**: cron `reconcile_old_pending_payments` closes stale pending
  orders (`WECHAT_PAYMENT_EXPIRE_SECONDS`).
- **Closed order**: user can `POST /api/v1/payments/{id}/close`.
- **Refunds**: `POST /api/v1/payments/{id}/refunds` → `RefundOrder`;
  WeChat refund notify (`/v1/webhooks/wechat/refunds`) confirms.
- **Subscription expiry**: cron `process_subscription_expirations` expires
  ended subscriptions (first version = manual renewal, no auto-charge).

## Data written during this flow

| Table | What |
| --- | --- |
| `payment_orders` | order row (pending → paid / closed) |
| `purchased_token_batches` | credited batch (token purchase) |
| `token_ledger_entries` | `TOKEN_PURCHASE` / subscription allowance credit |
| `user_subscriptions` | active subscription row |
| `wechat_payment_events` | inbound notify audit log |
| `refund_orders` | refund row (if refunded) |

## Modes

- **Mock (local)**: `WECHAT_PAY_MODE=mock` + `MOCK_PAYMENT_ENDPOINTS_ENABLED` —
  the whole flow works against `mock-payment-provider`, and you can complete a
  payment via `/mock/payments/{id}/complete`.
- **Real (production)**: `WECHAT_PAY_MODE=live` with real merchant keys,
  `WECHAT_PAYMENT_NOTIFY_URL` set, and the real WeChat Pay APIs.

## Related call chains

- [WeChat Login Flow](/reference/flows/wechat-login-flow) — the JWT protecting
  these endpoints.
- [Design Job Lifecycle](/reference/flows/design-job-lifecycle) — how tokens
  are spent.
