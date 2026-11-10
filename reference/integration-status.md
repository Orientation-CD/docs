# What this frontend/backend pair implements

This page describes the [audited source pair](/reference/source-revisions), not deployment acceptance. Frontend `ui-integration@88c75c1f` and backend `main@749e82df` now both contain professional floor-plan integration. Effective configuration, platform domains, supplier credentials and entitlement determine whether an environment can execute it.

## Capability map

| Domain | Actual client boundary | Backend implementation | Follow the chain |
| --- | --- | --- | --- |
| Images, voice, text and reports | Forms, repositories, polling and result viewers | Admission, persistent graph, workers, publication and accounting | [System walkthrough](/reference/system-walkthrough) |
| Video | Script and managed/uploaded same-style modes; model and fee confirmation | Canonical preview, frozen time/model billing and local execution | [Video billing](/reference/flows/video-billing-flow) |
| Professional floor plans | Native entry/Works management and original H5 editor; image/panorama results | Context, gateway, local Work ownership, SDK execution and whole-Work movement/deletion recovery | [Floor-plan chain](/reference/flows/floor-plan-flow) |
| ThreeVjia image design | Native creation handoff into original H5 | Seven distinct Features sharing the `three_vjia_image` Workflow and versioned SDK bindings | [Image chain](/reference/flows/three-vjia-image-flow) |
| Inspiration/shopping | Native discovery entry requests a prepared H5 URL | Scoped context/entry and gateway reads to pinned service origins | [Floor plans](/backend/floor-plans) |
| Enterprise collaboration | Member overview, quota editing/self-read, member read-only detail, assignment and stage controls | Current-assignee authorization, immutable submitter history, stage evidence and sales metrics | [Projects](/frontend/projects), [quota](/reference/flows/member-quota-flow) |
| Enterprise daily reports | **No caller in this frontend revision** | Nine member/owner routes for status, history, save, read and comments | [Daily reports](/reference/flows/daily-report-flow); API support does not imply a mini-program screen |
| Diagnostics | Bounded/redacted client exports and authenticated Studio Control | Runtime/build evidence, safe stage diagnostics, Redis history and recovery | [Runtime debugging](/reference/flows/runtime-debugging) |

The colored-floor-plan image Feature and professional Group/Work/editor system are separate products. Supplier Group IDs are opaque strings, not platform UUIDs. A public Workflow ID is a Job ID; a local Work, SDK configuration, release and provider attempt have distinct identities.

## Four kinds of verification

1. **Frontend Mock** can display results without FastAPI, SQL or workers.
2. **Committed contract fixtures** prove client/schema consistency at recorded revisions. Older candidate fragments remain historical evidence; operations now implemented on main belong in the main API inventory.
3. **A local real-API loop** reaches the database, queues and storage but can use simulated identity, payments or suppliers.
4. **Deployment/provider acceptance** checks specific images, settings, platform web-view behavior, credentials and real external services.

This update audits implementation and validates the documentation site. It does not run the application stack or establish device, deployment or paid-supplier acceptance.

## Current UI routes and new integrations

Existing standard-image/voice/video wrappers still use supported `/v1/design-jobs` adapters; copywriting, reports and H5 SDK submissions also use canonical `/v1/workflows`. Follow the actual caller. New API clients should use Workflows. An uncertain action retains its endpoint, normalized body and action key; see [compatibility](/reference/compatibility).

Collections hide other authors' private inputs; an authorized by-ID detail can return typed inputs to the current enterprise owner or current assignee. This grants no mutation. Writes still require action-specific author/responsibility checks and current server permissions; see [history](/reference/flows/workflow-history-flow).

Sources: [src/services/useFeatureLauncher.ts](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/src/services/useFeatureLauncher.ts) · [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/api/__init__.py) · [app/workflows/read_access.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/read_access.py) · [app/workspaces/daily_report_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/daily_report_api.py)
