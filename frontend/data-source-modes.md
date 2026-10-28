# Data Source and Build Modes

A package fixes its data source, platform, identity, payment and compile-time capabilities. There is no user-facing switch that turns an installed Mock package into an API package. Rebuild and reimport after changing these settings.

## Read the command before the environment file

`runtimeConfig` supplies fallbacks, `.env` supplies build values, inline script assignments override their named values, and Douyin's `build-targets.mjs` fixes profile settings. A script with an assignment can overwrite a prefixed shell variable. The complete [configuration reference](/reference/configuration) is generated from the audited source.

| Axis | Current settings | Boundary |
| --- | --- | --- |
| Data | `VITE_DATA_SOURCE=mock/api` | Frontend simulation or actual backend requests |
| Platform | `VITE_MINI_PROGRAM_PLATFORM=weixin/douyin` | Sharing, file schemes and platform presentation |
| Identity | `VITE_MINI_PROGRAM_AUTH_MODE=mock/wechat/douyin` | Explicit mode; existing WeChat helpers also use `VITE_WECHAT_AUTH_MODE=mock/live` |
| Payment | `VITE_PAYMENT_MODE=mock/wechat/douyin` | Frontend payment runtime; backend merchant/mode is separate |
| Projects | `VITE_ENABLE_PRIVATE_PROJECTS` | Routes, Tab, bindings and member views compiled in/out |
| Diagnostics | `VITE_SHOW_BACKEND_STATUS` | Development status and health checks |
| Demo entitlements | `VITE_ENABLE_SUBSCRIPTION_SCENARIOS` | Client scenario implementations, not server purchases |

Absent configuration defaults to frontend Mock, WeChat and mock identity/payment. Explicit `.env.example` uses API data. Neither fact describes every npm script: always inspect its actual assignments.

## Supported profiles and output

| Profile | Data / identity / payment | Project behavior |
| --- | --- | --- |
| WeChat `build:mp-weixin:mock` | Frontend Mock | Explicitly forces projects off |
| WeChat `dev:mp-weixin:mock` | Frontend Mock | Does not force the project flag; it can inherit build environment |
| WeChat `:api-local` | API fixed to 8080 / mock identity / mock payment setting | Project flag not forced |
| WeChat `:api-local-wechat` | API / real WeChat identity / mock payment setting | Base can be supplied; otherwise 8080 |
| WeChat `:api` | API / real WeChat / WeChat payment | Projects on; production static asset base selected |
| Douyin `:mock` | Frontend Mock / mock / mock | Projects off |
| Douyin `:local-test` | API / real Douyin / Douyin runtime | Projects off; development LAN permitted |
| Douyin `:cloud-test` / `:cloud-production` | API / real Douyin / Douyin runtime | Projects on; LAN and development status off |
| Douyin `:project-candidate` | API / real Douyin / Douyin runtime | Projects on; development status/LAN allowed |

Build output is `dist/build/<platform>`; watch output is `dist/dev/<platform>`. Reusing one directory for successive profiles overwrites the previous artifact. Check it before uploading. Frontend Mock does not validate the database, worker, model supplier or server settlement; a real API backed by mock suppliers exercises a different boundary.

## Origins are separate capabilities

| Setting | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend base for public product routes |
| `VITE_ASSET_BASE_URL` | Public static/CDN assets; production wrappers use CDN, test wrappers use static host |
| `VITE_ALLOW_INSECURE_LAN_HTTP` | Development opt-in for private-LAN HTTP; not a platform domain registration |
| `VITE_RESULT_STORAGE_ORIGINS` | Exact allowed result origins, including the owned MinIO port locally |
| `VITE_REPORT_WEB_ORIGIN` | Authorized HTML report origin |
| `VITE_FLOOR_PLAN_WEB_ORIGIN` | Expected professional-editor/viewer origin, falling back to API origin |
| `VITE_DESIGN_PROMPT_FIELD_MAX_LENGTH` | Editable design text limit; example 4000, supported 1–12000 |
| `VITE_WECHAT_CORP_ID`, `VITE_WECHAT_CUSTOMER_SERVICE_URL` | Optional enterprise WeChat customer-service configuration |

These values are bundled into the client. Never include AppSecrets, provider credentials or private keys. A trusted report origin is not automatically trusted for storage or the floor-plan editor. Professional-editor configuration also cannot create routes missing from [the audited backend](/frontend/floor-plans).

## Local and cloud wrappers

For a custom API port, use the explicit environment/build command in [Quick Start](/get-started/quickstart). Prefixing a different URL onto the fixed 8080 `:api-local` helper does not change its inline assignment. The WeChat LAN wrapper still fixes 7070; the Douyin local wrapper accepts `--port` and `--ip`.

Cloud wrappers check readiness before building, select API/report/storage/static origins and run their target artifact gate. They are team environment entry points, not environment discovery. Production asset URLs now use `https://cdn.yuanzhushuzhi.com`; test examples retain `https://static.yuanzhushuzhi.com`.

API-local WeChat does not replace the native payment bridge with a fake callback. Confirm a mock order through the documented backend mock-settlement flow. Disable demo subscription scenarios when checking actual server entitlement. Backend `PROJECT_OUTCOMES_ENABLED` and `VIDEO_MODEL_SELECTION_ENABLED` are deployment controls; client flags cannot enable them.

## Source evidence

Verified 2026-10-28: [Commands and inline assignments](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/package.json) · [Runtime](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/src/repositories/runtime.ts) · [Douyin profiles](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/config/build-targets.mjs) · [Environment example](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/.env.example) · [Production wrapper](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/scripts/build_mp-weixin-cloud-production.sh) · [Douyin production wrapper](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/scripts/build_mp-toutiao-cloud-production.sh).
