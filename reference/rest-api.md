# REST API Overview

The backend exposes a **REST API** under `/api/v1` (in production the public
origin is `PUBLIC_API_BASE_URL`, e.g. `https://api.example.com`, so full URLs
look like `https://api.example.com/api/v1/design-jobs`).

- The **live OpenAPI** (Swagger UI) is served by FastAPI at
  `<api-origin>/docs` — the authoritative, always-current reference.
- This page gives a **human-readable map** of every open API with links to the
  full end-to-end call chains.

## Conventions

- **Auth**: protected endpoints require `Authorization: Bearer <access_token>`.
  See [Authentication](/backend/authentication).
- **Idempotency**: mutating endpoints accept an `Idempotency-Key` header
  (design jobs, asset uploads) so client retries are safe.
- **Errors**: FastAPI errors are `{ "detail": { "code": "...", "message": "...", ... } }`
  (or a list for validation errors). The mini program maps `code` to user
  messages.
- **Pagination**: list endpoints accept `page` (1-based) and `page_size`
  (≤ 100), and return `{ items, page, page_size, total }`.
- **Short-lived URLs**: result/report images come as presigned URLs with
  `expires_at`; refetch to refresh.
- **Polling**: job endpoints return `poll_after_seconds` and set `Retry-After`.

## Endpoint map

### Health

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health/live` | — | Liveness |
| GET | `/health/ready` | — | Readiness (PostgreSQL + Redis) |

### Authentication & users

| Method | Path | Auth | Purpose | Call chain |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | — | Legacy email/password registration | — |
| POST | `/api/v1/auth/login` | — | Legacy email/password login | — |
| POST | `/api/v1/auth/wechat-login` | — | **WeChat login** (code + phone + legal consent) | [WeChat Login Flow](/reference/flows/wechat-login-flow) |
| POST | `/api/v1/auth/refresh` | — | Rotate a refresh token into a new pair | [WeChat Login Flow](/reference/flows/wechat-login-flow) |
| POST | `/api/v1/auth/logout` | ✅ | Revoke the server-side session | [WeChat Login Flow](/reference/flows/wechat-login-flow) |
| GET | `/api/v1/me` | ✅ | Current user profile | — |
| PATCH | `/api/v1/me` | ✅ | Update nickname / phone | — |
| GET | `/api/v1/me/workspaces` | ✅ | My workspaces (personal + enterprise) | [Workspace Membership Flow](/reference/flows/workspace-membership-flow) |
| POST | `/api/v1/me/deactivate` | ✅ | Deactivate own account | — |
| POST | `/api/v1/auth/reactivate` | ✅ | Reactivate after deactivation | — |
| POST | `/api/v1/auth/wechat-reactivate` | ✅ | Reactivate via WeChat | — |

### Legal documents

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/legal-documents/current` | — | Current required legal documents (with `required` flags) |
| GET | `/api/v1/legal-documents/{id}/content` | — | One document's HTML content |

### Prompt templates & report items

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/prompt-templates` | ✅ | Available prompt templates (feature catalog) |
| GET | `/api/v1/prompt-templates/{name}` | ✅ | One template |
| GET | `/api/v1/report-items?workspace_id=` | ✅ | Report item discovery for the workspace |

### Design jobs

| Method | Path | Auth | Purpose | Call chain |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/design-jobs` | ✅ | **Submit a design job** (reserve tokens, enqueue) | [Design Job Lifecycle](/reference/flows/design-job-lifecycle) |
| GET | `/api/v1/design-jobs` | ✅ | Paginated personal job history (`q`, `status`, `workspace_id`) | [Design Job Lifecycle](/reference/flows/design-job-lifecycle) |
| GET | `/api/v1/design-jobs/{id}` | ✅ | **Poll** one job's durable state | [Design Job Lifecycle](/reference/flows/design-job-lifecycle) |
| DELETE | `/api/v1/design-jobs/{id}` | ✅ | Delete/cancel a job | — |
| GET | `/api/v1/design-jobs/{id}/report?token=` | token | Render the completed **HTML report** | [Report Viewing Flow](/reference/flows/report-view-flow) |
| GET | `/api/v1/design-jobs/{id}/result-file` | ✅ | Download the raw result file | — |
| GET | `/api/v1/workspace/design-jobs?workspace_id=` | ✅ (owner) | One workspace's jobs | [Workspace Membership Flow](/reference/flows/workspace-membership-flow) |

### Assets

