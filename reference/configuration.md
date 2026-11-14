# Configuration Reference

Configuration has three different meanings in this system: application settings, database-owned product/provider configuration and deployment/client-build choices. Do not substitute one for another.

## Defaults and examples

The generated inventory below distinguishes a backend `Settings` **code default** from the committed `.env.example` value. An example may intentionally override the default for a local mock setup. Neither describes the actual cloud environment. Secret defaults/examples are redacted.

<!--@include: ../.vitepress/generated/configuration.en.md-->

## Where behavior is configured

| Configuration family | Source and operational meaning |
| --- | --- |
| Process settings | `app/core/config.py`; environment variables override the working-directory `.env`, then code defaults apply |
| Product pricing and eligibility | Database Features, Workflow node configuration, subscription plans and entitlement grants; inspect through Admin/public discovery |
| Model execution | ProviderConnection + ProviderModelConfig + selected Workflow node; connection secrets are encrypted and snapshotted for execution |
| Frontend modes | Build scripts/env variables select platform, API/mock repository behavior and transport origins |
| Cloud topology | Namespace Envs, Secret/ConfigMap references, RDS/Redis/OSS/registry settings, immutable image and `APP_VERSION` |

Changing a process environment variable does not automatically configure a Feature, activate a Workflow or grant subscription access. A successful local API boot is insufficient if legal documents, plans or Workflow configuration are missing.

## Settings to review together

- **Identity:** signing algorithm/secret, access/refresh lifetimes, platform AppID/secret, platform phone decryption keys and immutable legal documents. Real login and mock login are separate choices.
- **Billing:** WeChat/Douyin mock/live modes, channel-specific merchant/key/callback values, expiry/reconciliation and encrypted provider configuration. API and both workers need consistent values.
- **Assets:** internal S3 service endpoint, public presign endpoint, bucket/region/credentials, size/type limits and retention. Direct uploads use signed multipart POST; a CDN host is not interchangeable with the signing host.
- **Workflow execution:** queue/concurrency/rate limits, request/provider timeouts, retry/lease rules, local video/PPTX limits and installed supplier capability. Do not expand API validation limits as proof a supplier supports them.
- **Feature activation:** `PROJECT_OUTCOMES_ENABLED=false` is a first-activation boundary, not a rolling or post-write rollback switch. `VIDEO_MODEL_SELECTION_ENABLED` controls model and resolution selection. When disabled, the effective pair is mini at 480p. When enabled, discovery advertises available pairs through `model_resolution_rates`. Follow the protected release procedure for outcomes.
- **Voice browser handoff:** enabling voice upload also requires public HTTPS URL/origin/cookie configuration. A local API bearer token is not the browser session's credential.

## Precedence and secret handling

For local Compose, launcher-generated `STACK_*` values and explicit service `environment:` entries override the service `env_file`. `--secret` selects an input profile, not the sole authority over every runtime value. See [storage environments](/testing/storage-environments).

Production reads cloud-owned settings; do not overwrite a complete SAE Envs array with a small fragment. Use the pinned complete-array read/merge/drift-check procedure and preserve unrelated values and Secret references. Never commit raw arrays or secrets.

Use a stable configuration-encryption key across roles and retained data. Rotating it without a reviewed re-encryption/recovery plan can make existing provider/payment snapshots unreadable. Use ignored files or Secret mounts for private PEMs and credentials; source snapshots and generated documentation inventories must not contain secret material.

## Configuration is not feature deployment evidence

`VITE_FLOOR_PLAN_WEB_ORIGIN` is the exact trusted client H5 origin (API-origin fallback). The WeChat cloud-production wrapper explicitly uses `https://public.cdn.yuanzhushuzhi.com` for the H5 origin. Backend `H5_3VJIA_BASE_URL`, published releases and database-owned SDK configuration govern the original ThreeVjia H5. Supplier account credentials and renewal are server responsibilities; neither a trusted origin nor an enabled Feature proves a release is runnable. See [floor plans](/backend/floor-plans).

Member monthly caps are persisted enterprise/member configuration, not an environment flag. Performance windows and release attribution follow [observability](/backend/observability); retain `APP_VERSION` per running process/image. Source defaults in the generated table are distinct from an actual deployment's values.

## SDK and sales-stage configuration

ThreeVjia uses dedicated SDK configuration/release management, not a new ordinary ProviderConnection. Its binding freezes configuration identity/generation, release and contract digest into accepted execution. Account token renewal and release maintenance have separate locks and settings (`THREE_VJIA_REFRESH_MARGIN_SECONDS`, `THREE_VJIA_MAINTENANCE_ENABLED`, `THREE_VJIA_MAINTENANCE_LOCK_PATH`). Do not copy supplier secrets into frontend configuration.

`PROJECT_SALES_STAGES_ENABLED` is a protected first-activation boundary backed by durable activation state, rather than a routine toggle to reverse written stage evidence. Stage activation and the earlier outcome boundary must follow the [release procedure](/deploy/production). Video rates are versioned database configuration keyed by model and resolution; see [fee confirmation](/reference/flows/video-billing-flow).

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions).

- [Settings and validation](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/core/config.py)
- [Committed local example](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/.env.example)
- [Database provider configuration](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/providers/provider_configuration.py)
- [Build modes and scripts](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/package.json)
