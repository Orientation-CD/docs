# Backend overview

YuanZhu runs a FastAPI service for identity, workspaces, private customer Projects, AI Workflows and payments. The same service serves the Studio Control administration website at `/admin`.

The public API uses `/v1`; health probes use `/health/live` and `/health/ready`. The running service exposes Swagger UI at `/docs` and its schema at `/openapi.json`. Read [REST API](/reference/rest-api) for contracts and compatibility routes.

## What the system delivers

| Capability | Execution and result |
| --- | --- |
| Image design | Role-bound images and selected prompts → immutable image Assets |
| Requirements collection | 1–3 recordings → Markdown summary Document |
| AI copywriting | Eight text Features → Markdown, with optional private knowledge documents |
| Design reports | 9-, 13- or 17-page Blueprint → HTML preview and editable PowerPoint |
| Video generation | Script, character and optional references/recording → MP4 |

A **Feature** is a priced customer product. It points at a code-defined **Workflow**, whose nodes run **Operations**. Administrators select execution models on individual Workflow nodes. Active Features and subscription grants determine customer access; a provider connection alone does not open a product.

## Durable boundaries

PostgreSQL owns accounts, permissions, balances, task state and execution receipts. Redis carries ARQ queues, rate limits, sessions and bounded performance data. Private object storage holds verified inputs, results and exact versions. API and workers share one application image.

Every submission specifies a workspace. Personal work spends the personal wallet; enterprise work spends that enterprise's wallet. Project management is creator-private even inside an enterprise; owner-only enterprise overview has an explicit separate disclosure contract.

Start with [local setup](/backend/getting-started), then [architecture](/backend/architecture) and [Workflow lifecycle](/backend/workflows). Product-specific guides cover [reports](/backend/reports), [voice](/backend/voice), [copywriting](/backend/copywriting) and [video](/backend/video).

---

Source evidence · backend `b13cc566`: [app/main.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/main.py) · [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/api/__init__.py) · [app/workflows/workflow_configuration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/workflow_configuration.py).
