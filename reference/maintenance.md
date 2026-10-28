# Maintain these docs

Update both languages against the same application commits. Use the [source version record](/reference/source-revisions) to establish what was last audited before changing content.

## Use the documentation update skill

The repository maintains the `update-yuanzhu-docs` skill in `.agents/skills/update-yuanzhu-docs/`, with a short entry point in the root `AGENTS.md`. These files are versioned for the team and excluded from the published site. In a Codex conversation opened inside this repository, requests such as “更新 docs” or “同步文档” can select the skill implicitly. Use `$update-yuanzhu-docs` to select it explicitly.

To make the same skill available when starting a conversation in the parent directory containing all three repositories, run this once **from the docs repository root**. It creates a user-level link to the repository's single maintained copy:

```bash
yuanzhu_skill_source="$(pwd -P)/.agents/skills/update-yuanzhu-docs"
yuanzhu_skill_entry="$HOME/.agents/skills/update-yuanzhu-docs"
if [ ! -f "$yuanzhu_skill_source/SKILL.md" ]; then
  printf '%s\n' 'Run this from the docs repository root after obtaining the skill.'
elif [ -e "$yuanzhu_skill_entry" ] || [ -L "$yuanzhu_skill_entry" ]; then
  printf '%s\n' 'The entry already exists. Inspect it with the following command before deciding whether to replace it:'
  ls -ld "$yuanzhu_skill_entry"
else
  mkdir -p "$HOME/.agents/skills"
  ln -s "$yuanzhu_skill_source" "$yuanzhu_skill_entry"
fi
```

Existing files, directories and links are left untouched. Keep the checkout at the linked location; if you move it, inspect and update the link. If Codex does not show the new skill, restart it. The request must concern this YuanZhu AI project; the skill is not a general replacement for other projects' documentation workflows. Source synchronization requires access to the docs, frontend and backend repositories.

By default, the skill audits the latest frontend `ui-integration` and backend `main`, records full commit SHAs, and updates both languages with source-guided call chains and diagrams. It reuses the maintenance and validation commands below and delivers the reviewed changes, validation results, preview and a pull request. Merge and publication follow an explicit user instruction.

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

## Reading diagrams on different screens

Documentation pages use the available window width. Ordinary paragraphs keep a comfortable line length; diagrams, tables and code can use the wider content area. On narrower desktops the section outline moves into the top **On this page** menu.

Diagrams initially fit the content width on desktop and keep their original size on phones and tablets. Use **Fit width** for an overview, **Actual size** for the original text size, or the zoom buttons for details. **Full screen** opens a larger viewer with the same controls; tall diagrams scroll vertically. Press Escape or **Close** to return to the page. A focused diagram also supports horizontal scrolling with the arrow keys.

When changing the theme, keep these behaviors covered by the responsive layout and diagram browser tests. Check a narrow phone, laptop and wide desktop; widening the page must not introduce page-level horizontal scrolling or shrink mobile diagram text by default.

## Publish

Pull requests run checks and browser tests. Pushes to `main` and manual runs on `main` can publish the checked artifact to GitHub Pages. Deployment is restricted to `main`; review and merge remain team actions. Full Git history is checked out so page timestamps reflect their own commits.

The per-page timestamp is a prose timestamp; the source record is the application's audit timestamp. Keep those meanings separate when reporting freshness.

## Re-audit a refactor as a coherent version

Save the old version record **before** extracting the new snapshot:

```bash
git show HEAD:sources/revisions.json > /tmp/yuanzhu-docs-previous-revisions.json
```

Audit the requested frontend/backend branches as one explicit pair. Read implementation, public contract and tests together; neither a matching symbol name nor a frontend fixture proves the current behavior. Rebuild a heavily changed chapter around the final architecture, preserving historical heading anchors where an API index links to them. Update both languages, the capability matrix and page audit inventory in the same change.

After updating source snapshots, rebase old source links with evidence rather than replacing SHA text blindly:

```bash
pnpm docs:links --from /tmp/yuanzhu-docs-previous-revisions.json --report /tmp/yuanzhu-docs-links.json
pnpm docs:links --from /tmp/yuanzhu-docs-previous-revisions.json --report /tmp/yuanzhu-docs-links.json --write
```

The first command is read-only. The second updates only proven revision/path/line mappings, including visible path:line labels. Uncertain anchors remain unchanged, appear in the report and produce a nonzero exit; inspect their old/new code and choose the correct symbol manually. Run after all document writers stop; the tool refuses a concurrent overwrite.

Normal CI validates committed source line bounds and trace-linked symbol anchors. It also restricts `apiScope: frontend-candidate` to the bilingual floor-plan guide: only method/path pairs extracted from pinned frontend fixtures are allowed there, while the main API inventory stays the actual backend routes. A candidate schema must never silently enlarge the claimed main implementation.

Keep obsolete setup instructions out of the learning path. Actual still-exposed adapters remain explicitly scoped in [compatibility](/reference/compatibility); removed pages keep only short non-searchable migration links. This cleans guidance without concealing code that the current UI still uses.
