# Billing & Tokens

The backend charges for AI work in an internal currency called **Tokens**.
This page explains how tokens are held, spent, bought, granted, and how
subscriptions and WeChat Pay payments move tokens between wallets. The routes
are in `app/billing_api.py`; the transactional core is in `app/billing.py`; the
tables are documented on the [Data Model](/reference/data-model) page.

## Two wallets

Every token balance lives on either a `User` or an `Enterprise` row. Both
expose the same two columns:

| Column | Meaning |
| --- | --- |
| `remaining_tokens` | spendable balance |
| `reserved_tokens` | tokens temporarily held by in-flight design jobs |

A **personal workspace** spends from its `User` wallet. An **enterprise
workspace** spends from its `Enterprise` wallet, shared by all members. You
cannot spend tokens you have not been granted: the API checks `remaining_tokens`
before enqueuing a job.

## The token ledger

Every balance-changing event is an append-only row in `token_ledger_entries`
(`app/db_models.py`). A row records:

- which wallet (`user_id` or `enterprise_id`),
- a signed `amount` (positive = credit, negative = debit),
- the running reason (e.g. design-job reserve / settle / release, purchase,
  referral reward grant, admin adjustment),
- an idempotency / correlation reference (e.g. the design job id or payment
  order id).

The ledger is the audit trail; the `remaining_tokens` / `reserved_tokens`
columns are cached balances derived from it. This makes every charge
reconstructable and every reconciliation auditable.

### Design-job token handshake

As introduced in [Design Jobs](/backend/design-jobs):

| Phase | Function | Effect |
| --- | --- | --- |
| Create job | `reserve_design_tokens` | `remaining → reserved`, ledger row `reserve` |
| Job completes | `settle_design_tokens` | `reserved → spent` (ledger row `settle`), `reserved` decreases |
| Job fails | `release_design_tokens` | `reserved → remaining` (ledger row `release`) |

This two-phase commit means a user cannot double-spend the same tokens, and a
failed job never costs them.

### Admin adjustments

`adjust_user_tokens` and `adjust_enterprise_tokens` (`app/billing.py`) let
operators grant or correct balances from the admin UI, always writing a ledger
row with an operator reference.

## Subscriptions

Subscriptions are personal. The relevant tables:

- `subscription_plans` — the catalog of plans (code, name, interval, price,
  included token grant, job discount percent, benefit items).
- `user_subscriptions` — one active record per user with
  `current_period_start` / `current_period_end`, `status`, and a denormalized
  snapshot of `plan_code`, `plan_name`, and `benefit_items`.
- `subscription_entitlements.py:load_current_personal_subscription` returns only
  a paid subscription whose period is currently active.

`SubscriptionStatus` moves between active / past_due / canceled;
`expire_user_subscriptions` and `expire_locked_user_subscriptions` (worker
functions) flip expired subscriptions. `add_subscription_interval` advances the
period by `SubscriptionInterval` (monthly / yearly) on renewal.

