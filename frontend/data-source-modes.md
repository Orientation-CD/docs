# Data Source and Build Modes

A build fixes the frontend data source, platform, authentication, payment and feature flags. There is no end-user switch between Mock and API. Recompile when these settings change.

## Independent axes

| Axis | Values | Responsibility |
| --- | --- | --- |
| `VITE_DATA_SOURCE` | `mock`, `api` | Simulated frontend repositories or real backend calls |
| `VITE_MINI_PROGRAM_PLATFORM` | `weixin`, `douyin` | Platform capability/presentation behavior |
| `VITE_MINI_PROGRAM_AUTH_MODE` | `mock`, `wechat`, `douyin` | Identity flow; explicit setting takes precedence over the legacy WeChat setting |
| `VITE_WECHAT_AUTH_MODE` | `mock`, `live` | Legacy WeChat code-helper selection; keep it consistent with the chosen profile |
| `VITE_PAYMENT_MODE` | `mock`, `wechat`, `douyin` | Payment runtime configuration; does not itself fake WeChat native JSAPI calls |
| `VITE_ENABLE_PRIVATE_PROJECTS` | `true`, `false` | Compile in project routes, bindings, member views and related UI |
| `VITE_SHOW_BACKEND_STATUS` | `true`, `false` | Include development connection status and health calls |
| `VITE_ENABLE_SUBSCRIPTION_SCENARIOS` | `true`, `false` | Include client-only subscription overrides and their panel |

Runtime defaults are `mock` data, `weixin` platform and mock payment/authentication unless explicit or legacy settings select otherwise. Build scripts override many of these values. `.env` content and a script's inline assignments both matter; read the selected command rather than guessing from its name.

Frontend Mock simulates the initial image/UI flows and deliberately marks several API-only capabilities unavailable. API mode uses a real service even when that service mocks identity, payment or the model provider. These two kinds of mocking test different boundaries.

## Supported profiles

| Profile | Data | Identity | Payment | Projects |
| --- | --- | --- | --- | --- |
| WeChat `:mock` | Frontend Mock | Simulated UI | Simulated UI | Not forced on |
| WeChat `:api-local` | API at fixed 8080 | Mock | Backend mock configuration; native bridge remains | Not forced on |
| WeChat `:api` | API | Real WeChat | Real WeChat | Enabled |
| Douyin `:mock` | Frontend Mock | Mock | Mock | Disabled |
| Douyin `:local-test` | API | Real Douyin | Douyin runtime, backend mode configured separately | Disabled |
| Douyin `:cloud-test` / `:cloud-production` | API | Real Douyin | Douyin runtime | Enabled |
| Douyin `:project-candidate` | API | Real Douyin | Douyin runtime | Enabled; development status/LAN allowed |

Douyin profiles are centralized in `config/build-targets.mjs`. Cloud wrappers supply specific API/storage/report origins and check readiness. Those hardcoded environment wrappers are convenient team entry points, not generic deployment discovery.

## Address and content settings

| Setting | What to configure |
| --- | --- |
| `VITE_API_BASE_URL` | Backend base, normally an origin; current product paths start `/v1` |
| `VITE_ASSET_BASE_URL` | Static content/CDN base; team examples use `https://static.yuanzhushuzhi.com`; missing base falls back to bundled placeholders |
| `VITE_ALLOW_INSECURE_LAN_HTTP` | Opt into private-LAN HTTP in development; loopback has its own exception |
| `VITE_RESULT_STORAGE_ORIGINS` | Exact comma-separated trusted media origins, including the correct MinIO port locally |
| `VITE_REPORT_WEB_ORIGIN` | Single report viewer origin; HTTPS for released packages, local exceptions only in development |
| `VITE_DESIGN_PROMPT_FIELD_MAX_LENGTH` | Editable-design field limit aligned with deployment; example value 4000, supported configuration range 1–12000 |
| `VITE_WECHAT_CORP_ID`, `VITE_WECHAT_CUSTOMER_SERVICE_URL` | Optional enterprise WeChat customer-service settings |

These are public client settings, not a place for secrets. Backend `PROJECT_OUTCOMES_ENABLED` and `VIDEO_MODEL_SELECTION_ENABLED` are server settings; frontend discovery reflects their effect rather than controlling their rollout.

## Dynamic advertisements and static content

Advertisements are configured through CDN `config/ad-assets.json`, with cached versions, splash mapping and ordered `homeBanners`. Operators can publish zero or more banners and enable/disable entries without recompiling the app. The splash default is `ads/splash.jpg`. Feature banners have their own enable controls; the enterprise WeChat card is the shared `contact/enterprise-wechat-card.jpg` object.

Old environment names for per-ad URLs, card URL or service phone are not supported. The contact phone is defined by the application. CDN JSON fetching requires the CDN in the platform's request allow-list; see [Platforms](/frontend/platforms).

## Release boundaries

Production API artifacts must omit health overlays, frontend scenario overrides and offline account/task implementations. Keep `VITE_ENABLE_SUBSCRIPTION_SCENARIOS=false` for a server-entitlement acceptance test; selecting a demo subscriber never purchases a real subscription.

For a custom local port use [Quick Start's explicit build](/get-started/quickstart), not a prefixed override of the fixed-8080 `api-local` script. Validate both source checks and compiled artifacts with [Testing](/frontend/testing).

## Source evidence

Frontend `eca0a5f` (2026-10-20): [Runtime defaults](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/repositories/runtime.ts) · [Profiles](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/config/build-targets.mjs) · [Environment declarations](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/env.d.ts) · [Advertisement configuration](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/adAssetVersions.ts).
