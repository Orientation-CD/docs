# Data Source Modes

The frontend supports two fundamental operating modes, decided **at compile
time** by environment variables. There is no runtime switch: each build is a
fixed configuration and the unused implementation is tree-shaken out.

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
pnpm dev:mp-weixin:mock     # dev server with HMR
pnpm build:mp-weixin:mock   # self-contained bundle
```

In mock mode `vite.config.ts` aliases:

- `AccountRepositoryRuntime` → `src/repositories/account.ts` (the rich mock
  with seeded personal + organization workspaces, products, members).
- `TaskRepositoryRuntime` → `src/repositories/tasks.ts` (the async task mock).
- `WechatCodeRuntime` → `src/services/dev/wechatCodeMock.ts`.
- `BackendStatusRuntime` → `src/components/dev/BackendStatus.vue`.
- `StoreDemoRuntime` → `src/pkg-account/services/storeDemoMock.ts`.
- `SubscriptionScenarioRuntime` → `src/services/dev/subscriptionScenarioMock.ts`
  (and the visible scenario panel).

### API mode

Repositories call the real backend at `/api/v1` through
`src/services/request.ts`. Authentication and payment are further selected by
two more variables:

- `VITE_WECHAT_AUTH_MODE=mock|live`
  - `mock` — backend-local mock login (no real WeChat call).
  - `live` — real WeChat `wx.login` + phone authorization.
- `VITE_PAYMENT_MODE=mock|wechat`
  - `mock` — the backend's mock payment endpoints.
  - `wechat` — real WeChat JSAPI Pay.

| Build | data source | auth | payment | Backend |
| --- | --- | --- | --- | --- |
| `dev:mp-weixin:api-local` | api | mock | mock | local `127.0.0.1:8080` |
| `dev:mp-weixin:api-local-wechat` | api | **live** | mock | local |
| `build:mp-weixin:api` (production) | api | live | wechat | production |

In API mode the legacy monolithic account repository is replaced by
`src/repositories/accountApi.ts`, which simply proxies every method through
`unavailableApiRepository(...)` — an explicit guard that stops offline-style
calls from being made in production builds. The real API repositories are the
narrower, well-tested ones (`wechatSessionRepository`,
`currentProfileRepository`, `personalDesignJobRepository`,
`designJobTypeCatalogRepository`, and the per-feature repositories).

## How the switch is wired

`vite.config.ts` is the single source of truth. It reads
`process.env.VITE_DATA_SOURCE`, `VITE_WECHAT_AUTH_MODE`,
`VITE_SHOW_BACKEND_STATUS`, `VITE_ENABLE_SUBSCRIPTION_SCENARIOS` and computes
Vite **resolve aliases**:

```ts
const dataSourceModule = (apiPath, mockPath) => fileURLToPath(
  new URL(process.env.VITE_DATA_SOURCE === "api" ? apiPath : mockPath, import.meta.url),
);

