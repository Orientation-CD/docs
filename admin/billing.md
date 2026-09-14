# Billing & Tokens

The Billing section at `GET /admin/billing` (template `app/templates/admin/billing.html`) controls commercial pricing: what each job type costs, what subscription plans entitle, what token packages sell for, and the order history plus reconciliation. All amounts are stored in **fen** (1 fen = 0.01 CNY).

## Global tokens KPI

The header shows `global_tokens_consumed` — the provider-side token consumption billed globally — as a quick supply/demand sanity check.

## 1. Job types

Each design-job type maps to a price (in tokens) and an approved model catalog. Edit via `POST /admin/billing/job-types`; remove via `POST /admin/billing/job-types/{key}/remove` (soft archive).

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Key | text (read-only) | Yes | Stable slug, e.g. `interior_redesign`. | — |
| Display name | text | Yes | Customer-facing name. | — |
| Token cost | number | Yes | Tokens charged per job. Range 10 … 1,000,000. | — |
| Masked image required | checkbox | No | Whether the job needs a masked/brush input. | off |
| Reference image required | checkbox | No | Whether a reference image is required. | off |
| Is active | checkbox | No | When off, the job type is hidden from customers. | on |
| Approved models | select | No | Which model configs serve this catalog key (multiple). | — |
| Expected version | number | Yes | Optimistic-lock version; a stale edit returns `409`. | current |

"Approved models" is the `ProviderModelCatalog` assignment — see [providers](/admin/providers) for how models are attached to catalogs.

## 2. Subscription plans

Plans are grouped by **interval** (`monthly`, `quarterly`, `yearly`). Switch interval with the auto-submit selector.

Create/edit via `POST /admin/billing/plans`; remove via `POST /admin/billing/plans/{id}/remove` (soft archive).

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Code | text | Yes | Unique plan code. | — |
| Name | text | Yes | Display name. | — |
| Interval | select | Yes | monthly / quarterly / yearly. | — |
| List price (fen) | number | Yes | Original/strikethrough price. | — |
| Price (fen) | number | Yes | Actual charged price. | — |
| Token grant | number | Yes | Tokens granted per interval. | — |
| Job discount % | number | Yes | Discount applied to job costs for subscribers. | 0 |
| Is active | checkbox | No | When off, the plan is not purchasable. | on |

### Plan permissions (allowed catalogs)

`POST /admin/billing/plan-permissions/{interval}` sets which job-type catalogs a plan in that interval may use. It is a multi-select of job-type keys — customers on a plan can only run jobs in the allowed catalogs.

## 3. Token packages

One-time top-up bundles. Create via `POST /admin/billing/token-packages`; remove via `POST /admin/billing/token-packages/{id}/remove` (soft archive).

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Code | text | Yes | Unique package code. | — |
| Name | text | Yes | Display name. | — |
| List price (fen) | number | Yes | Strikethrough price. | — |
| Price (fen) | number | Yes | Actual charged price. | — |
| Token amount | number | Yes | Tokens delivered. | — |
| Bonus token amount | number | No | Bonus tokens included. | 0 |
| Is active | checkbox | No | Off = not purchasable. | on |

## 4. Payment history

The table lists `PaymentOrder` rows with live search and status/type filters.

| Column | What it shows |
| --- | --- |
| Order | Merchant order no (`out_trade_no`) + WeChat transaction id. |
| User | Purchaser display name. |
| Type | `subscription` or `token_purchase`. |
| Amount | Amount in fen (paid/refunded). |
| Tokens | Tokens granted. |
| Status | pending / paid / closed / refunded. |
| Created / Paid | Timestamps. |

### Payment reconciliation (async)

`POST /admin/billing/payments/reconcile` kicks off an asynchronous sweep of expired/pending orders against WeChat to confirm their true state. Because this can be long-running, it returns a `progress_id` and the page polls `GET /admin/billing/payments/reconcile/{progress_id}` (with `no-store`) until it reports completion. The UI shows a step list (start → query → finish) and the final processed/updated counts. The "Reconcile expired payments" button is disabled while a run is in flight.

> Never manually flip a stale pending order to paid/closed — reconciliation uses WeChat-confirmed evidence only.

## Enterprise token adjustment

Workspace token pools are managed on the [Workspaces](/admin/workspaces) page; individual user personal balances are on [Users](/admin/users). Every adjustment writes an auditable `TokenLedgerEntry` (`TOKEN_ADJUSTMENT_CREDIT` / `..._DEDUCTION`).

## Order of operations checklist

1. Set job-type token costs and approved models.
2. Create subscription plans and token packages.
3. Restrict plan permissions per interval.
4. Watch payments here and run reconciliation when pending orders age out.
