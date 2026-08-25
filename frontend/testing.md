# Testing & Quality Gates

The frontend treats testing and build-quality as a **first-class release gate**.
A change is not "done" until the checks below pass. There are three layers:
**domain tests**, **unit tests**, and **build-time quality gates** that inspect
the actual compiled mini program.

## Test commands

```bash
# Fast, no compile: pure domain logic tests (Node's built-in test runner)
pnpm test:domain

# Unit tests with Vitest
pnpm test:unit

# Everything (domain + unit)
pnpm test

# Full quality gate for the API production bundle (CI uses this)
pnpm quality:mp-weixin:api

# Quality gate for the mock bundle
pnpm quality:mp-weixin:mock
```

There is also a lightweight per-command suite:

```bash
pnpm type-check          # vue-tsc --noEmit
pnpm check:api-contract  # OpenAPI snapshot + contract fixtures + DTO checks
pnpm check:design-system # generated design tokens in sync
pnpm build:mp-weixin     # production-style API build
node scripts/check-code-quality.mjs   # inspect the built bundle
```

## 1. Domain tests (`pnpm test:domain`)

Pure business logic that does **no I/O** (report composition, task merging,
wallet math, idempotency) lives in `src/domain/` and is tested with Node's
built-in test runner (`tests/domain.test.mjs`). These run in milliseconds
without a bundler.

## 2. Unit tests (`pnpm test:unit`)

Vitest-based unit tests (`tests/*.test.ts` + `vitest.config.ts`) cover:

- Repository **response validation** (mock-vs-API contract parity).
- Services: poll scheduler, request/token-refresh logic, report viewer
  validation, payment bridge, idempotency.
- Components and page logic with `@vue/test-utils` + happy-dom.

Run with coverage:

```bash
pnpm test:coverage        # vitest run --coverage
pnpm test:unit:watch      # watch mode
```

## 3. Contract checks (`check:api-contract`)

The frontend pins itself to the backend **OpenAPI contract** so drift is
caught in CI, not in production:

- `scripts/check-openapi-snapshot.mjs` — verifies the committed OpenAPI
  snapshot matches the expected contract (or updates it with `--update`).
- `scripts/check-contract-fixtures.mjs` — validates contract fixtures.
- `scripts/check-api-dtos.mjs` — validates `src/api/dto/*` against the
  contract.
- `scripts/check-api-contract.mjs` — final assembly of the above.

Keeping the snapshot in sync is part of normal backend-contract changes:

```bash
pnpm openapi:update       # regenerate the snapshot after a backend change
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
| Forbidden files | No CDN content photos, `.DS_Store`, or main-package JS used only by subpackages |
| No deleted bundles | Build output doesn't contain removed "cost plan" bundles |
| Production hygiene | API production bundle excludes dev health checks and connection-status components |

Recent mock-mode sizes for reference: main ≈ 395 KiB, `pkg-features` ≈ 57 KiB,
`pkg-plans` ≈ 9 KiB, `pkg-account` ≈ 26 KiB.

## Real UI testing (optional)

For testing inside the **real WeChat DevTools** (UI automation, no focus
stealing, selectors, synchronization, deterministic-state coverage), the repo
documents a full procedure in
`documents/MINIPROGRAM_REAL_UI_TESTING.md`. There is also a
`pnpm test:smoke:design-ui` vertical-slice runner.

## Suggested workflow before committing

```bash
pnpm test:domain
pnpm type-check
pnpm quality:mp-weixin:mock   # fast local feedback
pnpm quality:mp-weixin:api    # production-bundle gate (CI)
```

## Next steps

- [Data Source Modes](/frontend/data-source-modes) — why mock and API builds
  are both gated.
- [Design System](/frontend/design-system) — what `check:design-system` enforces.
