# Frontend Overview

`wechat_mini_program`, branch **`ui-integration`**, builds the WeChat and Douyin mini programs from uni-app, Vue 3, TypeScript and uview-plus. The pinned package manager is **pnpm 9.15.9**. There is no Pinia dependency: credentials use a module-level session store, while pages and repositories manage scoped state and caches.

## Product navigation

The main home entries are **AI设计** and **AI创作**. AI design contains interior, furniture try-on, colored floor plans, recording summary, customized design, design reports and an old-house-renovation folder; that folder contains local, kitchen and bathroom renovation. AI creation contains video and copywriting. AI Q&A is entered from the profile page. Group pages include a breadcrumb and shared back/home navigation.

With `VITE_ENABLE_PRIVATE_PROJECTS=true`, the main tabs are Home, Contact, Projects, Plans and Profile. Otherwise the Project tab and project subpackage are compiled out. A generic Mock build does not automatically enable projects.

| Capability | Main implementation | Output |
| --- | --- | --- |
| Standard design and renovation | `pkg-features/components/StandardFeaturePage.vue` | Image |
| Furniture try-on | `pkg-features/pages/furniture` | Mask/reference-based image |
| Customized design | `pkg-features/pages/customized_design` | Image using editable template fields |
| Recording summary | `pkg-features/pages/voice_summary` | Markdown and original-audio playback |
| Video creation | `pkg-features/pages/video_generation` | Video |
| Copywriting / AI Q&A | `pkg-features/pages/copywriting` | Eight text-only Markdown Workflows |
| Design report | `pkg-features/pages/design_report` | Blueprint-based HTML report, with export behavior determined by supported products |
| Historical report | `pkg-plans/pages/report` | Earlier `html_report` compatibility |

The table describes implemented UI. Anonymous `/v1/billing/features` discovery, release visibility and account entitlements determine what is available in a given deployment. Prices are server values. A discovery failure must not be presented as a successful empty catalog.

## Code layout

| Directory | Responsibility |
| --- | --- |
| `src/pages` | Startup screens, home, contact, projects/plans/profile tabs, diagnostics and payment-order entry |
| `src/pkg-features` | Feature forms, upload/submit orchestration, local draft handling |
| `src/pkg-plans` | Image comparison, Markdown/audio, video and report result viewers |
| `src/pkg-projects` | Project editor/detail, member project view and activity; conditional subpackage |
| `src/pkg-account` | Login, legal documents, account profile, store, subscription, orders, tokens, organization and drafts |
| `src/repositories`, `src/api/dto` | Validated data access and API contracts |
| `src/services`, `src/stores`, `src/domain` | Shared behavior, session credentials and pure domain logic |
| `config`, `scripts`, `tests` | Build profiles, artifact/contract gates and test harnesses |

## Build and ownership boundaries

Frontend Mock provides deterministic image/UI demonstrations; it does not expose every API-only capability. API mode uses the real backend and can independently select platform authentication/payment. Server secrets never belong in `VITE_*` settings, because these values enter the client bundle.

The frontend documents distinguish current UI constraints from the wider public contract. For example, video UI requires exactly one scene reference, while the backend accepts zero to twelve; the UI's script limit is also narrower. See [Workflows](/frontend/workflows).

Start with [Getting started](/frontend/getting-started), then [Architecture](/frontend/architecture). Detailed behavior is split into [Key flows](/frontend/key-flows), [Workflows](/frontend/workflows), [Projects](/frontend/projects) and [Platforms](/frontend/platforms).

## Source evidence

Frontend `eca0a5f` (2026-10-20): [Feature groups](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/featureGroups.ts) · [Page registration](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pages.json) · [Package](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/package.json).
