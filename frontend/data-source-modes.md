# Data Source Modes

The frontend supports two fundamental operating modes, decided **at compile
time** by environment variables. There is no runtime switch: each build is a
fixed configuration.

## The two modes

| Mode | `VITE_DATA_SOURCE` | Backend | Typical use |
| --- | --- | --- | --- |
| **Mock** | `mock` | Not needed | UI development, screenshots, demos, UI review |
| **API** | `api` | Required | Integration testing and production |

### Mock mode

Every repository has an in-memory implementation that fully simulates the UI
and state transitions: login succeeds without WeChat, payment succeeds without
WeChat Pay, design jobs progress deterministically. This lets a developer build
the whole UI with **no backend and no credentials**.

```bash
pnpm dev:mp-weixin:mock
pnpm build:mp-weixin:mock
```

### API mode

Repositories call the real backend at `/api/v1` through `src/services/request.ts`.
Authentication and payment are further selected by two more variables:

- `VITE_WECHAT_AUTH_MODE=mock|live`
  - `mock` — backend-local mock login (no WeChat call).
  - `live` — real WeChat `wx.login` + phone authorization.
- `VITE_PAYMENT_MODE=mock|wechat`
  - `mock` — the backend's mock payment endpoints.
  - `wechat` — real WeChat JSAPI Pay.

| Build | data source | auth | payment | Backend |
| --- | --- | --- | --- | --- |
| `dev:mp-weixin:api-local` | api | mock | mock | local (127.0.0.1:8080) |
| `dev:mp-weixin:api-local-wechat` | api | **live** | mock | local |
| `build:mp-weixin:api` (production) | api | live | wechat | production |

## Environment variables

All are compile-time and validated by the build/request layer:

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_DATA_SOURCE` | — | `mock` or `api` |
| `VITE_PAYMENT_MODE` | — | `mock` or `wechat` |
| `VITE_WECHAT_AUTH_MODE` | — | `mock` or `live` |
| `VITE_SHOW_BACKEND_STATUS` | — | include the dev-only backend status component and `/health/ready` calls |
| `VITE_API_BASE_URL` | — | backend REST base URL |
| `VITE_ASSET_BASE_URL` | — | CDN origin for catalogue/static images (default `https://static.yuanzhushuzhi.com`) |
| `VITE_AD_SPLASH_IMAGE_URL` | — | ad splash image; must be an HTTPS URL on a registered download domain |
| `VITE_HOME_AD_BANNER_IMAGE_URL` | — | home ad banner; same domain rule |
| `VITE_REPORT_WEB_ORIGIN` | — | the single HTTPS origin allowed for report `web-view` pages |
| `VITE_SERVICE_PHONE` | — | service phone on the contact page |
| `VITE_WECHAT_CARD_URL` | — | WeChat card / service-account link |
| `VITE_ALLOW_INSECURE_LAN_HTTP` | `false` | allow `http://` for loopback or private LAN in dev builds |

## Security validation in the request layer

`src/services/request.ts` enforces strong rules on the API base URL:

- Must be a well-formed `http(s)://authority` with a valid hostname (no `@`).
- `https://` is always allowed.
- `http://` is allowed only for **loopback** (`localhost`, `127.0.0.1`, `[::1]`)
  or — when `VITE_ALLOW_INSECURE_LAN_HTTP=true` — private LAN addresses
  (`10.x`, `172.16–31.x`, `192.168.x`).

The production build sets `VITE_ALLOW_INSECURE_LAN_HTTP=false`, so the API
bundle can only reach HTTPS origins. Similarly, upload URLs and report viewer
origins are validated to HTTPS (with the same loopback/LAN dev exception).

## Advertising images

- `VITE_AD_SPLASH_IMAGE_URL` and `VITE_HOME_AD_BANNER_IMAGE_URL` only accept
  **HTTPS URLs on registered WeChat download domains**.
- If the value is empty, invalid, or the image fails to download, the app falls
  back to a bundled placeholder — so the app never breaks on bad ad config.

## Report web-view origin

`VITE_REPORT_WEB_ORIGIN` must be a **single HTTPS origin** that is registered
in the WeChat mini program's business domains. It is used to validate
`web-view` report sessions (`src/services/reportViewer.ts`), which must match
the origin, be HTTPS, and be unexpired.

## What a production build includes/excludes

- **Excludes**: the dev backend-status component, `/health/ready` checks, and
  any development-only UI.
- **Includes**: the six features, account/billing, and all production wiring.
- **Enforces** (via quality gates): legal-domain validation on,
  `lazyCodeLoading`, minified JS/WXML/WXSS, no deleted "cost plan" bundles, no
  oversized packages (see [Testing & Quality Gates](/frontend/testing)).

## Choosing a mode in practice

- **UI work / design review** → Mock.
- **Backend integration while developing** → `api-local` (+ `api-local-wechat`
  to exercise real login against a mock/local stack).
- **Testing the exact production behavior** → `build:mp-weixin:api`.

## Next steps

- [Architecture](/frontend/architecture) — the repository layer behind modes.
- [Key User Flows](/frontend/key-flows) — what happens in each mode.
