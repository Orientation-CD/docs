# Architecture Overview

This page gives you the **big picture** of how the whole system is wired
together. It is intentionally high-level; every component is covered in depth in
the Frontend, Backend, Deploy and Reference sections.

## The system at a glance

```
        ┌─────────────────────────────────────────────────────────────────┐
        │                        WeChat (Tencent)                          │
        │   identity (code2session / phone)        WeChat Pay (JSAPI)      │
        └───────▲─────────────────────────────────────▲───────────────────┘
                │                                     │
                │ wx.login / phone auth / pay         │ payment notify
                │                                     │
        ┌───────┴──────────────┐            ┌─────────┴──────────────┐
        │    Mini Program      │            │    Backend (SAE)       │
        │  (uni-app + Vue 3)   │  HTTPS     │   FastAPI (API)        │
        │  WeChat DevTools/App │───────────►│   /api/v1/*            │
        └──────────────────────┘            │                        │
                ▲                            │   ┌──────────────────┐ │
                │  direct upload (presigned)│   │ ARQ Submit Worker│ │
        ┌───────┴──────────────┐            │   └───────┬──────────┘ │
        │   Object Storage     │◄───────────│   ┌───────▼──────────┐ │
        │ (MinIO / Aliyun OSS) │            │   │ ARQ Poll Worker  │ │
        └──────────────────────┘            │   └───────┬──────────┘ │
                ▲                            │           │            │
                │ result images / report     │   ┌───────▼──────────┐ │
        ┌───────┴──────────────┐            │   │  AI Provider     │ │
        │   AI Image Provider  │◄───────────│   │ (Seedream etc.)  │ │
        │  (large model, HTTP) │            │   └──────────────────┘ │
        └──────────────────────┘            └────────────────────────┘
                                            │  PostgreSQL │ Redis │
                                            └─────────────┴───────┘
```

## Components and their roles

### 1. WeChat Mini Program (Frontend)

- Runs inside WeChat on the user's phone.
- Built with **uni-app (Vue 3 + TypeScript + Pinia + uview-plus)**.
- Talks to the backend over **HTTPS** using a REST client
  (`src/services/request.ts`) that automatically handles token refresh.
- Uploads photos **directly to object storage** using presigned URLs issued by
  the backend (never through the backend proxy).
- Polls the backend for design-job status while the user waits.
- Two compile-time modes: **Mock** (self-contained, for UI development) and
  **API** (production behavior). See
  [Data Source Modes](/frontend/data-source-modes).

### 2. Backend (FastAPI)

A Python 3.12 FastAPI application that owns all business logic:

- **REST API** — authentication, design jobs, assets, billing, workspaces,
  reports, admin. Every route lives under `/api/v1`.
- **ARQ workers** — background job processors (see below).
- **Database access** — SQLAlchemy 2.0 async ORM over PostgreSQL.
- **Object storage** — S3-compatible storage for photos and renderings.
- **WeChat integration** — login + payment.

The backend is deployed to **Alibaba Cloud SAE** as several applications that
share one immutable Docker image (see [Deploy](/deploy/cloud-architecture)).

### 3. ARQ workers

ARQ is a Redis-backed Python job queue. The backend runs two worker types:

| Worker | Job | What it does |
| --- | --- | --- |
| **Submit worker** | `submit_provider_job` | Takes a reserved design job, composes the provider request (prompt + images), calls the AI provider, and stores the provider's job id. |
| **Poll worker** | `poll_provider_job` | Repeatedly asks the AI provider whether the job finished; when it has, downloads and persists the result image and marks the job complete. |

Workers are **stateless** and consume jobs from Redis, so they can be scaled
independently.

### 4. AI Image Provider

An external large image model (the primary provider is **Seedream**, wrapped in
`app/providers/`). The backend treats it as an **asynchronous HTTP service**:

1. Submit a job → get a `provider_job_id`.
2. Poll that id until the result is ready.
3. Fetch the generated image.

A **mock provider** ships with the local stack so the whole pipeline can be
exercised without real model credentials.

### 5. PostgreSQL

The durable system of record. It stores users, sessions, workspaces, design
jobs, token ledgers, billing orders/subscriptions, report configurations,
assets metadata, legal-document acceptances and more. Schema changes are managed
with **Alembic** migrations.

### 6. Redis

Used for:

- The **ARQ job queue** (submission and polling tasks).
- **Rate limiting** (auth attempts, design-job submission).
- **Progress metrics** (how long jobs take, moving averages shown to users).
- Short-lived coordination/cache state.

### 7. Object storage

S3-compatible object storage for all binary content:

- **Input images** uploaded by users (with a temporary retention window before
  the job is submitted).
- **Result renderings** generated by the provider.
- **Report assets** (covers, mood boards, renderings) and the global **legal
  documents** (privacy policy, terms).

Local development uses **MinIO**; production uses **Aliyun OSS**.

## The core flow: a design job

The heart of the system is the **asynchronous design job**. This is the pattern
behind every feature:

```
user uploads photo ─► assets/upload-intents ─► direct upload to storage
      │
      ▼
POST /api/v1/design-jobs  (reserve tokens, create job, enqueue)
      │
      ▼
Redis queue ─► Submit worker ─► AI provider (job created)
      │
      ▼
Poll worker ◄──► AI provider (job done?)
      │
      ▼
result image persisted to storage ─► job status = completed
      │
      ▼
Mini program polls GET /api/v1/design-jobs/{id} ─► shows result
```

For the complete, step-by-step trace (including exactly which tables are
written and which HTTP hops happen), see
[Design Job Lifecycle](/reference/flows/design-job-lifecycle).

## Money flow: tokens and subscriptions

- Each design job **reserves** a number of tokens when submitted and
  **settles** the exact cost when the job finishes.
- Users buy **token packages** or a **subscription** through WeChat Pay.
- The backend receives the WeChat Pay **payment notification webhook**, marks
  the order paid and credits tokens / activates the subscription.

See [Billing & Tokens](/backend/billing-tokens) and the
[Payment Flow](/reference/flows/payment-flow).

## Authentication model

- Users authenticate with **WeChat login** (`wx.login` code → backend exchanges
  it for an `openid`, and on first registration the phone number too).
- The backend issues an **access token** (short-lived, ~15 min) and a
  **refresh token** (long-lived, ~30 days).
- The mini program stores the token pair in local storage and automatically
  refreshes it when a request returns `401`.

See [Authentication](/backend/authentication) and the
[WeChat Login Flow](/reference/flows/wechat-login-flow).

## Next steps

- Follow the [Quick Start](/get-started/quickstart) to run everything locally.
- Dive into the [Frontend](/frontend/overview) or [Backend](/backend/overview).
- Explore the [Deploy](/deploy/local-stack) options.
