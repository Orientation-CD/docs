# YuanZhu AI documentation

Bilingual technical and operations documentation for the YuanZhu AI WeChat/Douyin mini programs, FastAPI backend and administration console. Includes a macOS onboarding path for first-time contributors.

- [Live English site](https://orientation-cd.github.io/docs/)
- [中文文档](https://orientation-cd.github.io/docs/zh/)
- Frontend: `Orientation-CD/wechat_mini_program`, `ui-integration`
- Backend: `Orientation-CD/YuanZhu-AI`, `main`
- Audited full commits and source hashes: [sources/revisions.json](sources/revisions.json)

## Develop and validate

Use Node.js 22.6+ and pnpm 10.28.2, from this repository:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm docs:dev
```

```bash
pnpm docs:check
pnpm exec playwright install chromium
pnpm docs:test:browser
```

`docs:check` runs Node tests, content/source-reference checks, the production build and rendered-site/search validation. Browser tests start a preview on `127.0.0.1:4173`; do not run another preview on that port concurrently. Failed screenshots and traces are ignored locally and retained by CI.

Build only with `pnpm docs:build`; output is `.vitepress/dist`. Use `pnpm docs:preview` for manual inspection.

## Content and maintenance

English content lives in `get-started/`, `frontend/`, `backend/`, `admin/`, `deploy/`, `testing/` and `reference/`; `zh/` mirrors those routes. Shared bilingual navigation is in `.vitepress/navigation.mjs`. Local full-text search indexes each language, including Chinese and technical identifiers.

See [Maintenance](reference/maintenance.md) / [维护本文档](zh/reference/maintenance.md) for the contribution workflow, snapshot synchronization and publishing. The source updater requires Git, Python 3 and access to local application clones:

```bash
pnpm docs:sources --frontend ../wechat_mini_program --backend ../YuanZhu-AI --check
```

Normal CI compares against committed audited facts and does not need private application access. It cannot prove upstream has not changed; a maintainer must review and synchronize new source commits. [Page migration inventory](sources/page-migration.json) records rewritten, added and retired pages. Retired routes remain as migration pages excluded from search.

PRs run content/build/browser checks. Publishing remains GitHub Pages from `main`, with full Git history for page timestamps. No application deployment is performed by this repository's validation.
