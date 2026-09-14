# Frontend Architecture

This page explains how the mini program is organized internally and how its
pieces interact. Read [Overview](/frontend/overview) first if you haven't. It
assumes familiarity with Vue 3 but not with uni-app specifically.

## Layers

The frontend is split into layers. Data flows one way — pages depend on
services/repositories, which depend on DTOs and the request client:

```
┌─────────────────────────────────────────────────────────────┐
│ Pages (Vue SFCs)                                            │
│   pages/*, pkg-features/pages/*, pkg-plans/pages/*,         │
│   pkg-account/pages/*                                       │
├─────────────────────────────────────────────────────────────┤
│ Composables + Services (business logic, orchestration)       │
│   src/services/*, src/pkg-features/services/*,              │
│   src/pkg-account/services/*, */composables/*               │
├─────────────────────────────────────────────────────────────┤
│ Repositories (async data access; mock or API implementations)│
│   src/repositories/*, pkg-features/repositories/*, ...     │
├─────────────────────────────────────────────────────────────┤
│ DTOs + request client                                        │
│   src/api/dto/*  ← typed API contracts                       │
│   src/services/request.ts ← HTTP + auth refresh + upload    │
├─────────────────────────────────────────────────────────────┤
│ Store + domain                                               │
│   src/stores/session.ts (token persistence)                │
│   src/domain/* (pure domain logic, no I/O)                  │
└─────────────────────────────────────────────────────────────┘
```

### Pages

Routing and subpackage boundaries are declared in `src/pages.json`. The tab bar
has four tabs: 首页 (Home), 联系我们 (Contact), 我的方案 (Plans), 我的 (Profile).

**Main package** (`src/pages/`):

| Path | Nav style | Purpose |
| --- | --- | --- |
| `pages/ad-splash/index` | custom | 5s skippable ad splash |
| `pages/splash/index` | custom | 3s brand splash |
| `pages/home/index` | custom | Home (ad banner, hero carousel, feature grid, token precheck) |
| `pages/contact/index` | default | 联系我们 |
| `pages/plans/index` | default | 我的方案 list |
| `pages/profile/index` | default | 我的 |

**`pkg-features`** (design + voice flows): `interior`, `local`, `kitchen`,
`bathroom`, `colored_floor_plan`, `furniture`, `report`, `voice_summary`.

**`pkg-plans`**: `detail` (single design job), `report` (HTML report web-view),
`markdown` (voice-summary view with resumable playback).

**`pkg-account`**: `login`, `profile`, `legal`, `store`, `orders`,
`subscription`, `organization`, `invitation`, `rewards`, `tokens`.

### The store: `src/stores/session.ts`

There is exactly one store, and it is deliberately tiny. It is a
**module-level singleton** (not Pinia) that holds the access/refresh token pair
in memory and mirrors it to `uni.setStorageSync`:

- Storage key: `yuanzhu.session.tokens.v1`.
- On app launch (`App.vue` → `onLaunch` → `sessionTokenStore.hydrate()`) it
  validates the stored pair and purges legacy keys
  (`yz_access_token`, `yz_refresh_token`, `yz_user_profile`).
- Exposes `getAccessToken()`, `getRefreshToken()`, `applyTokenPair(pair)`,
  `clear()`.

Pages keep all other state in local `ref`/`computed`. This avoids a global
store library while still guaranteeing one source of truth for credentials.

### Request client: `src/services/request.ts`

The single HTTP gateway used by every API repository. Key behaviors:

- Builds `X-Request-ID` (`mp-<ts>-<seq>-<rand>`) for every request and sets
  `Accept: application/json`.
- Attaches `Authorization: Bearer <access>` for `auth: true` calls.
- **Automatic token rotation**: on `401 AUTH_TOKEN_EXPIRED_OR_INVALID` it calls
  `POST /v1/auth/refresh` **once** (a shared `refreshPromise` collapses
  concurrent 401s) and replays the original request with the new token. Other
  401 codes clear the session.
- Normalizes backend errors into typed `ApiRequestError`s with `statusCode`,
  `code`, `details`, `requestId`, `retryAfterSeconds`. FastAPI validation
  arrays are flattened into readable messages.
- Validates the API base URL: HTTPS always; HTTP only for loopback or — when
  `VITE_ALLOW_INSECURE_LAN_HTTP=true` — private LAN addresses
  (`10/8`, `172.16/12`, `192.168/16`).
- Provides `uploadFile(path, filePath, formData)` with the same token-rotation
  behavior for multipart uploads.

### DTOs: `src/api/dto/`

Typed contracts mirroring the backend OpenAPI:

