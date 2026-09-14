# Testing & Quality Gates

The frontend treats testing and build-quality as a **first-class release gate**.
A change is not "done" until the checks below pass. There are four layers:
**domain tests**, **Vitest unit tests**, **API contract checks**, and
**build-time quality gates** that inspect the actual compiled mini program.

## Test commands

```bash
# Pure domain logic (Node's built-in runner, no bundler)
pnpm test:domain

# Unit tests with Vitest
pnpm test:unit

# Everything (domain + unit)
pnpm test

# Coverage
pnpm test:coverage
pnpm test:unit:watch

# Type check
pnpm type-check
pnpm type-check:test

# Full quality gates (CI uses these)
pnpm quality:mp-weixin:mock
pnpm quality:mp-weixin:api
```

`quality:mp-weixin:api` assembles:

```
check:api-contract && check:design-system && build:mp-weixin:api
  && check-code-quality.mjs --api-production
```

There are also integration/smoke runners that need a live backend:

```bash
pnpm test:integration:auth          # node --test tests/authApi.integration.test.mjs
pnpm test:integration:design-config # tests/importDesignConfig.test.mjs
pnpm test:smoke:server               # tests/serverBacked.smoke.test.mjs
pnpm test:smoke:coverage             # live-API harness coverage
pnpm test:smoke:design-ui            # vertical-slice design UI runner
```

## 1. Domain tests (`pnpm test:domain`)

Pure business logic that does **no I/O** lives in `src/domain/`
(`report.ts`, `tasks.ts`, `wallet.ts`) and is executed with Node's built-in
test runner:

```bash
node --experimental-strip-types --test tests/domain.test.mjs
```

These run in milliseconds without a bundler.

## 2. Unit tests (`pnpm test:unit`)

Vitest 1.6.1 runs ~115 `tests/*.test.ts` files under `tests/`. Configuration
lives in `vitest.config.ts`:

- **Environment**: `happy-dom`.
- **Setup**: `tests/setup.ts` installs the `uni` mock from
  `tests/harness/`, resets mocks between tests, and clears the DOM.
- **Aliases**: mirrors the production aliases but pins them to the mock
  implementations (so unit tests always run against deterministic data).
- **Includes**: `tests/**/*.test.ts`.

Coverage is collected with `@vitest/coverage-v8`:

| Threshold | Value |
| --- | --- |
| Statements | 30% global |
| Branches | 67% global |
| Functions | 44% global |
| Lines | 30% global |

On top of the global floor, a long list of **critical files is pinned to 100%**
(or near 100% where V8 maps a generated Vue wrapper):

- Domain: `src/domain/report.ts`, `src/domain/tasks.ts`, `src/domain/wallet.ts`.
- Request/observability: `src/services/request.ts`,
  `src/services/apiObservability.ts`, `src/services/pollScheduler.ts`,
  `src/services/idempotency.ts`.
- Home gating: `src/services/homeEntryGuard.ts`,
  `src/services/personalTokenPreflight.ts`, `src/pages/home/index.vue`.
- Design submission: `pkg-features/repositories/designAssets.ts`,
  `standardDesignJob.ts`, `furnitureDesignJob.ts`, `designJobSubmit.ts`,
  `pkg-features/services/standardDesignSubmit.ts`, `furnitureDesignSubmit.ts`,
  `designTokenPreflight.ts`, `imageFileMetadata.ts`, `designSubmitError.ts`.
- Voice: `pkg-features/repositories/voiceAudioAssets.ts` (covered via
  `voiceAudioAssets.test.ts`, `voiceAudioFiles.test.ts`,
  `voiceSummarySubmit.test.ts`, `voiceSummaryPage.test.ts`).
- Plans/markdown: `pkg-plans/services/reportViewer.ts`,
  `pkg-plans/pages/markdown/index.vue` (covered via `markdownSummary.test.ts`,
  `markdownSummaryPage.test.ts`), `pkg-plans/repositories/resultFile.ts`.
- Billing/payment: `pkg-account/repositories/paymentOrder.ts`,
  `paymentHistory.ts`, `paymentResume.ts`, `paymentReconciliation.ts`,
  `paymentClose.ts`, `purchaseRequest.ts`, `pkg-account/services/payment.ts`,
  `pricePresentation.ts`, `entitlementPresentation.ts`.
- Account/session: `src/repositories/session.ts`, `account.ts`, `profile.ts`,
  `designJobs.ts`, `designJobDetail.ts`, `workspaceDesignJobs.ts`, `content.ts`.

Excluded from coverage: `*.d.ts`, `src/api/dto/**`, `src/types/**`,
`src/main.ts`, `src/App.vue`.

### What the unit tests cover

- Repository **response validation** (mock-vs-API contract parity) — every
  normalizer has a test that feeds malformed JSON and expects
  `*RESPONSE_INVALID`.
- Services: poll scheduler, request/token-refresh, report viewer validation,
  payment bridge, idempotency, retry-after, design failure presentation.
- Components and page logic with `@vue/test-utils` — home page, feature
  shell, option grids, voice summary page, markdown page, payment pages.

## 3. Contract checks (`check:api-contract`)

The frontend pins itself to the backend **OpenAPI contract** so drift is caught
in CI, not in production:

| Script | What it does |
| --- | --- |
| `check-openapi-snapshot.mjs` | Verifies the committed OpenAPI snapshot matches the expected contract; `--update` refreshes it; `--live` fetches from a running backend |
| `check-contract-fixtures.mjs` | Validates contract fixtures used by tests |
| `check-api-dtos.mjs` | Validates `src/api/dto/*` against the contract |
| `check-api-contract.mjs` | Runs all three above |

Keeping the snapshot in sync is part of normal backend-contract changes:

```bash
pnpm openapi:update    # regenerate the snapshot after a backend change
```

## 4. Build-time quality gates

`scripts/check-code-quality.mjs` inspects the **compiled mini program** and
fails the build on any violation:

| Gate | What it verifies |
| --- | --- |
| `lazyCodeLoading: requiredComponents` | Main package doesn't preload unused components |
| Compression | JS / WXML / WXSS are minified; no dependency files shipped |
| Legal-domain validation | Release config enables 合法域名校验 (domain allow-listing) |
| Package size | Main package and each subpackage ≤ 1.5 MiB |
| Bundled media | Media ≤ 200 KiB (warn above 180 KiB) |
| Forbidden files | No CDN photos, `.DS_Store`, or main-package JS used only by subpackages |
| No deleted bundles | Build output doesn't contain removed "cost plan" bundles |
| Production hygiene | API production bundle excludes dev health checks and connection-status components |

Recent mock-mode sizes for reference: main ≈ 395 KiB,
`pkg-features` ≈ 57 KiB, `pkg-plans` ≈ 9 KiB, `pkg-account` ≈ 26 KiB.

## Real WeChat DevTools UI testing (optional)

For UI automation inside the **real WeChat DevTools** (first-run configuration,
no focus-stealing, selectors, synchronization, deterministic-state coverage),
see `documents/MINIPROGRAM_REAL_UI_TESTING.md`. The
`pnpm test:smoke:design-ui` runner executes a design vertical slice end to end.

## Suggested workflow before committing

```bash
pnpm test:domain
pnpm type-check
pnpm quality:mp-weixin:mock    # fast local feedback
pnpm quality:mp-weixin:api     # production-bundle gate (CI)
```

## Next steps

- [Data Source Modes](/frontend/data-source-modes) — why mock and API builds are both gated.
- [Design System](/frontend/design-system) — what `check:design-system` enforces.
