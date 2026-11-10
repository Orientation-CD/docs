# Backend overview

FastAPI owns identity, workspaces, customer Projects, AI Workflows, private Assets and payments. It also serves the authenticated Studio Control website at `/admin`. Public product routes use `/v1`; `/health/live`, `/health/ready`, `/openapi.json` and Swagger `/docs` have separate purposes.

## Products and execution

| Capability | Execution and result |
| --- | --- |
| Standard image design | Role-bound images and prompts produce immutable image Assets |
| Voice and copywriting | Ordered recordings or text/knowledge inputs produce Markdown Documents |
| Reports | Frozen 9-, 13- or 17-page Blueprint produces HTML and supported editable PowerPoint |
| Video | Script or same-style inputs use time/model fee snapshots and local MP4 execution |
| Floor-plan image/panorama | Owned supplier Group, frozen render document and primary image use SDK execution |
| ThreeVjia image design | Seven customer Features share one SDK Workflow and original H5 integration |
| Enterprise collaboration | Current-assignee Projects, assignment history, stages, sales metrics and member daily reports |

A **Feature** is a priced customer capability; a **Workflow** defines its graph; an **Operation** is one node. Ordinary model nodes bind provider/model configuration. ThreeVjia nodes bind versioned SDK configuration and releases through their dedicated administration. A configured connection alone grants neither product access nor supplier acceptance.

## Persistent boundaries

PostgreSQL owns permissions, balances, Job state, frozen execution and recovery evidence. Redis carries queues, rate limits, handoff caches and bounded performance observations. Object storage owns verified bytes at exact versions. API, Submit worker and Poll worker share an image but run as separate processes.

Input preparation commits recoverable storage receipts before final admission; accepted owned inputs become ACTIVE without expiry. Final admission atomically creates execution pins, frozen commercial evidence, reservation and outbox. Enterprise work checks the shared wallet and then the submitting member's monthly cap. Video preview performs no reservation.

Project creator, current assignee and Job submitter are different identities. Read predicates allow bounded owner/assignee access; writes retain action-specific checks. Other authors' inputs are hidden in lists but can be returned in authorized detail. See [projects](/backend/projects), [history](/reference/flows/workflow-history-flow) and [data model](/reference/data-model).

Begin with [local setup](/backend/getting-started), [architecture](/backend/architecture) and [Workflow lifecycle](/backend/workflows). Continue with [floor plans](/backend/floor-plans), [video billing](/reference/flows/video-billing-flow) or [daily reports](/reference/flows/daily-report-flow). The [integration map](/reference/integration-status) distinguishes source support, client callers and deployment acceptance.

Sources: [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/api/__init__.py) · [app/workflows/workflow_admission.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/workflow_admission.py) · [app/workflows/read_access.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/read_access.py) · [app/workflows/workflow_sdk_execution.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/workflow_sdk_execution.py)
