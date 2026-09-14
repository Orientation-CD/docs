# 支付流程（端到端）

这是**购买积分或订阅**的完整调用链——从打开计费页，到收到额度。
它覆盖积分套餐和订阅两种情形、微信 JSAPI 交接、异步回调，以及（仅开发用的）
Mock 快捷方式。

## 第 0 部分——前端打开计费页

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

## 第 1a 部分——创建积分购买

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

## 第 1b 部分——创建订阅

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

## 第 2 部分——获取 JSAPI 支付参数

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

## 第 3 部分——微信回调（异步）

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

退款走平行路由 `POST /v1/webhooks/wechat/refunds`（`refund_notification`），
记录退款并扣减账本。

## 第 4 部分——前端得知结果

```
Frontend polls / resumes:
  POST /v1/payments/{id}/pay     (resume a pending order, refresh pay params)
  GET  /v1/payments             (PaymentHistoryResponse)
  GET  /v1/payments/{id}         (payment_detail)
```

小程序**不只**凭前端对支付结果的看法——权益是由服务端根据校验过的回调发放的。
前端只是轮询直到 `payment_orders.status = PAID`。

## 订单生命周期

```
PENDING ──(callback SUCCESS)──► PAID ──(refund callback)──► REFUNDED
   │
   └──(POST /v1/payments/{id}/close, or timeout)──► CLOSED
```

过期的待支付订单由 cron（`close_payment_orders`）清扫，不会永远悬挂。

## 开发 / 云测快捷方式

在 `WECHAT_PAY_MODE=mock`（本地 + 云测）下，Mock 支付提供商
（`mock-payment-provider:8081`）顶替微信：

```
POST /v1/billing/mock/payments/{id}/complete   (mock_complete_payment)
  → marks the order paid, credits tokens/subscription
```

小程序经由 `paymentBridge` 路由；在 mock 模式下它解析到这个本地 complete 接口，
而非 `uni.requestPayment`。真实微信支付需要有效的商户证书
（`WECHAT_PAY_MERCHANT_*`）和 live 模式。

## 写入的数据

| 表 | 内容 |
| --- | --- |
| `payment_orders` | 每个购买/订阅订单一行 |
| `wechat_payment_events` | 解密、幂等校验后的回调事件 |
| `purchased_token_batches` | PAID 后的积分发放（积分购买） |
| `token_ledger_entries` | `PURCHASE` 入账 / 退款扣减 |
| 订阅状态行 | 订阅订单上激活/续期 |

## 相关调用链

- [设计作业生命周期](/reference/flows/design-job-lifecycle)——积分花在哪。
- [微信登录流程](/reference/flows/wechat-login-flow)——JWT 保护所有路由。
