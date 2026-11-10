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

## Configure video model rates and three mode rules

The video section is independent of the generic Feature Token field. Configure positive integer model rates, script characters/second and all three modes (`script`, `reference_template`, `reference_upload`). Each mode chooses `per_second` or `per_task`; per-task requires positive `fixed_seconds`, while per-second must leave it null. The base model cannot be disabled. Its Default choice means the published 8 Tokens/second baseline; a custom value requires its custom flag. Other enabled non-custom rates are recomputed server-side as ceiling(base × model multiplier). Custom rates remain explicit integers; omitted/disabled models are removed from the offered rate map.

Save with the displayed `configuration_version`. `admin_save_video_billing` validates the whole ruleset, takes the video Feature authority lock and atomically replaces rates/rules while increasing the version. A stale form returns 409 `VIDEO_BILLING_CONFIGURATION_STALE`; reload before editing again. Invalid rules return 422 `VIDEO_BILLING_CONFIGURATION_INVALID`. Existing accepted snapshots retain their price/model; a stale customer preview must be reconfirmed.

Read [build_video_rates](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/video_billing.py#L110) and [admin_save_video_billing](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/video_billing.py#L150) alongside the [customer fee chain](/reference/flows/video-billing-flow). These Tokens are distinct from vendor credits.

---

Source evidence · backend `749e82df`: [app/admin/billing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/billing.py) · [app/templates/admin/billing.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/templates/admin/billing.html) · [documents/PAYMENT_REFUNDS.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/documents/PAYMENT_REFUNDS.md).
