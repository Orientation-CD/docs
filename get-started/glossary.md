# Glossary

## Start here

| Term | Meaning in this project |
| --- | --- |
| Repository / branch | A versioned source folder / a named line of work. Frontend uses `ui-integration`; backend uses `main`. |
| Terminal / command | The macOS text application / an instruction entered into it and run with Return. |
| Current directory | The folder a terminal command runs in. `pwd` shows it; `cd` changes it. |
| Dependency | A library or tool installed for a project. `pnpm install` downloads frontend dependencies. |
| Build / output | Compilation of source into a mini program; generated files under `dist/` are imported into platform DevTools. |
| Environment variable | A named setting. Frontend `VITE_*` settings are fixed when compiling; rebuilding is needed to change them. |
| Port / origin | A service's numbered local endpoint / scheme, hostname and port together, such as `http://127.0.0.1:8080`. |
| Mock / API mode | A simulated frontend data source / frontend requests to a real backend. API mode can still use backend provider mocks. |

## Product and permissions

| Term | Meaning |
| --- | --- |
| Feature | An executable product capability discovered through `/v1/billing/features`; the server controls availability and Token price. |
| Workflow | A canonical generation request and configured execution graph. A request can run multiple Operations. |
| Operation / Provider | An execution step / the configured implementation or supplier used by that step. |
| Design job | The asynchronous task visible to users; older design-job routes coexist with canonical Workflow routes. |
| Result kind | The declared output category, including image, Markdown, video, HTML report and presentation output. |
| Workspace | Personal or enterprise context that determines membership and the balance/permissions used for work. |
| Owner / member | The two enterprise roles. Owners manage enterprise settings, invitations and membership. |
| Project | A workspace-scoped container for a user's plans and customer details. A temporary project is the fallback entry. |
| Current / default project | The currently selected project / the persisted preferred project. Neither is a project lifecycle status. |
| Stage / outcome | Progress such as collected requirements / a separate result such as won or lost, when the server enables it. |
| Subscription | Purchased access and allowances. Renewal is manual; the current UI does not offer early renewal of an active subscription. |
| Token / ledger | Generation balance / its durable history of grants, purchase, reservation, consumption, release and adjustments. |
| Seat | Enterprise membership capacity, including the owner. Invitations do not reserve a seat. |

## Requests and files

| Term | Meaning |
| --- | --- |
| REST API / DTO | HTTP interface / TypeScript representation of a request or response. Repositories also validate actual JSON. |
| Access / refresh token | Short-lived request credential / credential used to rotate the session. Treat both as secrets. |
| Idempotency key | Identifies one logical submission or purchase so an uncertain retry can reuse the same action. |
| Polling | Reading status repeatedly using server timing; leaving a page pauses its poller. |
| Asset | Server-managed metadata and identity for a stored file. An arbitrary file URL is not an Asset ID. |
| Upload intent / completion | Temporary permission to upload one file / server verification that its bytes and metadata are ready. |
| Signed URL | Temporary file access; refresh through the authorized API when it expires. |
| Blueprint | Structured project, pages and source Assets used by the new design-report Workflow. |
| Historical HTML report | The earlier `html_report` product; distinct from current `design_report_9/13/17` Workflows. |
| JSAPI / Douyin payment bridge | Platform-specific native payment invocation. Server settlement confirms the order independently. |

## Backend and deployment

| Term | Meaning |
| --- | --- |
| FastAPI | Python HTTP application serving product APIs and Admin. |
| PostgreSQL / Alembic | Durable relational database / reviewed schema migrations. |
| Redis / ARQ | Coordination and queue storage / background-worker framework. |
| MinIO / OSS | Local S3-compatible object storage / Alibaba Cloud object storage. |
| Docker image / container / volume | Built application package / a running instance / retained data storage. Rebuilding an image does not migrate or erase data by itself. |
| Compose project | Named local stack and its associated resources. Separate developers use separate owned ports/projects. |
| SAE | Alibaba Cloud application runtime used by the backend deployment. |
| Configuration snapshot | Validated legal/product/template configuration imported into a fresh local environment; it excludes supplier credentials. |

Use [FAQ](/get-started/faq) for symptoms, [macOS setup](/get-started/macos-setup) for basic commands, and [API reference](/reference/rest-api) for contracts.

## Source evidence

Documented against frontend `eca0a5f` and backend `b13cc56` (2026-10-20). [Frontend feature groups](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/featureGroups.ts) · [Workflow request types](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py).
