# Frontend Getting Started

This page walks you through installing, running, building and previewing the
mini program frontend. It assumes you have never used uni-app before.

## Prerequisites

| Tool | Why | Check |
| --- | --- | --- |
| **Node.js ≥ 18** | Runs the uni-app/Vite toolchain | `node --version` |
| **pnpm** | Package manager (the repo uses a pnpm workspace) | `pnpm --version` |
| **WeChat DevTools** | The official desktop IDE that compiles and previews mini programs | Install from `https://developers.weixin.qq.com/` |

> The project pins `@dcloudio/*` to `3.0.0-5010520260709002` and Vite to
> `5.2.8`. Use the Node version pinned in CI; Node 18 LTS is the safe choice.

## Install dependencies

```bash
cd wechat_mini_program
pnpm install
```

This installs the uni-app Vue 3 toolchain, uview-plus, Vitest and the test
harness. There is no build step to run yet — the `dev:*` scripts compile on the
fly.

## The build-mode matrix

The important distinction is **data source** (mock vs API) — see
[Data Source Modes](/frontend/data-source-modes). The `package.json` scripts
encode every combination. For WeChat the ones you will actually use:

| Command | Data source | Payment | WeChat auth | Backend needed? |
| --- | --- | --- | --- | --- |
| `pnpm dev:mp-weixin:mock` | mock | mock | mock | No |
| `pnpm dev:mp-weixin:api-local` | api | mock | mock | Yes, `http://127.0.0.1:8080` |
| `pnpm dev:mp-weixin:api-local-wechat` | api | mock | **live** | Yes |
| `pnpm dev:mp-weixin:api` (production) | api | wechat | live | Yes (production behavior) |

The plain `pnpm dev:mp-weixin` is the generic uni-app starter; for this project
always use one of the explicitly-configured `:mock` / `:api-local` variants.

## Run in development (HMR)

```bash
# UI-only development — no backend, no credentials:
pnpm dev:mp-weixin:mock

# Against your local backend (see Get Started → Quick Start):
pnpm dev:mp-weixin:api-local
```

The command compiles and watches the project. Output lands in
`dist/dev/mp-weixin`. Then open that directory in WeChat DevTools (below).

::: tip Changing the API base URL
`api-local` targets `http://127.0.0.1:8080`. To point at a different local port:
```bash
VITE_API_BASE_URL=http://127.0.0.1:9090 pnpm dev:mp-weixin:api-local
```
:::

::: tip Subscription-scenario switcher
`api-local` and `api-local-wechat` also set
`VITE_ENABLE_SUBSCRIPTION_SCENARIOS=true`, which injects a dev panel into
"我的 → 权益管理" (`SubscriptionScenarioPanel.vue`). It lets you pick
`live | none | active-month | expiring-quarter | active-year | pending | expired`
and overrides the profile on the client only — it never writes to the backend.
Production builds strip this panel entirely.
:::

## Build

```bash
# Self-contained mock bundle (screenshots / UI review):
pnpm build:mp-weixin:mock

# API bundle against a local backend (mock login + mock payment):
pnpm build:mp-weixin:api-local

# API bundle against a local backend with live WeChat login:
pnpm build:mp-weixin:api-local-wechat

# Production API bundle (real WeChat login + JSAPI Pay, HTTPS only):
pnpm build:mp-weixin:api
```

A production build (`build:mp-weixin:api`) enforces:

- `VITE_DATA_SOURCE=api`, `VITE_PAYMENT_MODE=wechat`,
  `VITE_WECHAT_AUTH_MODE=live`.
- `VITE_ALLOW_INSECURE_LAN_HTTP=false` — no insecure LAN HTTP.
- `VITE_SHOW_BACKEND_STATUS=false` — the dev backend-status component and its
  `/health/ready` calls are excluded from the bundle.

### Real-device build (auto LAN IP)

To test on a physical phone against your local backend:

```bash
# Detects your Mac's LAN address and builds an API bundle pointing at it:
pnpm build:mp-weixin:api-device-wechat
```

The script `scripts/require-device-api-url.mjs` refuses to build unless
`VITE_API_BASE_URL` is set to a reachable LAN host. Your Mac and phone must be
on the same network and the backend stack must be running on that port.

## Preview in WeChat DevTools

