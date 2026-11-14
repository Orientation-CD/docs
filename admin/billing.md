# Billing, Feature access and orders

`/admin/billing` owns the commercial configuration and payment history. Prices are integer fen; internal work is priced in Tokens. Configuration changes are server-authoritative and do not rewrite accepted jobs or purchased entitlement snapshots.

## Features and plans

Features have a stable key, display name, Token price, Workflow mapping, image-role flags where applicable and active state. Create/configure a Feature before activating it; activation requires an executable Workflow. The node model is selected in [Workflows](/admin/workflows), not in a Catalog permission table.

Subscription plans distinguish standard/premium tiers and fixed intervals, reference/sale price, grant and personal-job discount. Feature permissions are edited separately for the saved plan. The UI preserves unavailable/unknown grants explicitly rather than silently treating them as known active products. Existing purchased snapshots keep their original numeric benefits.

Token packages distinguish purchased amount and bonus, with the total grant derived server-side. Deactivate/remove products for future checkout while retaining historical orders. Personal purchases do not fund enterprise pools; use [Workspaces](/admin/workspaces) for that ledger.

## Payment evidence

History offers query, channel (`app`, `jsapi`, `douyin`), mock/live, status and purchase-kind filters. The old-pending-payment reconciliation control queues applicable provider checks and shows asynchronous progress; it is not a button that simply marks orders paid. A successful client SDK callback is not settlement evidence.

## Douyin trade settings and refunds

The trade form stores a shared HTTPS image and subscription/Token mappings with service type **702** and platform tag groups. It uses a configuration version; choose real official tags for live mode instead of reusing mock labels. Credentials and callback origins are deployment settings, not public form values. See [Douyin payments](/reference/douyin-payment).

The backend retains full-refund APIs, callbacks and compensation, while Mini Program refund-application entry points remain closed at this baseline. The admin shows Douyin refund anomalies but has **no ordinary approval queue or exception-resolution button**. WeChat refund query recovery and associated subscription reclamation have documented gaps. Do not describe anomaly display or mock success as a completed refund operating process; use the pinned refund contract and [REST API](/reference/rest-api).

## Configure a rate for each video model and resolution

The video billing form groups sellable resolutions by model. A pair has its own availability and integer Tokens per second. Default reads that pair’s factory amount. Custom accepts a positive safe integer. Disabling a pair removes its stored rate on save. `Doubao-Seedance-2.0-mini / 480p` stays enabled and can have a custom rate. Set script characters per second and all three mode rules (`script`, `reference_template`, `reference_upload`). Supply positive `fixed_seconds` for `per_task` and leave it null for `per_second`. [app/workflows/operations/video/video_pricing_matrix.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/operations/video/video_pricing_matrix.py) · [build_video_rates](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/admin/video_billing.py#L88) · [admin_save_video_billing](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/admin/video_billing.py#L123)

Save includes the displayed `configuration_version`. The backend validates the rules, acquires the video Feature authority lock, replaces rates and mode rules in one transaction, and increments the version. Reload before applying a stale edit after 409 `VIDEO_BILLING_CONFIGURATION_STALE`. Invalid pairs or rules return 422 `VIDEO_BILLING_CONFIGURATION_INVALID`. Accepted snapshots retain their model, resolution and amount. [Customer fee chain](/reference/flows/video-billing-flow)

Migration moves existing rates to `480p`, keeps custom amounts and refreshes default rows from their factory values. It switches the primary key to `(model_key, resolution)` and seeds additional sellable pairs where the pricing configuration exists. A follow-up removes the transitional SQL default, requiring writes to name a resolution. `MiniMax-H3` has only `768p` and `2k` pairs. `Seedance-2.5-重制增强` has factory prices but the migration leaves it unseeded. Its `480p` row would expose a new key to older readers with a five-model allowlist. Verify renderer support and client adoption before enabling it. [migrations/versions/c9e4a7f1b820_add_video_rate_resolution_key.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/migrations/versions/c9e4a7f1b820_add_video_rate_resolution_key.py) · [migrations/versions/d7e1f4a9c305_drop_video_rate_resolution_default.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/migrations/versions/d7e1f4a9c305_drop_video_rate_resolution_default.py)

The downgrade check fails before changing the database if a non-`480p` rate or a model outside the old vocabulary remains. Check application image and schema compatibility before planning recovery.

---

Source evidence · backend `f34b8a4d`: [app/admin/billing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/admin/billing.py) · [app/templates/admin/billing.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/templates/admin/billing.html) · [documents/PAYMENT_REFUNDS.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/documents/PAYMENT_REFUNDS.md).
