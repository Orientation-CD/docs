# Frontend Overview

The frontend repository (`wechat_mini_program`, package name
`yuanzhu-ai-mini-program`) contains the **WeChat mini program** — the product's
user-facing application. This section is a deep dive into the tech stack, code
layout, architecture, build modes, key user flows, the design system and
testing. It assumes you have **no prior background** in uni-app or WeChat mini
programs; each concept is introduced in context.

> Repository branch: `ui-integration`. The internal WeChat AppID is
> `wxec0d577de41255aa` (public). The AppSecret, OpenID and session keys are
> **server-side only** and must never appear in this repo.

## What it is

- A **uni-app** project — a Vue-based meta-framework that compiles the same
  source to **WeChat Mini Program** (the primary and only shipped target),
  other mini-program platforms (Alipay, Baidu, Douyin, QQ, …) and H5.
- Written in **Vue 3 (Composition API, `<script setup>`) + TypeScript**, using
  **uview-plus** (`uview-plus` 3.8.55) for off-the-shelf components.
- Runtime state is intentionally minimal: the only persistent store is a
  lightweight **module-level session token store** (`src/stores/session.ts`)
  backed by `uni.setStorageSync`. There is no global state-management library
  in `package.json`; pages use local `ref`/`computed` plus repository calls.
- The single source of truth for product/interaction is `documents/UI.md`; the
  API contract is `documents/REST_API_INTERFACE.md`.

## The product features

The home screen exposes a rotating hero carousel plus a 3×N feature grid.
Features are **published** (shipped to users) or **development** (shown but
marked "coming soon"):

| Feature key (`FeatureKey`) | Page | Result kind | Status |
| --- | --- | --- | --- |
| `interior` | `pkg-features/pages/interior/index` | `IMAGE` | Published |
| `local` | `pkg-features/pages/local/index` | `IMAGE` | Published |
| `furniture` | `pkg-features/pages/furniture/index` | `IMAGE` | Published |
| `kitchen` | `pkg-features/pages/kitchen/index` | `IMAGE` | Published |
| `bathroom` | `pkg-features/pages/bathroom/index` | `IMAGE` | Published |
| `colored_floor_plan` | `pkg-features/pages/colored_floor_plan/index` | `IMAGE` | Published |
| `voice_summary` | `pkg-features/pages/voice_summary/index` | `MARKDOWN` | Published |
| `report` (`html_report`) | `pkg-features/pages/report/index` | `HTML_REPORT` | Server-disabled from home |
| `ai_tour_video`, `space_renewal_animation` | — | — | Development placeholders |

Availability is **not** hard-coded. The home page fetches
`GET /v1/billing/catalog` and lets the backend decide which job types are
active; unknown/inactive types render as "in development" cards. See
`src/repositories/designCatalog.ts`.

On top of the design features sits an account/billing layer: WeChat
registration/login, personal & enterprise workspaces, a store (token packages /
subscriptions), payment orders, a token ledger, enterprise seats, share
invitations and referral rewards.

## Repository layout

```
wechat_mini_program/
├── src/
│   ├── pages/                  # Main package (tab bar + splash)
│   │   ├── ad-splash/index.vue # 5s skippable ad splash
│   │   ├── splash/index.vue    # 3s brand splash
│   │   ├── home/index.vue      # Home: ad banner, hero carousel, feature grid
│   │   ├── contact/index.vue   # 联系我们 (contact)
│   │   ├── plans/index.vue     # 我的方案 (my plans list)
│   │   └── profile/index.vue   # 我的 (profile tab)
│   ├── pkg-features/           # Subpackage: design + voice flows
│   │   ├── pages/{interior,local,kitchen,bathroom,colored_floor_plan,
│   │   │            furniture,report,voice_summary}/index.vue
│   │   ├── components/         # FeatureShell, StandardFeaturePage, OptionGrid,
│   │   │                       # UploadStep, ImageConfirmStep, ClientInfoForm,
│   │   │                       # SubmittedStep, TokenShortageDialog ...
│   │   ├── composables/        # useDesignTokenCost, useSubmissionEligibility
│   │   ├── repositories/      # designAssets, designJobSubmit, standardDesignJob,
│   │   │                       # furnitureDesignJob, promptCatalog, voiceAudioAssets ...
│   │   └── services/           # *DesignSubmit, voiceSummarySubmit, voiceAudioFiles, ...
│   ├── pkg-plans/              # Subpackage: plan detail, report, markdown summary
│   │   ├── pages/detail/index.vue
│   │   ├── pages/report/index.vue
│   │   ├── pages/markdown/index.vue   # voice summary view + resumable playback
│   │   ├── repositories/       # designJob, resultFile, httpUrl
│   │   └── services/           # markdownSummary, reportViewer, designComparison, resultDownload
│   ├── pkg-account/            # Subpackage: login, store, billing, org, tokens
│   │   ├── pages/{login,profile,legal,store,orders,subscription,organization,
│   │   │            invitation,rewards,tokens}/index.vue
│   │   ├── components/         # AccountPage, dev SubscriptionScenarioPanel
│   │   ├── repositories/       # paymentOrder, paymentHistory, paymentResume,
│   │   │                       # paymentReconciliation, paymentClose, purchaseRequest,
│   │   │                       # billingCatalog, workspaces, memberSelfLeave, rewards ...
│   │   └── services/           # payment, pricePresentation, entitlementPresentation,
│   │                           # subscriptionRenewal, storeDemo*, submissionCatalogPresentation
│   ├── repositories/           # Shared async repositories (session, profile,
│   │                           # designJobs, designCatalog, content, workspaces, ...)
│   ├── services/               # Shared services (request, wechatAuth, accountGate,
│   │                           # pollScheduler, homeEntryGuard, clientInfo, assets, ...)
│   ├── stores/session.ts       # Token-pair persistence (the only store)
│   ├── api/dto/                # Typed API contracts (design, session, billing, workspace)
│   ├── domain/                 # Pure domain logic (report, tasks, wallet)
│   ├── types/                  # Shared TS types (design, home, account, auth)
│   ├── components/             # Shared components (home/FeatureGrid, home/HeroCarousel,
│   │                           # common/RemoteImage, common/DesignIcon, account/..., dev/...)
│   ├── static/                # Icons, tabbar images, brand assets, placeholders
│   ├── styles/                # design-tokens.json + generated SCSS/TS, placeholder.scss
│   ├── App.vue                 # App entry (hydrate session on launch)
│   ├── main.ts                 # createSSRApp + uview-plus
│   ├── manifest.json           # uni-app / WeChat build manifest (AppID, permissions)
│   └── pages.json              # Pages, subpackages, tabBar, globalStyle
├── scripts/                    # Build helpers, quality gates, design-system gen
├── tests/                      # Vitest unit tests + node:test domain tests + harness
├── documents/                  # UI spec, REST API interface, runbooks
├── vite.config.ts              # Build + compile-time alias wiring
├── vitest.config.ts            # Test runner + coverage thresholds
└── package.json               # Scripts (dev/build/test per platform)
```