1. Open **WeChat DevTools** → import an existing project.
2. Set the **AppID** to `wxec0d577de41255aa`. **Never** commit the AppSecret —
   it lives only on the backend.
3. Point the project directory at the build output:
   - Dev server (HMR): `wechat_mini_program/dist/dev/mp-weixin`
   - Built bundle: `wechat_mini_program/dist/build/mp-weixin`
4. DevTools compiles and shows the simulator.

::: tip Local HTTP testing
When using `api-local` against `http://127.0.0.1:8080`, enable
**"不校验合法域名"** (Settings → Project Settings → "Do not verify legal
domains/TLS") in DevTools. Loopback HTTP is not a normal mini-program domain,
and the request layer in `src/services/request.ts` only permits it because
`VITE_ALLOW_INSECURE_LAN_HTTP` is left as its dev default.
:::

## Environment variables

All frontend env vars are **compile-time** and prefixed `VITE_`. They are
declared in `src/env.d.ts` (so TypeScript knows about them) and listed in
`.env.example`:

| Variable | Values | Meaning |
| --- | --- | --- |
| `VITE_DATA_SOURCE` | `mock` / `api` | Selects mock vs API repositories |
| `VITE_PAYMENT_MODE` | `mock` / `wechat` | Mock payment vs real WeChat JSAPI Pay |
| `VITE_WECHAT_AUTH_MODE` | `mock` / `live` | Mock identity vs real `wx.login` + phone |
| `VITE_SHOW_BACKEND_STATUS` | `true` / `false` | Include the dev backend-status overlay |
| `VITE_ENABLE_SUBSCRIPTION_SCENARIOS` | `true` / `false` | Include the dev subscription-scenario panel |
| `VITE_API_BASE_URL` | URL | Backend REST base URL (e.g. `http://127.0.0.1:8080`) |
| `VITE_ASSET_BASE_URL` | URL | CDN origin for catalogue images (default `https://static.yuanzhushuzhi.com`) |
| `VITE_ALLOW_INSECURE_LAN_HTTP` | `true` / `false` | Allow loopback/private-LAN HTTP in dev |
| `VITE_REPORT_WEB_ORIGIN` | URL | Single HTTPS origin allowed to host report `web-view` pages |
| `VITE_RESULT_STORAGE_ORIGINS` | CSV | Exact comma-separated OSS origins trusted for result media |
| `VITE_WECHAT_CORP_ID` | string | Enterprise WeChat corp id (customer-service card) |
| `VITE_WECHAT_CUSTOMER_SERVICE_URL` | URL | Enterprise WeChat customer-service link |
| `VITE_REPORT_WEB_ORIGIN` | URL | HTTPS origin allowed for report web-views |

> Advertising images, the enterprise-WeChat card and the service phone are
> **not** env vars. They are fixed objects on the shared CDN
> (`ads/beta-recruitment-splash.png`, `ads/beta-recruitment-home-banner.png`,
> `contact/enterprise-wechat-card.jpg`) and the phone is hard-coded in the
> contact page. Update the CDN object to rebrand; no code change needed.

See [Data Source Modes](/frontend/data-source-modes) for how these are
validated and which combinations they unlock.

## Project config files

| File | Purpose |
| --- | --- |
| `project.config.json` | WeChat DevTools project settings (appid, compile settings) |
| `project.private.config.json` | Personal/local DevTools overrides (not shared) |
| `src/manifest.json` | uni-app/WeChat build manifest (AppID, `scope.record` permission, minification) |
| `src/pages.json` | All pages, subpackages, tabBar, globalStyle |
| `vite.config.ts` | Vite build + compile-time alias wiring |
| `tsconfig.json` / `tsconfig.test.json` | TypeScript configs (app vs tests) |
| `vitest.config.ts` | Unit-test runner + coverage thresholds |

## Type-check and tests as you work

```bash
pnpm type-check        # vue-tsc --noEmit
pnpm test             # domain tests + vitest unit tests
pnpm quality:mp-weixin:mock   # full local gate (contract + design system + build + quality)
```

See [Testing & Quality Gates](/frontend/testing) for the full gate list.

## Next steps

- [Architecture](/frontend/architecture) — how the code is organized.
- [Key User Flows](/frontend/key-flows) — the main interactions in detail.
- [Testing & Quality Gates](/frontend/testing) — how changes are verified.
