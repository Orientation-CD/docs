# Frontend Getting Started

Use **Node 22** and the repository's **pnpm 9.15.9**. For first-time terminal users, [macOS setup](/get-started/macos-setup) explains installing tools, folders and branch checks; [Quick Start](/get-started/quickstart) provides the complete local integration loop.

## Install and preview a Mock build

Run from the frontend repository on `ui-integration`:

```bash
pnpm install --frozen-lockfile
pnpm build:mp-weixin:mock
```

Without a global pnpm installation, replace `pnpm` with `npx --yes pnpm@9.15.9`. Import **`dist/build/mp-weixin`** into WeChat DevTools, with public AppID `wxec0d577de41255aa` and a developer-authorized WeChat account. The source repository and `src/` are not the import directory.

For a watch process:

```bash
pnpm dev:mp-weixin:mock
```

Its output is **`dist/dev/mp-weixin`**. Keep that terminal running; Control–C stops it. Mock supports the initial image flow without a backend; API-only voice/video/report/copywriting availability is not implied by that preview.

## Choose a target

| Purpose | Command or entry point | Important behavior |
| --- | --- | --- |
| WeChat Mock | `build:mp-weixin:mock` / `dev:mp-weixin:mock` | Simulated frontend data; does not force projects on |
| Local API with mock identity/payment | `build:mp-weixin:api-local` / `dev:mp-weixin:api-local` | Hardcoded API port 8080; frontend subscription scenario panel enabled |
| Local API with real WeChat identity | `build:mp-weixin:api-local-wechat` | Live login; mock backend payment; API origin can be supplied |
| Device with real WeChat identity | `build:mp-weixin:api-device-wechat` | Requires an explicit usable LAN API URL; does not discover the Mac address |
| Production API | `build:mp-weixin:api` | Real WeChat login/payment, HTTPS, projects enabled, no health overlay |
| Douyin Mock | `build:mp-toutiao:mock` | Platform-specific deterministic preview |
| Douyin local/cloud test/production | `build:mp-toutiao:local-test`, `:cloud-test`, `:cloud-production` | Wrapper scripts validate environment and inspect the compiled output |

There is no `dev:mp-weixin:api` script. Bare `dev:mp-weixin` delegates to uni-app and depends on ambient configuration; prefer an explicit mode.

## Local API setup

Start a configured owned backend first. A healthy blank server is insufficient: legal documents, Features, templates, plans and generation configuration must exist. Personal submission also needs a permitted active subscription and Tokens.

The `api-local` scripts overwrite `VITE_API_BASE_URL` with `http://127.0.0.1:8080`. For a custom port, use the explicit environment plus `pnpm exec uni build -p mp-weixin` command in [Quick Start](/get-started/quickstart). That example also sets the MinIO/report origins and disables demo entitlement overrides.

In DevTools enable the local HTTP domain/TLS debugging exception, then recompile the **API output**, register, confirm server-side entitlements and complete a task. Do not use the development exception in a release. WeChat's native payment bridge is still native in API-local: local mock settlement is a separate backend test step.

## Config files and output ownership

| File | Responsibility |
| --- | --- |
| `package.json`, `pnpm-lock.yaml` | Pinned toolchain and commands |
| `.env.example`, `src/env.d.ts` | Frontend environment setting examples and declarations |
| `src/manifest.json` | App/platform metadata and permissions |
| `src/pages.json` | Routes, subpackages, Tab bar and page navigation |
| `project.config.json` | WeChat DevTools release settings |
| `project.private.config.json` | Local DevTools overrides |
| `vite.config.ts`, `config/build-targets.mjs` | Aliases, preprocessing and Douyin build profiles |

Frontend environment values are bundled at compile time. Preserve local `.env` files, rebuild after edits, and never place AppSecrets or provider credentials in them. The docs repository uses pnpm **10.28.2**; keep its dependencies separate.

Run [Testing and quality gates](/frontend/testing) before delivering changes. Use [Data modes](/frontend/data-source-modes) for the full configuration map and [Platforms](/frontend/platforms) for device/domain requirements.

## Source evidence

Frontend `eca0a5f` (2026-10-20): [Commands](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/package.json) · [Douyin profiles](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/config/build-targets.mjs) · [Device URL guard](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/scripts/require-device-api-url.mjs).