| File | Defines |
| --- | --- |
| `session.ts` | `WechatLoginRequest`, `TokenPair`, `WechatSession`, `CurrentUser`, `Subscription`, `Enterprise`, `LegalDocument`, `UpdateCurrentUserRequest` |
| `billing.ts` | `BillingCatalog`, `SubscriptionPlan`, `TokenPackage`, `PaymentOrder`, `PaymentPage`, `CreateSubscriptionRequest`, `CreateTokenPurchaseRequest` |
| `design.ts` | `DesignJob`, `DesignJobType`, `AssetUploadIntent`, `AssetCompletion`, `DesignJobCreateRequest`, `DesignJobClientInfo`, `DesignJobOutput`, `PromptTemplate` |
| `workspace.ts` | `WorkspaceSummary`, `WorkspaceDetail`, `TokenDetailItem`, share/referral invitations, rewards |

Repository implementations validate every response and throw
`ApiRequestError` (`code: *RESPONSE_INVALID`) when the server contract is
violated — this is how mock/API parity is enforced.

## The repository pattern

Pages depend only on repositories. Each repository has two shapes selected at
build time by a **Vite alias** in `vite.config.ts`:

| Alias | API build | Mock build |
| --- | --- | --- |
| `AccountRepositoryRuntime` | `repositories/accountApi.ts` (rejects — offline data source) | `repositories/account.ts` |
| `TaskRepositoryRuntime` | `repositories/tasksApi.ts` | `repositories/tasks.ts` |
| `WechatCodeRuntime` | `services/wechatCodeLive.ts` | `services/dev/wechatCodeMock.ts` |
| `BackendStatusRuntime` | `components/dev/BackendStatusHidden.vue` | `components/dev/BackendStatus.vue` |
| `StoreDemoRuntime` | `pkg-account/services/storeDemoDisabled.ts` | `pkg-account/services/storeDemoMock.ts` |
| `SubscriptionScenarioRuntime` | `services/subscriptionScenarioDisabled.ts` | `services/dev/subscriptionScenarioMock.ts` |
| `SubscriptionScenarioPanelRuntime` | hidden panel | `pkg-account/components/dev/SubscriptionScenarioPanel.vue` |

Note the interesting asymmetry: in **API mode** the old monolithic
`Session/Workspace/Billing/Organization` repositories are stubbed out by
`accountApi.ts` (they throw `"该离线数据源在生产 API 模式不可用"`). Real API
mode uses the newer, narrower repositories: `wechatSessionRepository`
(`repositories/session.ts`), `currentProfileRepository`
(`repositories/profile.ts`), `personalDesignJobRepository`
(`repositories/designJobs.ts`), and the per-feature repositories under
`pkg-features/repositories/` and `pkg-account/repositories/`.

### Shared repositories (`src/repositories/`)

| Repository | Endpoint(s) | Responsibility |
| --- | --- | --- |
| `wechatSessionRepository` (`session.ts`) | `POST /v1/auth/wechat-login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/legal-documents/current` | Silent login, registration, legal consent, logout |
| `currentProfileRepository` (`profile.ts`) | `GET /v1/me`, `PATCH /v1/me` | Current user, subscription, tokens, enterprise, invitations |
| `personalDesignJobRepository` (`designJobs.ts`) | `GET/DELETE /v1/design-jobs` | List/delete personal design jobs |
| `designJobRepository` (`designJobDetail.ts`) | `GET /v1/design-jobs/{id}` | Single job detail with normalized media |
| `workspaceDesignJobRepository` (`workspaceDesignJobs.ts`) | workspace-scoped job list | Enterprise "all plans" view |
| `designJobTypeCatalogRepository` (`designCatalog.ts`) | `GET /v1/billing/catalog` (public, ETag-cached) | Feature availability + token cost |
| `contentRepository` (`content.ts`) | static | Hero slides, feature grid, room/style option catalogs |
| `workspacesRepository` (`workspaces.ts`) | workspaces endpoints | Workspace list/switch |

### Design-job response contract normalization

`mapDesignJobResponseMedia(job, reject)` in `src/repositories/designJobs.ts` is
the canonical normalizer shared by list and detail. It:

- Walks `job.inputs` and accepts only typed `image` / `audio` / `text` entries,
  collecting the first image `input`, the `recording` audio inputs (with
  sha256/etag/duration/size validation against the same limits used at upload),
  and rejecting unknown shapes.
- Walks `job.outputs` and routes an `artifact` (image/audio/file), a `report`
  (HTML) or a `text` summary (markdown) into typed slots.
- For `voice_summary` jobs it enforces 1–3 audio inputs and requires the
  markdown text exactly when `status === completed`.

`mapDesignJobDetail` (`designJobDetail.ts`) composes this with
`mapDesignJobStatus` and `mapClientInfo` to produce a fully-typed
`DesignJobDetail`. Backend provider I/O changes flow through these single
entry points.

## Key services

