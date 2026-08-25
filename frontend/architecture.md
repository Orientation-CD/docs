# Frontend Architecture

This page explains how the mini program is organized internally and how its
pieces interact. Read [Overview](/frontend/overview) first if you haven't.

## Layers

The frontend is split into five layers. Data flows one way — pages depend on
services/repositories, which depend on DTOs and the request client:

```
┌─────────────────────────────────────────────────────────────┐
│ Pages (Vue components)                                       │
│   pages/*, pkg-features/pages/*, pkg-plans/pages/*,          │
│   pkg-account/pages/*                                        │
├─────────────────────────────────────────────────────────────┤
│ Services (business logic, orchestrates repositories)         │
│   src/services/*, src/pkg-features/services/*,               │
│   src/pkg-account/services/*                                 │
├─────────────────────────────────────────────────────────────┤
│ Repositories (async data access; mock or API implementations)│
│   src/repositories/*, src/pkg-features/repositories/*, ...   │
├─────────────────────────────────────────────────────────────┤
│ DTOs + request client                                         │
│   src/api/dto/*  ← typed API contracts                       │
│   src/services/request.ts ← HTTP + auth refresh + upload     │
├─────────────────────────────────────────────────────────────┤
│ Stores + domain                                              │
│   src/stores/session.ts (token persistence)                  │
│   src/domain/* (pure domain logic, no I/O)                   │
└─────────────────────────────────────────────────────────────┘
```

### Pages

- **Main package pages** (`src/pages/`): `ad-splash`, `splash`, `home`,
  `plans`, `profile`, `contact`. These are in the tab bar / startup path.
- **Feature subpackage** (`pkg-features`): the six feature flows —
  `interior`, `local`, `kitchen`, `bathroom`, `furniture`, `report`.
- **Plans subpackage** (`pkg-plans`): `detail` (a single design job), `report`
  (HTML report web-view).
- **Account subpackage** (`pkg-account`): `login`, `profile`, `legal`,
  `store`, `orders`, `subscription`, `organization`, `invitation`, `tokens`.

Routing and subpackage boundaries are declared in `src/pages.json`. The tab bar
has four tabs: 首页 (Home), 联系我们 (Contact), 我的方案 (Plans), 我的 (Profile).

### Stores

- `src/stores/session.ts` — the only Pinia store. It persists the **token
  pair** (access + refresh) to local storage under key
  `yuanzhu.session.tokens.v1`, hydrates on app launch, and migrates away from
  legacy token keys. It exposes `getAccessToken()` / `getRefreshToken()` /
  `applyTokenPair()` / `clear()`.

### Request client (`src/services/request.ts`)

The single HTTP gateway. Key behaviors:

- Builds `X-Request-ID` for every request (observability).
- Attaches `Authorization: Bearer <access>` for authenticated calls.
- **Automatic token rotation**: on a `401 AUTH_TOKEN_EXPIRED_OR_INVALID`, it
  calls `POST /v1/auth/refresh` once (shared promise, so concurrent 401s only
  refresh once) and replays the original request with the new token.
- Normalizes backend errors into typed `ApiRequestError`s with
  `statusCode`, `code`, `details`, `requestId`, `retryAfterSeconds`.
- Validates the API base URL (HTTPS, or loopback / opted-in private LAN HTTP).
- Provides `uploadFile` with the same token-rotation behavior.

### DTOs (`src/api/dto/`)

Typed contracts mirroring the backend OpenAPI: `design.ts`, `session.ts`,
`billing.ts`, `workspace.ts`. Repository implementations validate every
response and throw `ApiRequestError` (code `..._RESPONSE_INVALID`) when the
server contract is violated — this is how mock/API parity is enforced.

## The repository pattern

Pages depend only on repositories. Each repository has two implementations:

- **Mock** — in-memory, deterministic, fully simulates UI state (used with
  `VITE_DATA_SOURCE=mock`).
