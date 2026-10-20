# Douyin Payment Integration

Douyin payment is implemented through the general trade system. It shares server-priced plans/packages, idempotent orders, token ledger, refund reservation and phone-linked account identity with WeChat, while keeping channel `douyin` and its signatures/callbacks separate. A mock checkout is not evidence that a real device/payment path has been accepted.

## Client and server sequence

1. Load the public billing/Feature catalog and choose a returned plan/package code.
2. Create `/v1/subscriptions` or `/v1/token-purchases` with `type: "douyin"` and a durable `Idempotency-Key`.
3. Use returned parameters for `tt.requestOrder`, then `tt.getOrderPayment`. An existing provider order can resume through the get-payment action.
4. Poll the backend payment record. Only verified platform callback/query evidence settles money and entitlements; a client success callback is not settlement.
5. Refund-result and refund-application callbacks follow their own verified, idempotent server path. The mini program currently does not expose an in-app refund application entry.

The Douyin build declares `industrySDK: true`. Product/category onboarding and published platform callback configuration remain external prerequisites. The implementation does not establish universal iOS CNY support: the pinned acceptance document records the platform DIAMOND constraint and requires actual device evidence. Do not reintroduce the earlier blanket “iOS purchasing disabled” description or claim that mock success proves live acceptance.

## Configuration and keys

| Name | Meaning |
| --- | --- |
| `DOUYIN_PAY_MODE` | `mock` or `live`; production requires the intended live mode |
| `DOUYIN_APP_ID`, `DOUYIN_MINI_PROGRAM_APP_SECRET` | Application identity/client-token access, shared with platform login |
| `DOUYIN_PAY_MERCHANT_ID`, `DOUYIN_APP_KEY_VERSION` | Merchant validation and registered application-key version |
| `DOUYIN_APP_PRIVATE_KEY` / `_FILE` | Shared unencrypted RSA-2048 application private key for phone decryption and trade signing; inline PEM takes precedence |
| `DOUYIN_PLATFORM_PUBLIC_KEY` / `_FILE` | Platform verification key; different from the application's registered public key |
| `DOUYIN_PAYMENT_NOTIFY_URL` | Public HTTPS `/v1/webhooks/douyin/payment` |
| `DOUYIN_REFUND_NOTIFY_URL` | Public HTTPS `/v1/webhooks/douyin/refund` |
| `DOUYIN_REFUND_APPLICATION_FORWARD_ENABLED` | Explicit cross-environment fallback switch, default false |
| `DOUYIN_REFUND_APPLICATION_FALLBACK_URL` | Fixed optional HTTPS destination for a verified refund application whose order is absent locally |

Keep API and both workers consistent. Old phone-only private-key variable names have been removed; migrate existing environments to the shared application-key names. Store private PEMs in ignored protected files or Secret mounts. Do not publish local user paths, credentials or full cloud environment arrays.

## Callback verification and environment routing

Payment, refund and refund-application callbacks use RSA verification over unchanged JSON bytes with `Byte-Timestamp`, `Byte-Nonce-Str` and `Byte-Signature`. This is not the old SHA1/token shared-secret protocol. Verify application/order/merchant/amount identities before state changes and preserve event idempotency.

A shared AppID does not automatically route callbacks to Alibaba namespaces. Orders can override payment and refund-result notification URLs, but the initial refund-application extension URL is platform configuration. If explicitly enabled in live mode, an entry environment may forward an authenticated application for a locally absent order to a fixed configured peer; the peer verifies again and processes its own order. Existing local orders never take that fallback, and the entry must not create a second financial action. Leave the forwarding switch off for ordinary mock tests.

## Release acceptance

Verify real onboarding and published callbacks, fresh and returning platform login, phone binding/account reuse, order creation/resume/expiry, duplicate/tampered callbacks and reconciliation. Record separate Android/iOS outcomes and any platform rejection. Financial acceptance requires an explicitly approved controlled transaction/refund procedure; documentation validation does not perform one.

Read the pinned production checklist for required evidence and open limitations before enabling a user-facing payment path. See [payment call chain](/reference/flows/payment-flow) for shared settlement and expiry behavior.

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions).

- [Implemented Douyin trade contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/DOUYIN_PAYMENT.md)
- [Production acceptance evidence requirements](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/DOUYIN_PRODUCTION_ACCEPTANCE.md)
- [RSA gateway and checkout](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/billing/douyin_pay.py)
- [Callback verification/routes](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/billing/douyin_api.py)
