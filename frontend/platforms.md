# WeChat and Douyin Platforms

The shared source produces separate mini-program artifacts. Platform runtime choices affect identity, payment, file paths, audio, privacy and sharing. A successful WeChat simulator run is not a Douyin release check.

## Build and import

| Target | Entry point | Import directory |
| --- | --- | --- |
| WeChat Mock | `pnpm build:mp-weixin:mock` | `dist/build/mp-weixin` |
| WeChat production API | `pnpm build:mp-weixin:api` with configured origins | `dist/build/mp-weixin` |
| WeChat team cloud wrappers | `./scripts/build_mp-weixin-cloud-test.sh` / `./scripts/build_mp-weixin-cloud-production.sh` | `dist/build/mp-weixin` |
| Douyin Mock | `pnpm build:mp-toutiao:mock` | `dist/build/mp-toutiao` |
| Douyin local | `pnpm build:mp-toutiao:local-test` | `dist/build/mp-toutiao` |
| Douyin cloud | `pnpm build:mp-toutiao:cloud-test` / `:cloud-production` | `dist/build/mp-toutiao` |

A `dev:*` command produces `dist/dev/<target>` instead. Public AppIDs are WeChat `wxec0d577de41255aa` and Douyin `ttd386a53b4dfe7bf501`. Credentials, phone-decryption private keys and callback secrets remain on the backend. The Douyin build rejects an environment containing a Douyin AppSecret variable.

## Local device testing

For the simulator, [Quick Start](/get-started/quickstart) uses loopback. A phone's `127.0.0.1` refers to the phone, so a device build must use the Mac's private LAN address with both devices on the same network.

`build:mp-weixin:api-device-wechat` **requires** an explicit `VITE_API_BASE_URL`; its guard does not select the address. It also uses real WeChat identity, so the backend/AppID must match. The separate `build_mp-weixin-local-test.sh` auto-detects a Mac address but currently fixes API port 7070 and has its own result-port setting; it is not a generic wrapper for any stack.

The Douyin local wrapper accepts a port and optional IP, checks readiness and derives the matching storage port:

```bash
./scripts/build_mp-toutiao-local-test.sh --port 8080 --ip 192.168.1.20
```

Replace both example values with your owned stack and Mac address. This profile uses real Douyin identity, configured independently in the backend. Mock WeChat settings do not supply Douyin login credentials. Follow the backend local runbook for the matching `--douyin real` setup.

Temporary local domain-check exceptions belong only to debugging. Cloud/release builds require HTTPS and registered domains.

## Domain checklist by actual request

| Traffic | Platform registration/configuration |
| --- | --- |
| Backend REST and health during development | Request domain; HTTPS for release |
| CDN `config/ad-assets.json` | **Request** domain, even though the same CDN also serves images |
| Direct Asset upload | Upload domain for the signed storage endpoint |
| Result download | Download domain and exact `VITE_RESULT_STORAGE_ORIGINS` |
| HTML report `web-view` | Registered business/report domain matching `VITE_REPORT_WEB_ORIGIN` |
| Douyin original-audio network playback | **Request** domain for the signed OSS origin; upload/download alone is insufficient |

Team production recordings currently use the configured production OSS origin, and test uses its separate bucket. Obtain the exact origin from the selected wrapper/deployment; do not allow every OSS host. Refresh the platform tool's domain information and recompile after console changes. Signed URLs also expire independently of domain registration.

## Privacy, files and sharing

Recording and file-picking flows use platform privacy/permission handling. Declare the actual APIs used in the platform privacy guide; clicking an authorization control cannot repair an undeclared backend-console capability.

Clipboard use covers copying enterprise invitations and diagnostics. Missing declaration can produce WeChat `errno: 112` or Douyin `104179`. The invitation UI retains a selectable code when automatic copy is unavailable and logs error categories without the invite bearer.

Local file schemes include `wxfile://` and `ttfile://`. File inspection and download/save behavior must use the shared platform helpers. Douyin does not inherit WeChat Moments sharing or enterprise WeChat customer-service capabilities. Native invite sharing uses each platform's own panel; external Douyin share text can be controlled by platform templates/defaults rather than the in-app dynamic title.

## Payment behavior

WeChat uses signed JSAPI parameters through `uni.requestPayment`; Douyin uses its industry SDK `tt.requestOrder` then `tt.getOrderPayment`, with recovery for uncertain platform orders. Douyin builds explicitly include industry SDK metadata. Neither native callback is the final settlement authority; the app confirms server order evidence.

The backend's payment mode and merchant/platform setup must match the selected frontend profile. See [Payment reference](/reference/douyin-payment), [Testing](/frontend/testing) and [Local stack](/deploy/local-stack).

## Source evidence

Frontend `eca0a5f`, backend `b13cc56` (2026-10-20): [Build profiles](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/config/build-targets.mjs) · [Device guard](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/scripts/require-device-api-url.mjs) · [Platform capabilities](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/platform.ts) · [Douyin payment bridge](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-account/services/payment.ts) · [Backend local setup](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/runbook.md).
