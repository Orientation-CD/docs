# Frontend Getting Started

This page walks you through installing, running, building and previewing the
mini program frontend.

## Prerequisites

- **Node.js ≥ 18** (`node --version`)
- **pnpm** (`pnpm --version`) — the project uses pnpm workspaces.
- **WeChat DevTools** — the official desktop IDE used to preview mini programs.

## Install dependencies

```bash
cd wechat_mini_program
pnpm install
```

## Development modes

The important distinction is **data source** (mock vs API) — see
[Data Source Modes](/frontend/data-source-modes). The `package.json` scripts
encode all combinations:

| Command | Data source | Payment | WeChat auth | Backend needed? |
| --- | --- | --- | --- | --- |
| `pnpm dev:mp-weixin:mock` | mock | mock | mock | No |
| `pnpm dev:mp-weixin:api-local` | api | mock | mock | Yes, `http://127.0.0.1:8080` |
| `pnpm dev:mp-weixin:api-local-wechat` | api | mock | **live** | Yes |
| `pnpm dev:mp-weixin` | api | wechat | live | Yes (production behavior) |

To start the development server with HMR:

```bash
# UI-only development (no backend):
pnpm dev:mp-weixin:mock

# Against your local backend (see Backend Quick Start):
pnpm dev:mp-weixin:api-local
```

The command compiles and watches the project. Import the output directory in
WeChat DevTools (below).

::: tip Changing the API base URL
`api-local` targets `http://127.0.0.1:8080`. To use a different local port:
```bash
VITE_API_BASE_URL=http://127.0.0.1:9090 pnpm dev:mp-weixin:api-local
```
:::

## Building

```bash
# Mock build (self-contained, for screenshots / UI review)
pnpm build:mp-weixin:mock

# API build against local backend (mock login/payment)
pnpm build:mp-weixin:api-local

# API build against local backend with live WeChat login
pnpm build:mp-weixin:api-local-wechat

# Production API build (real WeChat login + JSAPI Pay, HTTPS only)
pnpm build:mp-weixin:api
```

Production build enforces:
- `VITE_DATA_SOURCE=api`, `VITE_PAYMENT_MODE=wechat`, `VITE_WECHAT_AUTH_MODE=live`
- `VITE_ALLOW_INSECURE_LAN_HTTP=false` — no insecure LAN HTTP.
- No backend-status/dev-only components in the bundle.

### Real-device build (auto LAN IP)

To test on a phone against your local backend, the repo has a helper that
auto-detects your Mac's LAN address and builds an API bundle pointing at it:

```bash
./scripts/build_mp-weixin.sh      # targets http://<LAN-IP>:8080
# or
pnpm build:mp-weixin:api-device-wechat
```

Both require the Mac and phone on the same LAN and the backend stack running on
the detected port.

## Preview in WeChat DevTools

1. Open **WeChat DevTools** → import project.
2. Set the **AppID** to the project's AppID
   (`wxec0d577de41255aa`; never commit the AppSecret).
3. Point the directory at the build output:
   - Dev server: `dist/dev/mp-weixin`
   - Built bundle: `dist/build/mp-weixin`
4. DevTools compiles and shows the simulator.

::: tip Local HTTP testing
When using `api-local` against `http://127.0.0.1:8080`, WeChat DevTools needs
"不校验合法域名" (do not validate legal domains / TLS) enabled in the project
details, because loopback HTTP is not a normal mini-program domain.
:::

## Project config files

| File | Purpose |
| --- | --- |
| `project.config.json` | WeChat DevTools project settings (appid, compile settings) |
| `project.private.config.json` | Personal/local DevTools overrides (not for sharing) |
| `vite.config.ts` | Vite (uni-app) build configuration |
| `tsconfig.json` | TypeScript config |
| `vitest.config.ts` | Unit test runner config |

## Environment variables

All frontend env vars are compile-time and prefixed `VITE_`:

| Variable | Values | Meaning |
| --- | --- | --- |
| `VITE_DATA_SOURCE` | `mock` / `api` | Selects mock vs API repositories |
| `VITE_PAYMENT_MODE` | `mock` / `wechat` | Mock payment vs real WeChat JSAPI pay |
| `VITE_WECHAT_AUTH_MODE` | `mock` / `live` | Mock identity vs real WeChat login |
| `VITE_SHOW_BACKEND_STATUS` | `true` / `false` | Include dev backend-status component |
| `VITE_API_BASE_URL` | URL | Backend REST base URL |
| `VITE_ASSET_BASE_URL` | URL | CDN origin for static catalogue images |
| `VITE_AD_SPLASH_IMAGE_URL` | URL | Ad splash image (HTTPS registered domain) |
| `VITE_HOME_AD_BANNER_IMAGE_URL` | URL | Home ad banner image |
| `VITE_REPORT_WEB_ORIGIN` | URL | HTTPS origin allowed to host report web-views |
| `VITE_SERVICE_PHONE` | string | Service phone shown in contact page |
| `VITE_WECHAT_CARD_URL` | URL | WeChat card / service account link |
| `VITE_ALLOW_INSECURE_LAN_HTTP` | `true`/`false` | Allow loopback/private-LAN HTTP in dev |

See [Data Source Modes](/frontend/data-source-modes) for details on how these
are validated and what each combination enables.

## Next steps

- [Architecture](/frontend/architecture) — how the code is organized.
- [Key User Flows](/frontend/key-flows) — the main interactions in detail.
- [Testing & Quality Gates](/frontend/testing) — how changes are verified.
