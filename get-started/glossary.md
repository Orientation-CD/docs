# Glossary

A quick reference for the terms used throughout this documentation and the
codebase. If a term is unfamiliar, look it up here first.

## Product & domain terms

| Term | Meaning |
| --- | --- |
| **Design job** (设计任务) | A single asynchronous unit of work that turns input images/audio + prompts into one or more AI-generated outputs (rendering, HTML report or markdown summary). Every feature is implemented as a design job. |
| **Design job type / Catalog** | The backend-catalogued list of job types (`GET /v1/billing/catalog`): key, display name, token cost, required images, result kind. The frontend decides what to show on home from this catalog. |
| **Result kind** | What a design job produces: `IMAGE`, `HTML_REPORT` or `MARKDOWN`. |
| **Feature** | One of the product flows: interior, local, furniture, kitchen, bathroom, colored floor plan, voice summary, report. |
| **Voice summary** (录音需求总结) | A `voice_summary` design job that takes 1–3 audio recordings and returns a markdown requirement summary. |
| **Design report** (方案汇报) | A professional HTML document assembled from a design job plus report assets (cover, mood board, renderings, etc.). Rendered server-side; viewed in a `web-view`. |
| **Token** | The internal currency used to pay for design jobs. Each job type has a token cost. Users buy token packages or subscriptions. |
| **Token ledger** | The append-only record of every token credit/debit (initial grant, job reserve, consume, release, purchase, subscription purchase/expiration, referral reward, adjustment). |
| **Token precheck / preflight** | A client-side balance check before a feature opens or a job submits (`personalCatalogTokenShortage`, `assertPersonalTokenBalance`). Admission is still atomic server-side. |
| **Workspace** | A container for design jobs and members. Every user has a **personal workspace**; they may also belong to **enterprise workspaces**. |
| **Personal workspace** | The private workspace auto-created for every account. |
| **Enterprise** (企业空间) | A shared workspace with an owner and members. The owner manages seats, invitations, members and all plans. |
| **Seat** (席位) | A membership slot in an enterprise workspace. |
| **Subscription** | An entitlement granting token allowances and/or feature access; in this version it is a single purchase with **manual renewal** (no auto-charge). |
| **Client info** | Optional natural-wood branding fields attached to a job: `last_name`, `salutation` (先生/女士), `project_name`. |
| **Share invitation** | An owner-issued token that lets another user join the enterprise workspace. |
| **Referral invitation / Reward** | A referrer-attribution token; rewards (e.g. first-purchase token bonuses) are claimed from the Rewards page. |

## Frontend terms

| Term | Meaning |
| --- | --- |
| **uni-app** | The cross-platform framework (Vue-based) used to build the mini program; compiles to WeChat / other mini-program platforms and H5. |
| **Subpackage** | A WeChat mini-program chunk loaded on demand. This project has `pkg-features`, `pkg-plans`, `pkg-account`. |
| **Main package** | The always-loaded chunk: splash, home, contact, plans, profile and the tab bar. |
| **Repository layer** | The frontend's data-access abstraction. Pages only depend on async repositories; they never call HTTP directly. |
| **DTO** | Data-transfer object — the typed contract between the frontend and the REST API (`src/api/dto/*`). |
| **Normalizer** | A function that validates raw JSON (`unknown`) into a typed domain object, throwing `*RESPONSE_INVALID` on drift (e.g. `mapDesignJobResponseMedia`). |
| **Mock mode** | A compile-time frontend mode (`VITE_DATA_SOURCE=mock`) with no backend dependency; everything is simulated in memory. |
| **API mode** | A compile-time frontend mode (`VITE_DATA_SOURCE=api`) that calls the real backend at `/api/v1`. |
| **Runtime alias** | A Vite `resolve.alias` that swaps an abstract module name (e.g. `WechatCodeRuntime`) for a mock or live implementation at build time. |
| **Logical job id / idempotency key** | A client-generated key derived from `{ scope, ownerId, actionId }` that makes retries safe: submitting the same logical action twice produces one job. Sent as the `Idempotency-Key` header. |
| **Poll scheduler** | The frontend helper that polls the backend for design-job status, honouring `poll_after_seconds` / `Retry-After` and pausing when the page is hidden. |
| **Recorder manager** | `uni.getRecorderManager()`; the voice page records MP3/16 kHz/mono/48 kbps up to 10 minutes per take. |
| **Resumable playback** | The markdown summary page remembers each recording's play position per asset and resumes via `InnerAudioContext.startTime`. |
| **Token pair** | Access + refresh token pair persisted under `yuanzhu.session.tokens.v1`. |

## Backend terms

| Term | Meaning |
| --- | --- |
| **FastAPI** | The Python web framework used for the REST API. |
| **ARQ** | A Redis-backed asynchronous job queue used for background work. |
| **Submit worker** | ARQ worker that submits jobs to the AI/speech provider. |
| **Poll worker** | ARQ worker that polls the provider until a job completes. |
| **Provider** | An AI/speech backend (`app/providers/`). The primary image provider is Seedream; a mock provider is used locally. |
| **Provider job** | The provider-side job identified by `provider_job_id`. |
| **SQLAlchemy / Alembic** | The Python ORM and its migration tool for PostgreSQL. |
| **Object storage / S3** | S3-compatible storage for images, audio and report assets. Local: MinIO. Production: Aliyun OSS. |
| **Upload intent** | A short-lived backend-issued permission to upload one asset directly to object storage (`POST /v1/assets/upload-intents`). |
| **Asset completion** | The backend confirmation that an upload finished (`POST /v1/assets/{id}/complete`), returning sha256, etag and dimensions. |
| **Presigned URL** | A time-limited URL that lets the client upload/download an object directly. |
| **OpenID / phone code** | WeChat identity primitives: `openid` identifies the user; a `phone_code` proves the phone number. |
| **JWT** | JSON Web Token — the format of access/refresh tokens. |
| **JSAPI Pay** | The WeChat Pay method used by mini programs to initiate a payment (`uni.requestPayment`). |
| **Payment notify** | The WeChat Pay server-to-server webhook that confirms a payment. |

## Deployment terms

| Term | Meaning |
| --- | --- |
| **Local stack** | The Docker Compose topology (`create_stack.sh`) for local development. |
| **SAE** | Alibaba Cloud **Serverless App Engine** where the backend runs in production. |
| **ACR** | Alibaba Container Registry where backend images are published. |
| **Immutable image** | One image per Git commit, tagged by the full SHA, resolved to a registry digest before deployment. |
| **Migration Job** | A SAE Job that runs `alembic upgrade head` before apps roll out. |
| **GitHub Pages** | Where this documentation site is published automatically. |

## Domain (feature) terms

| Term | Meaning |
| --- | --- |
| **Masked image** | A user-drawn mask over the input photo used by furniture try-on. |
| **Reference image** | An optional second image (e.g. a furniture or style reference) used by some job types. |
| **Prompt template / Prompt selection** | A server-side template that turns the user's selections into the final prompt sent to the provider. |
| **Report item** | One section of a design report (project cover, renderings, mood board, etc.), configured on the server. |
