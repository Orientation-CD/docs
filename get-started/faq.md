# FAQ and First Troubleshooting Steps

## Which folder or branch should I use?

Application commands run inside `wechat_mini_program` (`ui-integration`) or `YuanZhu-AI` (`main`). Documentation commands run inside `docs`. Run `pwd` and `git branch --show-current` before copying a repository-specific command. The frontend pins pnpm **9.15.9**, while this docs repository pins **10.28.2**. [macOS setup](/get-started/macos-setup) shows both.

## Do I need a backend for the first preview?

No. A frontend Mock build simulates the interface without starting the server. For an integration check, an API build talks to a real local backend with its own database and object storage. Mock identity/payment/model providers in that backend do not make it the same as frontend Mock mode.

## Why does Docker build ask for SSH access when I only want a mock image?

The application image builds the private `Orientation-CD/jinqiuai` dependency through BuildKit SSH, including for local builds. Access to the frontend/backend repositories alone is insufficient. Confirm the private repository permission and a loaded SSH key with the maintainer. See [Local stack](/deploy/local-stack).

## Why is the server healthy but login or feature discovery fails?

Readiness checks service health; it does not prove that current legal documents, Features, templates, prices or subscription plans are configured. A fresh local stack can import authorized cloud-test configuration. Existing configured volumes are deliberately protected from replacement. Follow [Quick Start](/get-started/quickstart), including the configuration prerequisites.

## Why does an API URL override have no effect?

`dev:mp-weixin:api-local` and `build:mp-weixin:api-local` assign port **8080 inside the script**. Prefixing them with another `VITE_API_BASE_URL` cannot change that assignment. Use the explicit `pnpm exec uni` command in [Quick Start](/get-started/quickstart) for a custom port, and rebuild afterward.

## Why does an extra API prefix cause a 404?

The current public API uses `/v1`. Configure the origin as the base, for example `http://127.0.0.1:8080`; the frontend appends `/v1/...`. Do not insert `/api` unless an independently configured proxy actually requires that prefix.

## Why can I select options but not submit?

Check login, current workspace/project, server feature availability, active personal subscription permissions and Token balance. Frontend scenario overrides are demonstrations and do not change server entitlements. The account-wide pending/running limit is five. A server rejection should preserve the draft; retry only after resolving its reason.

## Why does WeChat native payment fail against the local mock backend?

An API build still calls the native WeChat payment bridge. `VITE_PAYMENT_MODE=mock` does not replace it with a fake cashier. The local backend provides an authenticated `/mock/payments/{id}/complete` endpoint for owned mock WeChat orders. The [Quick Start](/get-started/quickstart) demonstrates server settlement without exposing tokens in logs. This is a local test, not proof of real payment integration.

## Why do images or audio fail while the API works?

The file origin may be different from the API. Check `VITE_RESULT_STORAGE_ORIGINS`, MinIO's derived port, URL expiry and platform domain lists. CDN JSON and Douyin network-audio playback need **request** domains; upload/download registration alone is insufficient. See [Platforms](/frontend/platforms).

## Why is the Project tab missing?

Projects are compiled in only when `VITE_ENABLE_PRIVATE_PROJECTS=true`. The explicit production builds enable them; a generic Mock script does not necessarily do so. Change the build settings and rebuild. Server permissions are still enforced after the tab appears.

## What should I include in a bug report?

Record the source revision, build command/mode, platform, owned local port/project, reproducible steps, expected/actual result and safe error/request ID. Do not paste access tokens, signed file URLs, phone codes, `.env` contents or payment signatures. Use the app's diagnostics export when applicable.

## New screens, missing routes and unexpected permissions

| Symptom | First check |
| --- | --- |
| Professional floor-plan entry exists but API is missing | [Audited branch mismatch](/reference/integration-status); a candidate fixture is not server main |
| Upload completed but submission was rejected | [Archive/activation boundary](/reference/flows/asset-upload-flow); wallet, entitlement and member quota still apply |
| Enterprise has Tokens but a member cannot submit | [Monthly quota](/reference/flows/member-quota-flow); workspace shortage is checked before member limit |
| Owner can read a member task but sees no inputs/edit actions | Intended [read-only projection](/reference/flows/workflow-history-flow), not a broken editor |
| Same-style template saves but cannot run | [Prompt/runtime validation](/admin/prompts); save success is not a valid rendered script or configured provider |
| Performance says incomplete/no comparison | [Coverage and sample requirements](/admin/performance), not zero latency |

## Source evidence

Documented against frontend `3662578` and backend `e59716c` (2026-10-28). [Build scripts](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/package.json) · [Runtime and feature gates](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/src/repositories/runtime.ts) · [Local mock settlement](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/billing_api.py).
