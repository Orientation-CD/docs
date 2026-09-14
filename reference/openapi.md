# OpenAPI

FastAPI auto-generates an OpenAPI (Swagger) document from the decorated routes.
This page explains how to reach it, what is and is not included, and the key
request/response schemas you will encounter.

## Accessing the document

While the API is running:

```
http://localhost:8000/openapi.json     # raw JSON schema
http://localhost:8000/docs            # Swagger UI interactive playground
```

The document title and version are set in `app/main.py` (`FastAPI(title=...,
version="0.3.0")`). In production the same document is served under the edge
prefix, e.g. `https://api.example.com/api/openapi.json`.

## What is included

The generated schema covers every route with a `response_model` and an open
declaration:

| Tag | Router | Notes |
| --- | --- | --- |
| `authentication` | `auth_router` | register, login, wechat-login, refresh, logout |
| `design` | `design_router` | me, workspaces, prompt templates, design jobs, report discovery |
| `assets` | `asset_api.router` | upload intents, completion, list/read/delete |
| `billing` | `billing_api.router` | catalog, subscriptions, token purchases, payments, refunds, workspace |
| `wechat-webhooks` | `webhook_router` | payment/refund notify (server-to-server) |
| `workspaces` | `workspace_api.router` | workspace CRUD, share invitations |
| `rewards` | `referral_api.router` | referral invitations, rewards |
| `legal` | `legal_router` | current legal documents |
| `health` | root `router` | `/health/live`, `/health/ready` |

## What is excluded

Routes declared with `include_in_schema=False` are **not** published. These are
the admin server-rendered form actions (login, logout, user suspend /
reactivate / archive, provider and prompt admin forms), because they are HTML
form posts with CSRF tokens rather than JSON APIs. They still function but are
documented under [Authentication](/backend/authentication) instead of here.

The `/mock/*` payment helpers are only mounted when
`MOCK_PAYMENT_ENDPOINTS_ENABLED=true`; they appear in the schema only then.

## Authentication in the playground

Protected routes declare a `BearerAuth` security scheme (via
`HTTPBearer`). In Swagger UI you can paste a real access token into the
**Authorize** dialog:

```
Authorization: Bearer <access_token>
```

The admin web routes do **not** use this scheme — they rely on the signed
browser cookie set by `/admin/login`.

## Key schemas

These Pydantic models in `app/models.py` shape the most important requests and
responses.

### Auth

- `RegisterRequest` / `TokenResponse` — register (phone + password) and receive
  `{ access_token, refresh_token, ... }`.
- `WeChatLoginResponse` — WeChat login result.
- `UserResponse` — current user profile + token balance.

### Design jobs

- `DesignJobCreate` — create request (job type, asset ids, prompt selection).
- `DesignJobResponse` — one job: status, progress, result, error code.
- `DesignJobListResponse` — paginated list.
- `PromptTemplateListResponse` / `PromptTemplateResponse` — selectable prompts
  with variables and options.
- `ReportItemDiscoveryResponse` — available report sections.

### Assets

- `AssetUploadIntentCreateRequest` / `AssetUploadIntentResponse` — request and
  the presigned upload form.
- `AssetCompletionResponse` — final asset metadata.
- `AssetListResponse` / `AssetResponse` — listing and read.

### Billing

- `BillingCatalogResponse` — plans + packages.
- `PaymentOrderResponse` / `PaymentHistoryResponse` — order lifecycle.
- `RefundOrderResponse` — refund state.

### Workspaces & referrals

- `WorkspaceListResponse` / `WorkspaceDetailResponse` — workspace summaries.
- `ReferralInvitationCreateResponse` / `RewardListResponse` /
  `RewardClaimResponse` — referral flows.

## Idempotency

Several POST routes require an `Idempotency-Key` header (8–128 chars). This is
declared on the operation, so the playground shows it as a required header
parameter for upload intents, referral creation/accept, reward claim, and
payment actions.

## Generating a client SDK

Because the document is standard OpenAPI, you can generate a typed client from
`/openapi.json`, for example:

```bash
# Download the schema
curl http://localhost:8000/openapi.json -o openapi.json

# (example) generate a TypeScript client
npx openapi-typescript openapi.json -o api.d.ts
```

Additive-only API evolution means generated clients should ignore unknown
fields.

## Read next

- [REST API](/reference/rest-api) — the full route table.
- [Data Model](/reference/data-model) — the backing tables.