resolve: {
  alias: {
    AccountRepositoryRuntime: dataSourceModule("./src/repositories/accountApi.ts",
                                              "./src/repositories/account.ts"),
    TaskRepositoryRuntime:    dataSourceModule("./src/repositories/tasksApi.ts",
                                              "./src/repositories/tasks.ts"),
    WechatCodeRuntime: fileURLToPath(new URL(
      process.env.VITE_WECHAT_AUTH_MODE === "mock"
        ? "./src/services/dev/wechatCodeMock.ts"
        : "./src/services/wechatCodeLive.ts", import.meta.url)),
    // ... BackendStatusRuntime, StoreDemoRuntime, SubscriptionScenarioRuntime,
    //     SubscriptionScenarioPanelRuntime
  },
}
```

TypeScript sees these aliases through module declarations in `src/env.d.ts`,
so importing `AccountRepositoryRuntime` type-checks even though it does not
exist as a real file on disk.

## Environment variables (compile-time, `VITE_` prefix)

Declared in `src/env.d.ts` and listed in `.env.example`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_DATA_SOURCE` | — | `mock` or `api` |
| `VITE_PAYMENT_MODE` | — | `mock` or `wechat` |
| `VITE_WECHAT_AUTH_MODE` | — | `mock` or `live` |
| `VITE_SHOW_BACKEND_STATUS` | — | Include the dev backend-status overlay and `/health/ready` calls |
| `VITE_ENABLE_SUBSCRIPTION_SCENARIOS` | — | Include the dev subscription-scenario override panel |
| `VITE_API_BASE_URL` | — | Backend REST base URL (e.g. `http://127.0.0.1:8080`) |
| `VITE_ASSET_BASE_URL` | `https://static.yuanzhushuzhi.com` | CDN origin for catalogue/static images |
| `VITE_ALLOW_INSECURE_LAN_HTTP` | `false` | Allow `http://` for loopback or private LAN in dev builds |
| `VITE_REPORT_WEB_ORIGIN` | — | Single HTTPS origin allowed to host report `web-view` pages |
| `VITE_RESULT_STORAGE_ORIGINS` | — | Exact comma-separated OSS origins trusted for result media |
| `VITE_WECHAT_CORP_ID` | — | Enterprise WeChat corp id |
| `VITE_WECHAT_CUSTOMER_SERVICE_URL` | — | Enterprise WeChat customer-service link |

::: warning Stale docs variables
Earlier versions of this documentation listed `VITE_AD_SPLASH_IMAGE_URL`,
`VITE_HOME_AD_BANNER_IMAGE_URL`, `VITE_SERVICE_PHONE` and `VITE_WECHAT_CARD_URL`.
They no longer exist. Ads are fixed CDN objects; the service phone is hard-coded
in the contact page; the enterprise-WeChat card is a fixed CDN image.
:::

## Security validation in the request layer

`src/services/request.ts` enforces strong rules on the API base URL:

- Must be a well-formed `http(s)://authority` with a valid hostname (no `@`).
- `https://` is always allowed.
- `http://` is allowed only for **loopback** (`localhost`, `127.0.0.1`,
  `[::1]`) or — when `VITE_ALLOW_INSECURE_LAN_HTTP=true` — private LAN
  addresses (`10/8`, `172.16.0.0/12`, `192.168/16`).

The same rules are applied to presigned upload URLs in
`pkg-features/repositories/designAssets.ts` and
`voiceAudioAssets.ts` via `validateUploadUrl` / `parseHttpUrl`, so a malicious
or misconfigured upload intent can never redirect bytes to an attacker origin.

The production build sets `VITE_ALLOW_INSECURE_LAN_HTTP=false`, so the API
bundle can only reach HTTPS origins.

## Report web-view origin

`VITE_REPORT_WEB_ORIGIN` must be a **single HTTPS origin** registered in the
WeChat mini program's business domains. It is used to validate `web-view`
report sessions (`src/services/reportViewer.ts`), which must match the origin,
be HTTPS, and be unexpired.

## What a production build includes/excludes

- **Excludes**: the dev backend-status overlay, `/health/ready` calls, the
  subscription-scenario panel, and the mock account/task implementations.
- **Includes**: all eight feature flows, account/billing, and production wiring.
- **Enforces** (via quality gates in `scripts/check-code-quality.mjs`):
  legal-domain validation on, `lazyCodeLoading: requiredComponents`, minified
  JS/WXML/WXSS, no deleted "cost plan" bundles, no oversized packages.

## Choosing a mode in practice

- **UI work / design review** → Mock.
- **Backend integration while developing** → `api-local` (swap to
  `api-local-wechat` to exercise real login against a local stack).
- **Testing the exact production behavior** → `build:mp-weixin:api`.

## Next steps

- [Architecture](/frontend/architecture) — the repository layer behind modes.
- [Key User Flows](/frontend/key-flows) — what happens in each mode.
