# CI/CD and Documentation Validation

The backend, mini program and documentation have different checks and publishing boundaries. A passing docs build is evidence about this site; it is not a backend deployment or a payment/provider acceptance test.

## Documentation checks

Run from this documentation repository:

```bash
pnpm install --frozen-lockfile
pnpm docs:check
pnpm docs:test:browser
pnpm docs:sources --frontend /path/to/wechat_mini_program --backend /path/to/YuanZhu-AI --check
```

`docs:check` builds the production site and validates the applicable static documentation contracts, including links, fragments, local assets and locale structure. Browser checks use the built site to exercise search, locale navigation, deep links and runtime rendering. The source check reads the pinned Git revisions and compares source-derived inventories; it does not launch a server, access a database or run provider calls.

Update source metadata and generated inventories deliberately when changing the documented baseline; a different HEAD or uncommitted code is not silently accepted as the recorded revision. See [maintenance](/reference/maintenance) and [source revisions](/reference/source-revisions).

## Pages publication

VitePress builds `.vitepress/dist`; GitHub Pages serves it under `/docs/`. PR checks validate changes before merge, while authorized pushes to `main` publish the built artifact through GitHub Pages. Deployment needs Pages/token permissions; validation jobs should remain read-only. Keep deployment restricted to the publishing branch rather than deploying PR content.

Root-relative documentation links include their locale: English `/frontend/overview`, Chinese `/zh/frontend/overview`. VitePress adds `/docs/` at render time. Theme asset paths omit that base (`/favicon.svg`). Clean deep links are supported by the current GitHub Pages host; validate a direct reload as well as client navigation.

## Backend workflows

The snapshot has `daily-endurance.yml` and `sdd-docs.yml`. Daily endurance is a scheduled/repository-dispatch runtime gate with revision selection, not a blanket test of every docs PR. SDD documentation validation checks the installed process documents/tooling and retains evidence. SAE artifact publication and protected promotion live in `deploy/sae/`; do not infer automatic production delivery from a backend merge.

The backend's normative test policy explicitly exempts documentation-only changes from unit/full-regression/smoke/E2E gates. Validate rendered text, commands, links, diagrams and references instead. Production-code changes follow that repository's focused coverage, retained review, full regression and deployed-baseline upgrade procedure. Mixed changes follow the production-change requirements.

## Frontend checks and release

Use the selected `ui-integration` snapshot's package scripts for type, design-system and build checks; mode-specific builds can select API/mock services and platform targets. A successful WeChat build does not prove Douyin payment acceptance, physical-device networking or supplier video compatibility. Keep the client artifact's API environment and public-domain configuration aligned with the release boundary.

## Contributor rules

- Preserve existing public routes or supply explicit redirects when reorganizing pages.
- Update both languages and their navigation together; identifiers and API paths stay exact.
- Link factual behavior to pinned code/contract evidence; separate defaults, example values and actual cloud state.
- Keep secrets, private test evidence, local dependencies and generated distribution output out of Git.
- Run the smallest appropriate docs checks after a documentation correction; do not start product stacks merely to check prose.

## New validation boundaries

Frontend `pnpm test` now includes `test:package-budget`; WeChat quality gates include artifact/Babel checks. Package budgets are project policy, not a quoted platform maximum. The candidate floor-plan fixture gate proves its recorded source contract, not compatibility with backend main.

For an authorized backend deployed-baseline upgrade, `run_deployed_upgrade_gate.sh` preserves one ownership-verified disposable database through migration and selected MinIO/OSS gates. After that stack's product configuration was prepared, pass `--preconfigured` to affected smoke/E2E runners to avoid replacing it with an older cloud snapshot. This is distinct from docs validation. See [test/storage policy](/testing/storage-environments) and the [source runbook](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/runbook.md).

A video image rebuild fetches private upstream default-branch code. Record the actual supplier commit and image digest even when the backend commit is unchanged; do not describe every rebuild as supplier-reproducible from the backend SHA alone.

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions). Runtime values and cloud activation must be checked separately.

- [Backend documentation workflow](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/.github/workflows/sdd-docs.yml)
- [Daily runtime workflow](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/.github/workflows/daily-endurance.yml)
- [Normative test policy](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/tests/documents/TEST_STRATEGY.md)
- [Frontend scripts](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/package.json)
