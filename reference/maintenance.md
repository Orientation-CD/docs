# Maintain these docs

Update both languages against the same application commits. Use the [source version record](/reference/source-revisions) to establish what was last audited before changing content.

## Run the site

Use Node.js 22.6 or newer and this repository's pinned **pnpm 10.28.2**. The mini program has its own pnpm version; run commands from the intended repository.

```bash
cd docs
corepack enable
pnpm install --frozen-lockfile
pnpm docs:dev
```

Open the URL printed by VitePress. Preview the production output with:

```bash
pnpm docs:build
pnpm docs:preview
```

The output is `.vitepress/dist`, served under `/docs/`. Both the base path and clean deep links must work; do not prepend `/docs/` manually to theme asset paths or authored internal content links.

## Update the source snapshot

Obtain access to the application repositories and fetch the requested branches first. This changes local remote references, not the working checkout:

```bash
git -C ../wechat_mini_program fetch origin ui-integration
git -C ../YuanZhu-AI fetch origin main
```

Inspect the new commits and compare with the previous audit. Update `verifiedAt` in `sources/revisions.json` only when you have actually reviewed the change. Then extract source facts at explicit refs:

```bash
pnpm docs:sources --frontend ../wechat_mini_program --backend ../YuanZhu-AI --frontend-ref origin/ui-integration --backend-ref origin/main
```

This maintenance command requires Python 3.12+, Git and Node. If `python3` is older, prefix it with `DOCS_PYTHON=python3.12`. It reads committed source only; uncommitted application changes are intentionally not used. The application directories may be elsewhere: supply their paths. No application runtime dependencies or private-repository credentials are needed by ordinary docs CI.

Review the resulting full commit SHAs, authority hashes, API declarations, actual Settings defaults, example values and script changes. Update prose and pinned source links in both languages. Backend authorization, runtime status codes and business semantics still need human review against route implementations and the REST contract; syntax extraction cannot establish those guarantees.

Run `pnpm docs:test:sources` to check the syntax-only extractor with Python 3.12+. Its fixtures verify that application top-level code is never executed and secret values are redacted.

Check that the exact audited source objects reproduce the committed facts:

```bash
pnpm docs:sources --frontend ../wechat_mini_program --backend ../YuanZhu-AI --check
```

The check defaults to the commits in the version record. Comparing with a newer upstream ref is an explicit maintainer action; there is no automatic background synchronization.

## Add or reorganize a page

1. Add the English Markdown page and the same relative path below `zh/`. Translate explanations fully; keep endpoint names and code identifiers unchanged.
2. Register the topic once in `.vitepress/navigation.mjs` with English/Chinese labels. It generates locale-correct nav and sidebars.
3. Use `/backend/workflows` in English and `/zh/backend/workflows` in Chinese. Relative links are also supported. Match each language's actual heading anchor.
4. Add relevant GitHub source links with the audited full commit SHA. Source paths are checked against the snapshot.
5. When replacing an old page, retain a short migration page at its old path with `search: false`. Record the disposition in `sources/page-migration.json`; add new pages there with `action: add`.

The repository contains `get-started/`, `frontend/`, `backend/`, `admin/`, `deploy/`, `testing/`, `reference/` and mirrored `zh/` pages. Generated include snippets live under `.vitepress/generated/`; change the extractor rather than editing them manually.

## Maintain an endpoint's learning chain

When a public route changes, update its entry in `sources/traces/*.json` and the matching explicit `{#anchor}` in both languages. Each entry names the real UI/external trigger, actual FastAPI handler and relevant frontend/backend symbols. Explain the concrete service/transaction/queue/storage path, returned state and failure recovery; a link to the REST contract alone is insufficient. Keep numbered diagram messages aligned with the code navigation table.

`pnpm docs:sources` resolves route handlers and Python definitions with AST parsing, locates referenced frontend bindings without executing code, and stores symbol locations/file hashes in `sources/contracts.json`. It also generates each API's full-chain link. `docs:check` rejects any public route without a bilingual explanation, a missing anchor, unverified symbol or unmapped handler. These facts prove consistency with the pinned audited revision; they do not automatically prove business semantics. A reviewer still follows the actual call chain.

## Validate before review

```bash
pnpm docs:check
pnpm exec playwright install chromium
pnpm docs:test:browser
```

The first command runs tokenizer/formatting/coverage tests, content/source-reference and full-chain checks, a production build, and checks of rendered links, fragments, assets, locale boundaries and emitted search indexes. The browser suite starts a docs preview on `127.0.0.1:4173`; this port is for documentation only and is unrelated to a backend test session. Stop a preview you own before running the suite; do not stop another person's process to free the port.

Browser checks cover both languages, search results, keyboard interaction, deep-link reloads, mobile navigation and theme changes. It also parses every actual Mermaid fence with the installed browser renderer and checks the new endpoint index-to-chapter navigation. Failure screenshots/traces are local ignored artifacts and are uploaded on CI failure. External links are not availability-gated on every PR, so transient network failures do not block documentation builds.

## Search behavior

Search covers the current language's indexed content. It uses deterministic Chinese character/bigram tokens plus Latin identifiers and components, shared by build and browser. This supports technical keywords such as `PROJECT_OUTCOMES_ENABLED` and `/v1/workflows` without an external search account. It is keyword search: punctuation breaks tokens, and `*` is not arbitrary glob syntax.

The pinned Mermaid plugin has a small lifecycle patch: detailed search temporarily mounts page components to extract snippets, so asynchronous diagram initialization must stop after unmount. Retain the patch and its browser regression test when upgrading the plugin.

Keep the tokenizer self-contained: VitePress serializes functions with `toString()` and restores them in the browser. Captured imports, closures or runtime-dependent segmentation can create build/browser mismatches. Migration pages use `search: false` to avoid old guidance competing with current results.

## Publish

Pull requests run checks and browser tests. Pushes to `main` and manual runs on `main` can publish the checked artifact to GitHub Pages. Deployment is restricted to `main`; review and merge remain team actions. Full Git history is checked out so page timestamps reflect their own commits.

The per-page timestamp is a prose timestamp; the source record is the application's audit timestamp. Keep those meanings separate when reporting freshness.