| Method | Path | Auth | Purpose | Call chain |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/assets/upload-intents` | ✅ | **Create an upload intent** (presigned form) | [Asset Upload Flow](/reference/flows/asset-upload-flow) |
| POST | `/api/v1/assets/{id}/complete` | ✅ | Confirm direct upload, finalize metadata | [Asset Upload Flow](/reference/flows/asset-upload-flow) |
| GET | `/api/v1/assets` | ✅ (admin) | List assets | — |
| GET | `/api/v1/assets/{id}` | ✅ | Asset metadata | — |
| DELETE | `/api/v1/assets/{id}` | ✅ | Delete an asset | — |

### Billing, payments & subscriptions

| Method | Path | Auth | Purpose | Call chain |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/billing/catalog` | ✅ | Store catalog (token packages + plans) | [Payment Flow](/reference/flows/payment-flow) |
| POST | `/api/v1/subscriptions` | ✅ | Create a subscription checkout | [Payment Flow](/reference/flows/payment-flow) |
| POST | `/api/v1/token-purchases` | ✅ | Create a token-package checkout | [Payment Flow](/reference/flows/payment-flow) |
| POST | `/api/v1/payments/{id}/pay` | ✅ | Confirm/pay an order (returns JSAPI params) | [Payment Flow](/reference/flows/payment-flow) |
| GET | `/api/v1/payments/{id}` | ✅ | Order status | — |
| POST | `/api/v1/payments/{id}/close` | ✅ | Close an order | — |
| GET | `/api/v1/payments` | ✅ | Payment history | — |
| POST | `/api/v1/payments/{id}/refunds` | ✅ | Request a refund | — |
| GET | `/api/v1/refunds` | ✅ | Refund history | — |
| POST | `/api/v1/webhooks/wechat/payments` | — (signed) | **WeChat Pay payment notify** | [Payment Flow](/reference/flows/payment-flow) |
| POST | `/api/v1/webhooks/wechat/refunds` | — (signed) | WeChat Pay refund notify | [Payment Flow](/reference/flows/payment-flow) |
| POST | `/mock/payments/{id}/complete` | — | Mock payment completion (dev) | — |
| POST | `/mock/refunds/{id}/complete` | — | Mock refund completion (dev) | — |

### Workspaces & organizations

| Method | Path | Auth | Purpose | Call chain |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/workspaces` | ✅ | Create an enterprise workspace | [Workspace Membership Flow](/reference/flows/workspace-membership-flow) |
| GET | `/api/v1/workspaces/{id}` | ✅ | Workspace detail (owner/member) | — |
| GET | `/api/v1/workspaces/{id}/token-detail` | ✅ | Workspace token detail | — |
| PATCH | `/api/v1/workspaces/{id}` | ✅ (owner) | Rename workspace | — |
| POST | `/api/v1/workspaces/{id}/invitations` | ✅ (owner) | Invite a known user | [Workspace Membership Flow](/reference/flows/workspace-membership-flow) |
| POST | `/api/v1/workspaces/{id}/share-invitations` | ✅ (owner) | Create a share invitation link | — |
| POST | `/api/v1/share-invitations/preview` | ✅ | Preview a share invitation | — |
| POST | `/api/v1/share-invitations/accept` | ✅ | Accept a share invitation | — |
| GET | `/api/v1/workspaces/{id}/share-invitations` | ✅ (owner) | List share invitations | — |
| DELETE | `/api/v1/workspaces/{id}/share-invitations/{inv}` | ✅ (owner) | Revoke an invitation | — |
| DELETE | `/api/v1/workspaces/{id}/membership` | ✅ (member) | Leave a workspace | — |
| DELETE | `/api/v1/workspaces/{id}/members/{user_id}` | ✅ (owner) | Remove a member | — |

### Enterprise workspace billing (singular `/workspace`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/workspace` | ✅ | Current enterprise workspace + entitlement |
| POST | `/api/v1/workspace/invitations` | ✅ (owner) | Billing-side invitation (seats) |
| GET | `/api/v1/workspace/invitations` | ✅ | My invitations |
| POST | `/api/v1/workspace/invitations/{id}/accept` | ✅ | Accept an invitation |
| POST | `/api/v1/workspace/invitations/{id}/decline` | ✅ | Decline |
| DELETE | `/api/v1/workspace/invitations/{id}` | ✅ | Delete |
| DELETE | `/api/v1/workspace/members/{user_id}` | ✅ (owner) | Remove member (billing) |

### Admin & config (operators)

| Area | Path prefix | Purpose |
| --- | --- | --- |
| Admin site | `/admin` | Server-rendered admin app (users, jobs, billing, templates, legal docs) |
| Config export | `/config/...` | Export/snapshot/sync configuration between environments |

## How to read the full contracts

1. Start the backend locally (see [Backend Getting Started](/backend/getting-started)).
2. Open `http://localhost:9090/docs`.
3. Every endpoint lists its exact request/response schema (auto-generated from
   `app/models.py`).

## End-to-end call chains

The heart of this Reference is the **full call-chain pages** — for each open
API they trace what happens from the mini program through the backend to the
final response:

- [WeChat Login Flow](/reference/flows/wechat-login-flow)
- [Design Job Lifecycle](/reference/flows/design-job-lifecycle)
- [Asset Upload Flow](/reference/flows/asset-upload-flow)
- [Payment Flow](/reference/flows/payment-flow)
- [Report Viewing Flow](/reference/flows/report-view-flow)
- [Workspace Membership Flow](/reference/flows/workspace-membership-flow)

## Next steps

- [Data Model](/reference/data-model) — the database behind the API.
- [Configuration Reference](/reference/configuration) — every setting.
- [OpenAPI](/reference/openapi) — machine-readable contracts.
