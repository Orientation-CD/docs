# WeChat and Douyin Platforms

One codebase produces distinct artifacts. Platform choice changes native login/payment, file schemes, recording/privacy, sharing and developer-tool packaging. A browser preview or WeChat simulator is not evidence for Douyin release behavior.

## Build the intended target

| Goal | Command / wrapper | Import output |
| --- | --- | --- |
| WeChat frontend Mock | `pnpm build:mp-weixin:mock` | `dist/build/mp-weixin` |
| WeChat API production | `pnpm quality:mp-weixin:api` with origins configured | `dist/build/mp-weixin` |
| WeChat team test/production | `scripts/build_mp-weixin-cloud-test.sh` / `scripts/build_mp-weixin-cloud-production.sh` | `dist/build/mp-weixin` |
| Douyin frontend Mock | `pnpm build:mp-toutiao:mock` | `dist/build/mp-toutiao` |
| Douyin owned local API | `pnpm build:mp-toutiao:local-test` with its wrapper arguments | `dist/build/mp-toutiao` |
| Douyin team test/production | `pnpm build:mp-toutiao:cloud-test` / `pnpm build:mp-toutiao:cloud-production` | `dist/build/mp-toutiao` |

Watch commands write `dist/dev/<target>`. Public AppIDs are WeChat `wxec0d577de41255aa` and Douyin `ttd386a53b4dfe7bf501`. Secrets and channel callback keys stay on the backend. The Douyin builder rejects a frontend environment carrying an AppSecret. SDK metadata and project-feature flags belong to the selected target profile.

Both production wrappers now select the CDN asset host; test wrappers use the static host. [Build modes](/frontend/data-source-modes) explains independent data, identity, payment and project axes.

## Use the owned local address

A phone's 127.0.0.1 refers to that phone. Use the Mac's private LAN address and an API/storage port owned by the current session, on the same network. Do not reuse a familiar hardcoded port without confirming ownership.

`build:mp-weixin:api-device-wechat` requires `VITE_API_BASE_URL`; its guard does not discover one. It uses real WeChat identity, so backend credentials and AppID must match. The separate WeChat LAN wrapper auto-discovers a Mac IP but currently fixes API 7070 and defaults result storage 28574; it is not the generic custom-port path.

The Douyin local wrapper accepts explicit port/IP:

```bash
./scripts/build_mp-toutiao-local-test.sh --port 8080 --ip 192.168.1.20
```

Replace both examples with the owned session values. It checks readiness and derives the matching storage port. This profile uses real Douyin identity, independent of mock WeChat settings. Follow the backend runbook's matching Douyin mode. Development HTTP/domain-check exceptions are not release configuration.

## Register domains for the actual operation

| Traffic | Required domain/configuration boundary |
| --- | --- |
| Backend REST and development health | Request domain; HTTPS in release |
| CDN `config/ad-assets.json` | **Request** domain even when images on that CDN already display |
| Signed direct form upload | Upload domain of the actual storage endpoint |
| Output download | Download domain plus exact `VITE_RESULT_STORAGE_ORIGINS` |
| HTML report web-view | Business domain matching `VITE_REPORT_WEB_ORIGIN` |
| Professional editor/panorama web-view | Exact configured editor origin and business domain; still requires [backend integration](/frontend/floor-plans) |
| Douyin network playback of original audio | **Request** domain for its signed storage origin; upload/download registration is insufficient |

A registered platform domain and a short-lived capability are separate checks. Refreshing domain settings does not renew a signed URL. Never approve every OSS host merely because the deployment uses OSS; select the exact test/production bucket origin.

The floor-plan handoff keeps its independent editor auth pair only in an in-memory fragment after exact-origin validation. Route query parameters, diagnostics and drafts must not contain that full web-view source. Report/file viewers have their own access validation.

## Files, privacy and native presentation

`runtimeConfig.localFileSchemes` selects `wxfile://` or `ttfile://`. Shared file helpers use the platform filesystem; local paths cannot be treated as reusable HTTPS media. Large-file temporary paths may expire, as [the media lifecycle](/frontend/architecture) explains.

Declare the actual recorder, picker, clipboard and sharing APIs in the platform privacy setup. An authorization button cannot repair a missing console declaration. Clipboard failures for invitations/diagnostics retain a selectable fallback and safe diagnostic categories rather than revealing the invite bearer.

Theme CSS alone does not recolor native bars: `themePageMixin` reapplies supported navigation/background/Tab APIs on page show. The modern default theme's native bitmaps are generated for the target. Inspect actual safe areas, long text and button alignment on both platforms.

Douyin does not inherit WeChat Moments or enterprise WeChat customer service. Native share panels and externally rendered share titles can follow platform templates rather than in-app text.

## Payment is a channel-specific flow

WeChat calls `uni.requestPayment` with server-signed JSAPI parameters. Douyin uses `tt.requestOrder` and `tt.getOrderPayment` through the industry SDK, with recovery for uncertain platform orders. Neither native callback is final settlement evidence; the client reconciles server order state.

Backend channel mode, merchant setup and callback configuration must match the frontend profile. A mock server order and real native payment bridge are different layers. See [Douyin payment](/reference/douyin-payment) and [Quick Start](/get-started/quickstart).

## Source evidence

Verified 2026-10-28: [Profiles](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/config/build-targets.mjs) · [Runtime platform choices](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/src/repositories/runtime.ts) · [Device guard](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/scripts/require-device-api-url.mjs) · [WeChat LAN wrapper](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/scripts/build_mp-weixin-local-test.sh) · [Platform helpers](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/src/services/platform.ts) · [Editor handoff](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/src/pkg-features/services/floorPlanHandoff.ts#L8) · [Payment bridge](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/src/pkg-account/services/payment.ts) · [Backend local runbook](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/runbook.md).
