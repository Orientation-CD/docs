# Glossary

A quick reference for the terms used throughout this documentation and the
codebase. If a term is unfamiliar, look it up here first.

## Product & domain terms

| Term | Meaning |
| --- | --- |
| **Design job** (设计任务) | A single asynchronous unit of work that turns input images + prompts into one or more AI-generated renderings. Every feature in the product is implemented as a design job. |
| **Feature** | One of the six product flows: interior design, local renovation, kitchen, bathroom, furniture try-on, design report. |
| **Design report** (方案汇报) | A professional HTML document assembled from a design job plus report assets (cover, mood board, renderings, etc.). Rendered server-side with a strict Content-Security-Policy. |
| **Token** | The internal currency used to pay for design jobs. Each job type has a token cost. Users buy token packages or subscriptions. |
| **Token ledger** | The append-only record of every token credit/debit for a user (initial grant, job reserve, job settle, purchase). |
| **Workspace** | A container for design jobs and members. Every user has a **personal workspace**; they may also belong to **enterprise workspaces**. |
| **Personal workspace** | The private workspace auto-created for every account. |
| **Enterprise workspace** (企业空间) | A shared workspace with an owner and members. The owner manages seats, invitations, members and all plans. |
| **Seat** (席位) | A membership slot in an enterprise workspace. The owner buys/allocates seats for members. |
| **Subscription** | A recurring (currently manually renewed) entitlement that grants monthly token allowances and/or feature access. |
| **Client info** | Optional personal/enterprise branding fields (surname, salutation, project name) attached to a design job and shown in reports. |

## Frontend terms

| Term | Meaning |
| --- | --- |
| **uni-app** | The cross-platform framework (Vue-based) used to build the mini program; compiles to WeChat / other mini-program platforms and H5. |
| **Subpackage** | A WeChat mini-program "sub-package": a separately loaded chunk used to keep the main package small. The project has `pkg-features`, `pkg-plans`, `pkg-account`. |
| **Repository layer** | The frontend's data-access abstraction. Pages only depend on async repositories (Content, Session, Workspace, Task, Plan, Billing, Organization); they never call HTTP directly. |
| **DTO** | Data-transfer object — the typed contract between the frontend and the REST API (`src/api/dto/*`). |
| **Mock mode** | A compile-time frontend mode (`VITE_DATA_SOURCE=mock`) with no backend dependency; everything is simulated in memory. |
| **API mode** | A compile-time frontend mode (`VITE_DATA_SOURCE=api`) that calls the real backend at `/api/v1`. |
| **Logical job id / idempotency** | A client-generated idempotency key that makes retries safe: submitting the same logical job twice produces one job. |
| **Poll scheduler** | The frontend component that polls the backend for design-job status while the user waits. |

## Backend terms

| Term | Meaning |
| --- | --- |
| **FastAPI** | The Python web framework used for the REST API. |
| **ARQ** | A Redis-backed asynchronous job queue used for background work. |
| **Submit worker** | ARQ worker that submits jobs to the AI provider. |
| **Poll worker** | ARQ worker that polls the AI provider until a job completes. |
| **Provider** | An AI image-generation backend (`app/providers/`). The primary one is Seedream; a mock provider is used locally. |
| **Provider job** | The provider-side job created when the backend submits to the AI model; identified by a `provider_job_id`. |
| **SQLAlchemy** | The Python ORM used to access PostgreSQL. |
| **Alembic** | The migration tool that manages the PostgreSQL schema. |
| **Object storage / S3** | The S3-compatible storage for images and report assets. Local: MinIO. Production: Aliyun OSS. |
| **Upload intent** | A short-lived backend-issued permission to upload one asset directly to object storage (`POST /assets/upload-intents`). |
| **Presigned URL** | A time-limited URL that lets the client (or a provider) upload/download an object directly. |
| **OpenID / phone code** | WeChat identity primitives: `openid` identifies the user; a `phone_code` proves the phone number. |
| **Token pair** | The access token (short-lived, ~15 min) + refresh token (long-lived, ~30 days) issued by the backend. |
| **JWT** | JSON Web Token — the format of access/refresh tokens. |
| **JSAPI Pay** | The WeChat Pay method used by mini programs to initiate a payment. |
| **Payment notify** | The WeChat Pay server-to-server webhook that confirms a payment. |
| **Report view token** | A short-lived bearer token that authorizes viewing one completed report. |

## Deployment terms

| Term | Meaning |
| --- | --- |
| **Local stack** | The Docker Compose topology (`create_stack.sh`) for local development and testing. |
| **SAE** | **Serverless App Engine** — Alibaba Cloud's platform where the backend runs in production. |
| **ACR** | **Alibaba Container Registry** — where backend images are published. |
| **Immutable image** | One image per Git commit, tagged `<full-git-sha>`, resolved to a registry digest before deployment. |
| **Migration Job** | A SAE Job that runs `alembic upgrade head` and verifies the schema before apps roll out. |
| **Cloud test** | The SAE environment used for integration testing with mock WeChat/payment/image services. |
| **Production** | The live SAE environment with real WeChat login, real WeChat Pay, real OSS and the real AI provider. |
| **GitHub Pages** | Where this documentation site is published automatically. |

## Domain (feature) terms

| Term | Meaning |
| --- | --- |
| **Masked image** | A user-drawn mask over the input photo (e.g. marking the area to change) used by furniture try-on and some features. |
| **Reference image** | An optional second image (e.g. a furniture or style reference) used by some job types. |
| **Prompt template** | A server-side template that turns the user's selections into the final prompt sent to the AI provider. |
| **Report item** | One section of a design report (project cover, core strengths, renderings, mood board, etc.), configured on the server. |
| **Global report config** | The server-wide report item list and HTML template used to render reports. |
