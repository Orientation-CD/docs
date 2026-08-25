# Introduction

Welcome to the **YuanZhu AI** documentation. This guide assumes **zero prior
knowledge** — of the product, of the codebase, and of WeChat mini-program
development. By the end of this section you will understand what the project
is, how it is put together, and how to run it on your own machine.

## What is YuanZhu AI?

YuanZhu AI (装易装AI) is a **WeChat mini program** that applies **generative AI
image models** to real-world interior design. A user photographs a room, and the
system:

1. Accepts the photo (plus optional mask / reference images),
2. Schedules an asynchronous **design job**,
3. Calls an **AI image provider** (a large image-generation model) to produce
   renderings,
4. Assembles the results into a **professional HTML design report** that the
   user can view and share.

The product is aimed at home owners, decorators and renovation teams. It is
monetized through a **token + subscription** model (see
[Backend → Billing & Tokens](/backend/billing-tokens)).

## The three repositories

The project lives under the `Orientation-CD` GitHub organization and is split
into three repositories:

### 1. Frontend — `wechat_mini_program`

A **uni-app + Vue 3 + TypeScript + Pinia + uview-plus** project whose primary
target is the **WeChat Mini Program** (it can also compile to H5 and other
mini-program platforms). It is developed on the **`ui-integration`** branch.

Key ideas:

- Everything the UI needs is fetched through an **asynchronous repository
  layer** (Content, Session, Workspace, Task, Plan, Billing, Organization).
- The frontend can run in **Mock mode** (no backend needed) or **API mode**
  (talks to the real backend over `/api/v1`). This is decided at **compile
  time** via environment variables — see
  [Frontend → Data Source Modes](/frontend/data-source-modes).
- Users can explore all features as **guests**; the WeChat registration/login
  gate is enforced at the final submission step.

### 2. Backend — `YuanZhu-AI`

A **Python 3.12 / FastAPI** service that provides the REST API, the async job
pipeline, billing, authentication and reporting. It is developed on the
**`main`** branch.

Key ideas:

- **REST API** (`app/api.py` and friends) — everything under `/api/v1`.
- **Asynchronous job processing** with **ARQ** workers (`app/worker.py`):
  a *submit worker* talks to AI providers, a *poll worker* watches for
  provider completion.
- **PostgreSQL** for durable state (users, workspaces, design jobs, billing,
  reports) via **SQLAlchemy 2.0 + Alembic**.
- **Redis** for the ARQ queue, rate limiting, progress metrics and cache.
- **Object storage** (S3-compatible, MinIO locally, Aliyun OSS in production)
  for uploaded photos, generated renderings and report assets.
- **WeChat integration** for login (`code2session` + phone number) and
  **WeChat Pay** (JSAPI) for token purchases and subscriptions.

### 3. Docs — this repository (`docs`)

A **VitePress** site that is **auto-deployed to GitHub Pages** on every push to
`main`. This is where you are reading now.

## What can a user do?

The mini program exposes six core features plus an account/billing system:

| Feature | What it does |
| --- | --- |
| **Interior design** (室内设计) | Full-room redesign from a photo |
| **Local renovation** (局部改造) | Change a specific area (e.g. a wall or corner) |
| **Kitchen renovation** (厨房改造) | Kitchen-specific design flow |
| **Bathroom renovation** (卫生间改造) | Bathroom-specific design flow |
| **Furniture try-on** (家具试搭) | Place furniture items onto a space image with a canvas mask |
| **Design report** (方案汇报) | Generate a professional HTML report with 15 styles, personal/enterprise fields and optional content sections |

Users also have a **workspace** model: every account gets a **personal
workspace**, and users can join or create **enterprise workspaces** (企业空间)
where an owner manages members, seats, invitations and shared plans.

## Who is this documentation for?

- **New team members** — follow **Get Started**, then **Frontend** and
  **Backend** to learn the system.
- **Engineers touching a specific area** — jump to the matching deep-dive
  section.
- **Anyone who needs to trace a feature end-to-end** — use
  **Reference → End-to-End Call Chains**, which follows the data flow from a
  button tap in the mini program through the backend to the final response.

## Next steps

1. Read [Architecture Overview](/get-started/architecture) for the big picture.
2. Follow [Quick Start](/get-started/quickstart) to run the full stack locally.
3. Browse [Glossary](/get-started/glossary) whenever you meet an unfamiliar term.
