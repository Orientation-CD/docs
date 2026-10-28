# Verified source versions

This site describes specific audited versions of the application repositories. A page's Git update timestamp tells you when its prose changed; it does **not** prove that upstream code has not changed since the audit.

<!--@include: ../.vitepress/generated/revisions.en.md-->

## Sources of truth

| Concern | First source to inspect |
| --- | --- |
| Public transport and request models | Backend `app/api/__init__.py`, domain routers and `app/core/models.py`, cross-checked with `documents/REST_API_INTERFACE.md` |
| Workflow execution and model binding | Backend `app/workflows/`, `app/providers/`, persistence models and relevant tests |
| Environment defaults | Backend `app/core/config.py`; distinguish `.env.example` values from code defaults |
| Mini-program behavior and limits | Frontend feature services, repositories, DTOs, `package.json`, `config/build-targets.mjs` and tests |
| Database and releases | Backend migration files, deployment architecture and SAE runbook |
| Documentation behavior | This repository's VitePress configuration, checks and browser tests |

Implementation and public contracts must be read together. A frontend limit can be narrower than the backend's accepted shape, and an accepted API shape does not establish every supplier's end-to-end capabilities. A feature present in code may still be disabled by configuration, pricing or entitlement rules.

## What is recorded

The docs repository commits `sources/revisions.json` (repository, branch, full commit and authority-file SHA-256 hashes), `sources/contracts.json` (route declarations, configuration facts, frontend scripts and source paths), and `sources/page-migration.json` (the disposition of every original page). These are reviewable files in the repository, excluded from published content routes.

Generated tables in [REST API](/reference/rest-api) and [Configuration](/reference/configuration) consume those snapshots. Every content page links to relevant application sources at the verified commit. Both languages describe the same source versions.

## What validation guarantees

Normal CI validates content against the **committed audited snapshot**, without access to private application repositories. It checks references, bilingual routes, assets, search and rendered behavior. It cannot independently establish upstream freshness or prove the provenance of an edited snapshot.

A maintainer with source access runs the source comparison when updating documentation. The tool reads Git objects and parses Python syntax; it does not import the application, load `.env`, start services or call suppliers. See [Maintenance](/reference/maintenance) for the update commands and review process.

## Cross-repository and source-document differences

The [integration map](/reference/integration-status) records frontend floor-plan code whose dedicated backend is absent from this main. It also distinguishes quota APIs with no mini-program editor and theme infrastructure with a hidden settings entry. Snapshot coverage is therefore broader than a claim that every screen works end to end.

The backend's current detail handler and Get Workflow Status contract permit owner read-only detail, although a result-file paragraph still contains an older creator-only sentence. These docs follow the actual shared loader and current detail contract, explicitly separating read and write permission. Likewise, saving an empty same-style template is possible in the admin form while runtime script validation rejects it; saving is not admission acceptance. Follow the pinned [implementation](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/api.py) and [runtime video rules](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/video_template_rules.py).

`sources/audit-2026-10-28.json` records every bilingual page's review disposition against the previous docs baseline. Source links are rebased through function identity or proven text context, with uncertain mappings reviewed manually. See [maintenance](/reference/maintenance).