- **API** — calls the backend at `/api/v1` through `request.ts` (used with
  `VITE_DATA_SOURCE=api`).

Repository groups (from the README):

| Repository | Responsibility |
| --- | --- |
| `Content` | Catalogues, prompt templates, legal documents, ads |
| `Session` | WeChat login/register, refresh, profile, legal consent |
| `Workspace` | Workspaces, membership, invitations |
| `Task` | Design-job submit / poll / list / delete |
| `Plan` | "My plans" experience over design jobs |
| `Billing` | Store catalog, orders, payment, subscriptions, tokens |
| `Organization` | Enterprise workspace management (owner-only) |

Example — design job list (`src/repositories/designJobs.ts`):
`personalDesignJobRepository.list(query)` validates query params, calls
`GET /v1/design-jobs`, validates the paged response (including uniqueness of
ids and total/page consistency) and returns typed items. Pages then just render.

## Key services

| Service | What it does |
| --- | --- |
| `src/services/wechatAuth.ts` | Builds WeChat login requests (code + phone code + accepted legal docs); wraps SDK errors |
| `src/services/accountGate.ts` | The registration/login gate used at submission time; silent login, phone authorization, legal consent |
| `src/services/pollScheduler.ts` | Generic poll loop for design jobs: honours `Retry-After`, backoff on 429/503, visibility pauses, disposal |
| `src/services/reportViewer.ts` | Validates report web-view sessions (origin allow-list, expiry) |
| `src/services/idempotency.ts` | Generates and reuses idempotency keys for logical actions (design, asset upload) |
| `src/services/assets.ts` | Static asset URL resolution (CDN images, fallback placeholders) |
| `src/services/advertising.ts` | Ad splash + home ad banner handling |
| `src/services/apiObservability.ts` | In-app API observation for the dev status component |
| `src/services/health.ts` | Backend health check used in dev status |
| `pkg-features/services/*DesignSubmit.ts` | The six submit flows (standard, furniture, report) — token preflight → stage images → submit job |
| `pkg-account/services/payment.ts` | WeChat JSAPI payment bridge (`uni.requestPayment`) |

## How a feature flow is wired (example: interior design)

1. The user taps **室内设计** on home → `pkg-features/pages/interior/index`.
2. The page uses feature repositories to load the **prompt catalogue** and
   **job-type catalogue** (availability, image requirements, token cost).
3. The user uploads a photo and answers the multi-step questions.
4. On submit, `standardDesignSubmit.ts`:
   - reads image metadata,
   - fetches profile + job types + prompts in parallel,
   - validates the job type is available,
   - builds a prompt selection,
   - runs **token preflight** (`designTokenPreflight.ts`),
   - **stages images** (`stageDesignImages` — see below),
   - builds the job request and calls `submitDesignJob` with an
     **idempotency key**.
5. The page then uses a **poll scheduler** to wait for the job to finish
   (`GET /v1/design-jobs/{id}`), showing progress, then navigates to the result.

### Staging images (upload path)

`stageDesignImages` (`pkg-features/repositories/designAssets.ts`):

1. For each required role (`image`, `masked_image`, `reference_image`), call
   `POST /v1/assets/upload-intents` (idempotent) to get an **upload intent**.
2. If the intent says `READY`, the asset already exists — done.
3. Otherwise **upload directly** to the returned presigned URL with progress
   callbacks.
4. Call `POST /v1/assets/{id}/complete` to confirm and get the asset metadata
   (content type, size, sha256, etag, dimensions).

The backend never sees the image bytes; it only signs and verifies.

## Startup sequence

`App.vue` → `onLaunch` → `sessionTokenStore.hydrate()`. Token hydration is
synchronous and non-blocking; the first authenticated API call will refresh if
needed.

## Next steps

- [Data Source Modes](/frontend/data-source-modes) — how mock/API are chosen.
- [Key User Flows](/frontend/key-flows) — the interactions in detail.
- [Design System](/frontend/design-system) — tokens and UI conventions.