## Key design decisions

### 1. Pages never call HTTP directly

Every screen depends only on **asynchronous repositories**. There is no fetch
in a page `.vue` file. The repository layer is what makes Mock mode and API
mode interchangeable — see [Data Source Modes](/frontend/data-source-modes).

### 2. Mock vs API is decided at compile time

`vite.config.ts` uses Vite **resolve aliases** that point abstract module names
(e.g. `AccountRepositoryRuntime`, `TaskRepositoryRuntime`, `WechatCodeRuntime`)
at either the mock or the API implementation based on `VITE_DATA_SOURCE`,
`VITE_WECHAT_AUTH_MODE` and friends. There is **no runtime switch**; each build
is a fixed configuration.

### 3. Every backend response is validated

Repository functions treat raw JSON as `unknown` and re-shape it into typed
domain objects, throwing `ApiRequestError` (`code: *RESPONSE_INVALID`) on any
contract violation. This is what keeps mock/API parity honest — see
`mapDesignJobResponseMedia` in `src/repositories/designJobs.ts` and
`mapDesignJobDetail` in `src/repositories/designJobDetail.ts`.

### 4. Compile-time strictness

The build runs type checks (`vue-tsc`), domain tests, unit tests and a battery
of **quality gates** that inspect the compiled mini program (package sizes,
domain validation, forbidden files). See [Testing & Quality Gates](/frontend/testing).

## Main package vs subpackages

WeChat limits the main package size. Heavy feature code is split into
**subpackages** loaded on demand (declared in `src/pages.json`, with
`mp-weixin.optimization.subPackages: true` and
`lazyCodeLoading: "requiredComponents"`):

| Chunk | Contents |
| --- | --- |
| Main package | Splash screens, home, plans, profile, contact, tab bar |
| `pkg-features` | Design + voice feature flow pages and their logic |
| `pkg-plans` | Plan detail, HTML report viewer, markdown voice-summary viewer |
| `pkg-account` | Login, store, orders, subscription, organization, invitation, rewards, tokens |

Recent mock-mode sizes (from the project README): main ≈ 395 KiB,
`pkg-features` ≈ 57 KiB, `pkg-plans` ≈ 9 KiB, `pkg-account` ≈ 26 KiB. The WeChat
limit is 1.5 MiB per chunk.

## The tab bar

Four tabs are declared in `pages.json` → `tabBar`:

| Tab | Page |
| --- | --- |
| 首页 | `pages/home/index` |
| 联系我们 | `pages/contact/index` |
| 我的方案 | `pages/plans/index` |
| 我的 | `pages/profile/index` |

The active color is the brand sage `#526F5A`; the idle color is `#858A85`.

## Next steps

- [Frontend Getting Started](/frontend/getting-started) — install, run, build.
- [Architecture](/frontend/architecture) — layers, subpackages, stores and how
  they interact.
- [Data Source Modes](/frontend/data-source-modes) — mock vs API and every
  environment variable.
- [Key User Flows](/frontend/key-flows) — what happens in the UI for each major
  interaction.
- [Design System](/frontend/design-system) — tokens and UI conventions.
- [Testing & Quality Gates](/frontend/testing).