**Personal subscription enforcement + live catalog permissions** (#201): the
active personal subscription's benefit items drive which premium provider
catalog entries a user may select (see [Design Jobs](/backend/design-jobs)), and
`entitlements.py:personal_benefit_items` builds the ordered display metadata
(`INCLUDED_TOKENS`, `PERSONAL_JOB_DISCOUNT_PERCENT`) shown in the client.

## Token packages & purchases

One-off top-ups live in `token_packages` (catalog) and are recorded into
`purchased_token_batches` when bought. Buying a package:

1. Creates a `payment_orders` row (with a merchant `out_trade_no` from
   `new_out_trade_no`).
2. Calls WeChat Pay JSAPI to get a prepay params for the Mini Program.
3. Waits for the WeChat Pay **notify webhook** at
   `/api/v1/billing/wechat/notify` (`wechat_pay.py` verifies the signature).
4. On success, `complete_payment_order` credits the wallet and writes a
   `wechat_payment_events` row; on close/timeout, `close_payment_orders`
   cancels the order (`WECHAT_PAYMENT_EXPIRE_SECONDS`,
   `WECHAT_PAYMENT_CLOSE_GRACE_SECONDS`).

Pending purchases are bounded per user by
`WECHAT_TOKEN_PURCHASE_PENDING_LIMIT` (default 3). Refunds create
`refund_orders` rows, and real provider/order costs are recorded in
`finance_cost_entries` for margin reporting.

### WeChat Pay modes

`WECHAT_PAY_MODE` is `disabled | mock | live`. In local Compose,
`mock` + `MOCK_PAYMENT_ENDPOINTS_ENABLED=true` point at the bundled
`mock-payment-provider`. Production requires `live` with real merchant
credentials (`WECHAT_PAY_MERCHANT_ID`, `WECHAT_PAY_API_V3_KEY`,
`WECHAT_PAY_MERCHANT_PRIVATE_KEY_FILE`, etc.). **Never commit real merchant
private keys**; keep them under e.g. `~/.config/yuanzhuai/wechat-pay/`.

## Enterprise tokens

An enterprise has its own shared `remaining_tokens` / `reserved_tokens`.
Enterprise owners top up the enterprise wallet (rather than a personal one),
and all members draw from it. Membership and invitation rules are in
[Workspaces & Organizations](/backend/workspaces-orgs). Enterprise wallet
credits come from admin adjustments and purchases, not from personal
subscriptions.

## Referral & campaign token grants

The referral system grants tokens through a separate ledger path:

- `campaign_configurations` holds the runtime token amount per campaign code
  (e.g. `REFERRAL_FIRST_PURCHASE`), editable by admins with optimistic version
  control (`campaign_configuration.py:save_campaign_token_amount`).
- `reward_grants` / `reward_grant_items` record promised rewards; the inviter is
  rewarded after a newly registered invitee's first provider-confirmed purchase
  of at least `REFERRAL_MINIMUM_PURCHASE_FEN` (990 fen = CNY 9.90) becomes
  non-refundable through purchased-token use.
- The inviter then **claims** rewards via `POST /api/v1/rewards/claim`, which
  atomically converts claimed reward items into personal tokens.

See [Workspaces & Organizations](/backend/workspaces-orgs) for the referral
tables and [Design Jobs](/backend/design-jobs) for the catalog this pays for.

### A worked token lifecycle

Imagine a personal balance of 1000 tokens and a job costing 10:

| Step | `remaining_tokens` | `reserved_tokens` | ledger row |
| --- | --- | --- | --- |
| start | 1000 | 0 | — |
| reserve job | 990 | 10 | `DESIGN_JOB_RESERVE` −10 |
| job completes | 990 | 0 | `DESIGN_JOB_CONSUMED` −10 (settle) |
| (alt) job fails | 1000 | 0 | `DESIGN_JOB_RELEASE` +10 |

On failure the hold is returned exactly; on success the held amount is
permanently spent. Every row carries the design-job correlation id so a job's
two ledger entries can always be paired.

## Startup seeding

On boot, `ensure_billing_defaults` creates the bare billing primitives.
`seed_demo_billing_catalog` (gated by `SEED_DEMO_BILLING_CATALOG=true`, local
only) seeds clearly-labelled example plans and packages so the Mini Program has
prices to show in development. New users receive `INITIAL_USER_TOKENS` (default
**1000**) and `INITIAL_USER_ALLOWED_WORKSPACES` (default **2**) on first
login.

## Routes at a glance

All under `/api/v1`, bearer-auth unless noted:

| Route | Purpose |
| --- | --- |
| `GET /billing/balance` | current wallet balance (personal) |
| `GET /billing/ledger` | paginated token-ledger history |
| `GET /billing/plans` / `/billing/packages` | catalog of plans and token packages |
| `GET /billing/subscriptions` | current personal subscription |
| `POST /billing/checkout` | create a payment order (JSAPI) |
| `POST /billing/wechat/notify` | **public** WeChat Pay webhook |
| `POST /billing/refunds` | request a refund |
| `GET /billing/enterprise/*` | enterprise wallet & member billing (owner) |

## Key settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `INITIAL_USER_TOKENS` | 1000 | starter grant on first login |
| `SEED_DEMO_BILLING_CATALOG` | true | seed demo prices locally |
| `WECHAT_PAY_MODE` | mock | `disabled`/`mock`/`live` |
| `WECHAT_PAYMENT_EXPIRE_SECONDS` | 1800 | order payment window |
| `WECHAT_TOKEN_PURCHASE_PENDING_LIMIT` | 3 | max unpaid orders per user |
| `REFERRAL_MINIMUM_PURCHASE_FEN` | 990 | minimum non-refundable purchase to trigger reward |
| `REFERRAL_REWARD_TOKENS` | 1000 | tokens granted per qualified referral |
| `REFERRAL_REWARD_GLOBAL_CAP` | 10000 | global cap on referral rewards |

## Read next

- [Workspaces & Organizations](/backend/workspaces-orgs) — who can spend an
  enterprise wallet.
- [Data Model](/reference/data-model) — the ledger/order/subscription tables.
