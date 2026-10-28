# Frontend Tests and Artifact Gates

Use Node 22 and pnpm 9.15.9 from the frontend root. A unit pass, a compiled artifact, an API integration and a live-provider/device acceptance prove different things. Select checks for the changed boundary and record the actual source revision and environment.

## Source tests and the current command chain

```bash
pnpm type-check
pnpm type-check:test
pnpm test
pnpm check:api-contract
pnpm check:design-system
```

`pnpm test` now runs **domain → package-budget tests → unit tests**. Domain tests use Node's type-stripping runner. Vitest uses happy-dom, Vue Test Utils and the uni harness. Test aliases intentionally substitute implementations; a passing Mock component cannot prove the API build selected the right module.

Use `pnpm test:unit` or affected test files for focused feedback. `test:coverage` applies the current `vitest.config.ts` global/per-file thresholds; do not maintain a second changing numeric threshold table in prose.

## Contract evidence and its limits

| Check | Evidence boundary |
| --- | --- |
| `check:openapi` | Committed general snapshot consistency |
| `check:openapi:live` | The explicitly configured reachable backend's current OpenAPI |
| `check:contract-fixtures`, `check:api-dtos` | Selected fixture/projection and DTO compatibility |
| `check:api-contract` | Combined source/route/origin/fixture/DTO/project checks listed in package.json |
| `openapi:update` | Intentional snapshot mutation; review its diff before accepting |

The source contract gate understands a query suffix only when its local const binding is proven to contain a query or empty string. This avoids accidentally dropping dynamic route segments. Static-asset origins in build assignments are distinguished from forbidden remote API origins.

Floor-plan fixtures come from a candidate backend branch. Their gate proves the frontend matches those fixtures; it does **not** prove audited backend `main` or a deployment supplies the feature. See [Floor-plan contract scope](/frontend/floor-plans). Do not regenerate unrelated contract fixtures against whichever stack happens to occupy a familiar port.

## Actual mini-program package gates

```bash
pnpm quality:mp-weixin:mock
pnpm quality:mp-weixin:api
pnpm quality:mp-toutiao:mock
```

WeChat quality chains include `test:weixin-babel` before contract/design, build and artifact inspection. This checks the extra transformation WeChat applies; module binding/startup failures can survive normal unit tests. Douyin chains check its own AppID, SDK metadata, privacy and profile runtime.

| Gate | Audited product rule |
| --- | --- |
| Main package and every subpackage | At most 1.5 MiB each, as this repository's budget |
| Package references | Inspect JS imports/requires, JSON components, template includes and style imports; reject main→subpackage and cross-subpackage edges |
| WeChat main headroom | At least 64 KiB when projects are enabled **and the artifact is not API production** |
| Douyin main headroom | Common package inspector called with minimum 0; 1.5 MiB budget still applies |
| Bundled media in WeChat | Hard 200 KiB, warning above 180 KiB |
| Production API | Development overlays/scenario implementations removed; production origin and project checks applied |

These are implementation rules, not a restatement of a platform vendor's official maximum. Inspect the measured report for the actual candidate instead of copying old package sizes. Legitimate main-package components such as a shared uview form item must not be removed by an over-broad prefix rule.

Environment gates (`quality:mp-toutiao:local-test`, `:cloud-test`, `:cloud-production`) invoke readiness-checking wrappers and need the selected environment. They do not start an owned local stack automatically.

## Focused suites worth knowing

| Area | Examples in `tests/` |
| --- | --- |
| Themes and Home | `theme.test.ts`, `designThemes.test.mjs`, `homePage.test.ts`, `homeScopeSwitch.test.ts` |
| Media and video | `localMediaStore.test.ts`, `sameStyleVideo.test.ts`, `videoGenerationSubmit.test.ts` |
| Member dashboards/read-only | `memberProjectDashboard.test.ts`, `enterpriseProjectOverview.test.ts`, `enterpriseProjectDetails.test.ts` |
| Professional floor plans | `floorPlan*.test.*` plus pinned source fixtures |
| Package/runtime transformation | `miniProgramPackageBudget.test.mjs`, `weixinBabelArtifact.test.mjs` |

A source fixture or simulated rendering is not final owner visual/device acceptance. Native validation should include narrow screens, unknown submission recovery, stale local files, account/workspace changes during pending reads, owner-role loss, playback and platform payment recovery.

## Integration runners and useful evidence

`test:integration:auth`, `test:integration:design-config`, `test:smoke:server`, `test:smoke:coverage` and `test:smoke:design-ui` have different setup requirements. Read the pinned real-UI runbook and selected runner before invoking them. Preserve other sessions' stacks and use the expressly chosen backend port; never claim a real integration pass from a source-only test.

Record commit, command, platform/profile, API origin, local stack ownership and result. Exclude tokens, private keys, signed URLs, full editor handoff fragments and invite bearers. Separate artifact, simulated UI, local API and live-provider evidence.

## Source evidence

Verified 2026-10-28: [Current command chain](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/package.json) · [Package inspector](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/mini-program-package-budget.mjs#L3) · [WeChat headroom condition](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/check-code-quality.mjs#L230) · [Douyin gate](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/check-douyin-quality.mjs) · [Route source analysis](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/api-contract-source.mjs) · [Real UI runbook](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/documents/MINIPROGRAM_REAL_UI_TESTING.md).
