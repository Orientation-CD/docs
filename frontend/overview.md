# Frontend Overview

The frontend repository (`wechat_mini_program`) contains the **WeChat mini
program** — the product's user-facing application. This section is a deep dive:
tech stack, code layout, architecture, build modes, key user flows, the design
system and testing.

## What it is

- A **uni-app** project — a Vue-based framework that compiles to **WeChat Mini
  Program** (the primary target), other mini-program platforms, and H5.
- Written in **Vue 3 + TypeScript + Pinia**, using the **uview-plus** component
  library.
- The single source of truth for product and interaction is
  `documents/UI.md`; the API contract is `documents/REST_API_INTERFACE.md`.

## The six features

The product's core is six flows, all built on the same asynchronous "design
job" backend pattern:

1. **Interior design** — full-room redesign from a photo.
2. **Local renovation** — targeted change of one area.
3. **Kitchen renovation**.
4. **Bathroom renovation**.
5. **Furniture try-on** — canvas mask + furniture placement onto a space photo.
6. **Design report** — an HTML report built from a completed design job.

Plus an account layer: WeChat registration/login, personal & enterprise
workspaces, a store (token packages / subscriptions), orders, tokens and
membership/invitations.

## Repository layout

```
wechat_mini_program/
├── src/
│   ├── pages/                  # Main-package pages (tab bar + splash)
│   │   ├── ad-splash/          # 5s skippable ad splash
│   │   ├── splash/             # 3s brand splash
│   │   ├── home/               # Home page (feature grid, ads)
│   │   ├── plans/              # "My plans" list
│   │   ├── profile/            # "My" profile tab
│   │   └── contact/            # Contact page
│   ├── pkg-features/           # Subpackage: the six feature flows
│   │   ├── pages/{interior,local,kitchen,bathroom,furniture,report}/
│   │   ├── repositories/       # Feature data access
│   │   └── services/           # Feature business logic (submit flows)
│   ├── pkg-plans/              # Subpackage: plan detail + report viewer
│   ├── pkg-account/            # Subpackage: login, store, orders,
│   │   │                       #   subscription, organization, tokens, profile
│   │   ├── pages/
│   │   ├── repositories/
│   │   └── services/
│   ├── repositories/           # Shared async repositories (session, jobs...)
│   ├── services/               # Shared services (request, wechatAuth, poll...)
│   ├── stores/                 # Pinia stores (session tokens)
│   ├── api/dto/                # Typed API contracts (design, session, billing, workspace)
│   ├── domain/                 # Pure domain logic (report, tasks, wallet)
│   ├── types/                  # Shared TS types
│   ├── static/                 # Icons, images, brand assets
│   ├── styles/                 # Design tokens, global styles
│   ├── App.vue                 # App entry (hydrate session on launch)
│   └── pages.json              # Pages, subpackages, tabBar config
├── scripts/                    # Build helpers (LAN detection, design-system gen)
├── tests/                      # Vitest unit tests + domain tests
├── documents/                  # UI spec, API interface, testing guides
└── package.json                # Scripts (dev/build/test per platform)
```

## Key design decisions

### 1. Everything goes through an async repository layer

Pages **never call HTTP directly**. They depend only on seven asynchronous
repositories:

- **Content** — catalogues, prompt templates, legal documents, ads.
- **Session** — WeChat login/register, token refresh, profile.
- **Workspace** — personal & enterprise workspaces, membership, invitations.
- **Task** — design jobs: submit, poll, list, delete.
- **Plan** — the "my plans" experience over design jobs.
- **Billing** — store catalog, orders, payment, subscriptions, tokens.
- **Organization** — enterprise management (owner-only).

This makes **Mock mode** trivial (each repository has an in-memory
implementation) and keeps API mode a thin HTTP-bound implementation of the same
interfaces.

### 2. Mock vs API is decided at compile time

Environment variables (`VITE_DATA_SOURCE=mock|api`, `VITE_PAYMENT_MODE`,
`VITE_WECHAT_AUTH_MODE`, ...) select which repository implementations and which
auth/payment bridges are bundled. There is **no runtime switch** — each build is
a fixed configuration. See [Data Source Modes](/frontend/data-source-modes).

### 3. Compile-time strictness

The build runs type checks (`vue-tsc`), domain tests, unit tests and a battery
of **quality gates** that inspect the built mini program (package sizes, domain
validation, forbidden files). See [Testing & Quality Gates](/frontend/testing).

## Main-package vs subpackages

WeChat limits the main package size. The project keeps the main package small by
putting heavy feature code into **subpackages** loaded on demand:

| Chunk | Contents |
| --- | --- |
| Main package | Splash screens, home, plans, profile, contact, tab bar |
| `pkg-features` | The six feature flow pages + logic |
| `pkg-plans` | Plan detail + report viewer |
| `pkg-account` | Login, store, orders, subscription, organization, invitation, tokens, profile |

Typical mock-mode sizes (from the project README): main ~395 KiB,
`pkg-features` ~57 KiB, `pkg-plans` ~9 KiB, `pkg-account` ~26 KiB.

## Next steps

- [Getting Started](/frontend/getting-started) — install, run, build.
- [Architecture](/frontend/architecture) — pages, subpackages, stores,
  repositories and how they interact.
- [Data Source Modes](/frontend/data-source-modes) — mock vs API and every
  environment variable.
- [Key User Flows](/frontend/key-flows) — what happens in the UI for each
  major interaction.
- [Testing & Quality Gates](/frontend/testing).
