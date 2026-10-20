# Testing and Quality Gates

Use source tests for business behavior, contract checks for server compatibility, and artifact checks for the actual platform bundle. Run commands from the frontend repository with Node 22 and pnpm 9.15.9. These are repository gates; do not infer that every command is currently wired to a CI workflow.

## Local checks

```bash
pnpm type-check
pnpm type-check:test
pnpm test:domain
pnpm test:unit
pnpm check:api-contract
pnpm check:design-system
```

`pnpm test` runs domain then unit tests. `test:domain` uses Node's `--experimental-strip-types` runner. Vitest uses happy-dom, Vue Test Utils and the `uni` harness; its aliases intentionally choose test implementations. `pnpm test:coverage` applies the thresholds in `vitest.config.ts`, including stricter per-file requirements. Read that configuration rather than carrying a fixed test count or threshold table in a second place.

## Contract checks

The contract gate verifies committed OpenAPI/fixture evidence, DTOs, candidate compatibility, project status/activity evidence and route/artifact constraints. The latest command includes the issue 611 and 619 project contracts alongside earlier compatibility fixtures.

```bash
pnpm check:openapi
pnpm check:openapi:live
```

The live check needs the intended configured backend. `pnpm openapi:update` intentionally changes the snapshot; use it only for a reviewed contract update, then inspect the diff. Some project evidence is captured from pinned backend AST/schema definitions instead of replacing the general snapshot. Do not blindly regenerate every fixture against a random running stack.

## Platform artifacts

```bash
pnpm quality:mp-weixin:mock
pnpm quality:mp-weixin:api
pnpm quality:mp-toutiao:mock
```

The WeChat gates first run `test:weixin-babel`, then contract/design checks, build and compiled-code inspection. Production API also checks the project-enabled artifact. The Babel gate catches module-binding failures that can appear only after WeChat's additional transformation.

WeChat artifact checks cover lazy component loading, minification and domain settings, main/subpackage sizes up to 1.5 MiB, individual bundled media up to 200 KiB (warning above 180 KiB), unwanted files, project isolation/navigation, import/vendor startup behavior and production removal of development code. Avoid copying historic measured package sizes as current results.

Douyin gates verify platform AppID, industry SDK metadata, privacy setting, project navigation/isolation, module imports and profile runtime. Environment-specific gates are available as `quality:mp-toutiao:local-test`, `:cloud-test`, `:cloud-production`. They invoke wrappers that check live readiness and therefore need the selected environment to exist.

## Integration and real UI checks

| Command | Purpose |
| --- | --- |
| `test:integration:auth` | Backend authentication integration |
| `test:integration:design-config` | Design configuration import integration |
| `test:smoke:server` | Server-backed smoke flows |
| `test:smoke:coverage` | Live API harness coverage |
| `test:smoke:design-ui` | Real DevTools design vertical slice |

Read each runner's required environment before invoking it. A real DevTools session needs the project's authorization/setup and must preserve another session's stack. For first-run automation and selectors see the pinned frontend real-UI runbook linked below.

Acceptance for this codebase should include account/workspace switches during pending reads, uncertain submission recovery, subscription/Token rejection, project stage/outcome and member read-only behavior, expired media URLs, safe Markdown, short-video handoff and platform-specific payment recovery. Use affected focused tests before expensive environment checks.

## Record useful evidence

Report the source SHA, command, selected platform/profile, API origin, owned local project/port and result. Distinguish a compiled-artifact pass, a simulated UI pass, a real local API pass and a device/live-provider acceptance. Keep tokens, private keys, signed URLs and invitation bearers out of evidence.

## Source evidence

Frontend `eca0a5f`, backend `b13cc56` (2026-10-20): [Commands](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/package.json) · [Vitest configuration](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/vitest.config.ts) · [WeChat artifact checks](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/scripts/check-code-quality.mjs) · [Douyin checks](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/scripts/check-douyin-quality.mjs) · [Real UI runbook](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/documents/MINIPROGRAM_REAL_UI_TESTING.md).
