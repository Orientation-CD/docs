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

## Current cross-repository boundaries and audit scope

The [integration map](/reference/integration-status) records actual callers, including the member and owner daily-report screens, the model and resolution selection in video, and the native draft box used by seven ThreeVjia image Features.

This audit covers frontend `7f1a3169338c10bd4139c24318f7a35caf86310c` and backend `f34b8a4d6307c83c6f7bbc905485a4f586d59a99`. All 157 public route declarations, including nine H5 gateway methods, have bilingual explanations, real handlers and source-symbol evidence. Operations overlapping main are removed from the historical frontend candidate scope.

Detail and collection input disclosure differ, current assignee and original submitter differ, and SDK bindings differ from ordinary model connections. When source-contract prose lags, follow the actual handler, caller and tests; a matching DTO name does not prove authority. Source extraction executes neither application nor test code.

`sources/audit-2026-11-14.json` records each bilingual page's disposition and the docs baseline. Source links move through function identity or proven unchanged context; unproven mappings receive manual review. Validation covers the docs, not the application stack, devices, deployment or real paid providers.