| Service | What it does |
| --- | --- |
| `services/wechatAuth.ts` | Builds WeChat login requests (code + phone code + accepted legal docs) |
| `services/accountGate.ts` | The shared registration gate; silent login, phone authorization, legal consent, `ensureRegisteredForAction()` |
| `services/homeEntryGuard.ts` | `inspectHomeEntry(tokenCost)` — counts inflight jobs (`ACTIVE_JOB_LIMIT = 5`) and runs personal-token precheck before a feature opens |
| `services/personalTokenPreflight.ts` | `personalCatalogTokenShortage(profile, cost)` / `assertPersonalTokenBalance(profile, jobType)` |
| `services/pollScheduler.ts` | Generic poll loop; honors `poll_after_seconds`/`Retry-After`, pauses when page hidden, disposes on unmount |
| `services/clientInfo.ts` | Validates/normalizes `ClientInfoDraft` → `DesignJobClientInfo` (last_name, salutation, project_name) |
| `services/idempotency.ts` | Derives a stable `Idempotency-Key` from a logical action (`scope`, `ownerId`, `actionId`) |
| `services/assets.ts` | Resolves CDN image URLs against `VITE_ASSET_BASE_URL` with bundled fallbacks |
| `services/advertising.ts` | Ad splash + home banner (CDN objects with local placeholders) |
| `pkg-features/services/*DesignSubmit.ts` | Submit flows: `standardDesignSubmit`, `furnitureDesignSubmit`, `reportDesignSubmit`, `voiceSummarySubmit` |
| `pkg-features/repositories/designAssets.ts` | Image upload intent → direct upload → complete, with progress |
| `pkg-features/repositories/voiceAudioAssets.ts` | Audio upload intent → direct upload → complete, with retry and duplicate-sha256 rejection |
| `pkg-account/services/payment.ts` | WeChat JSAPI bridge (`uni.requestPayment`), typed `PaymentBridgeError` |
| `pkg-account/services/subscriptionRenewal.ts` | "暂不支持提前续订" guidance for active subscriptions |

## How a feature flow is wired (example: voice summary)

1. User taps **录音需求总结** on home → `home/index.vue` calls
   `inspectHomeEntry(catalog.features.voice_summary.jobType.token_cost)`. If the
   personal token balance is short, a modal offers to open the store; if 5 jobs
   are already in flight, it redirects to "我的方案".
2. The page navigates to `pkg-features/pages/voice_summary/index.vue`.
3. The page loads the catalog (token cost, display name), checks submission
   eligibility (`useSubmissionEligibility`) and restores a draft from
   `yuanzhu.voice-summary-draft.v1`.
4. The user records (via `uni.getRecorderManager`, MP3/16 kHz/mono/48 kbps,
   max 10 min per take) or picks up to 3 files (MP3/WAV/AAC/M4A, ≤ 25 MB,
   ≤ 120 min). Each file is signature-checked against its extension.
5. On submit, `submitVoiceSummary` validates input + client info, fetches
   profile + catalog in parallel, asserts eligibility and token balance, then
   `stageVoiceAudioFiles` runs the intent→upload→complete dance with an
   idempotency key.
6. `submitDesignJob` POSTs `POST /v1/design-jobs`
   (`type: "voice_summary"`, assets, optional `client_info`) and navigates to
   `/pkg-plans/pages/markdown/index?id=<jobId>`.
7. The markdown page polls `loadMarkdownSummary(id)` via `createPollScheduler`
   until terminal, then renders the sanitized markdown blocks and plays back the
   original recordings with **resumable progress** (see
   [Key User Flows](/frontend/key-flows)).

## uni-app specifics worth knowing

- **Page lifecycle**: use `onLoad`, `onShow`, `onHide`, `onUnmounted`,
  `onPullDownRefresh`, `onShareAppMessage`, `onShareTimeline` from
  `@dcloudio/uni-app` (not the plain Vue `onMounted`).
- **`easycom`**: `pages.json` auto-registers uview-plus components via
  `^u-(.*)` → `uview-plus/components/u-$1/u-$1.vue`, so `<u-button>` works
  without imports.
- **Storage**: always `uni.getStorageSync` / `uni.setStorageSync` (wrapped in
  `runtime.ts`). Never touch `localStorage`.
- **Recording**: `uni.getRecorderManager()`; the voice page carefully tracks
  recorder ownership with `WeakMap`/`WeakSet` to discard stale terminal events
  after navigation.
- **Privacy**: recording and file picking are gated on
  `uni.getPrivacySetting().needAuthorization`; the buttons set
  `open-type="agreePrivacyAuthorization"` so WeChat's privacy popup can be
  accepted before the OS permission prompt.
- **Subpackages** are declared under `subPackages` in `pages.json`; the main
  package never statically imports subpackage code.

## Startup sequence

`main.ts` exports `createSSRApp(App)` and registers `uviewPlus`. `App.vue`
implements `onLaunch` → `sessionTokenStore.hydrate()` and imports the generated
design tokens plus uview-plus styles globally. Token hydration is
synchronous and non-blocking; the first authenticated API call refreshes if
needed.

## Next steps

- [Data Source Modes](/frontend/data-source-modes) — how mock/API are chosen.
- [Key User Flows](/frontend/key-flows) — the interactions in detail.
- [Design System](/frontend/design-system) — tokens and UI conventions.
