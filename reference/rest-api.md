# REST API Reference

This page is the **complete route table** for the YuanZhu AI mobile API,
derived directly from `app/api.py`, `app/asset_api.py`, `app/billing_api.py`,
`app/workspace_api.py`, `app/referral_api.py`, and
`app/account_lifecycle_api.py`. Paths below are the **exact** paths the
FastAPI app serves (routers are mounted at the app root; the version prefix is
`/v1`).

For live request/response schemas, use the generated
[OpenAPI document](/reference/openapi). For the data behind these routes, see
[Data Model](/reference/data-model).

## Conventions

- **Internal mount:** the FastAPI app mounts every mobile router at the root,
  so the paths below are the **exact** paths uvicorn serves — e.g. `/v1/me`,
  `/v1/design-jobs`. Locally (docker-compose) you reach them directly at
  `http://localhost:8000/v1/...`.
- **Public/edge prefix:** in production the API sits behind a gateway that
  exposes the same routes under an `/api` prefix, so the Mini Program calls
  `/api/v1/me` and the edge maps it to `/v1/me`. The route table below lists
  the internal `/v1` paths; prepend `/api` for production URLs.
- **Auth:** most routes require `Authorization: Bearer <access_token>` (see
  [Authentication](/backend/authentication)). Public routes are marked.
- **Idempotency:** mutating upload / referral / payment routes accept an
  `Idempotency-Key` header (8–128 chars). Replaying the key returns the
  original result instead of double-executing.
- **Errors:** all errors share the envelope
  `{"detail": {"code": "MACHINE_READABLE_CODE"}}`.
- **Content type:** request/response bodies are `application/json`, except the
  report HTML route and admin forms.

## Health & meta

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health/live` | public | process is up |
| GET | `/health/ready` | public | Postgres + Redis reachable |
| GET | `/openapi.json` | public | generated OpenAPI schema |
| GET | `/metrics` | internal | compact performance snapshot |
| GET | `/configuration/export` | admin | export deployment config (`config_export.py`) |

## Authentication (`app/api.py` `auth_router`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/v1/auth/register` | public, rate-limited | register a phone+password account, return tokens (201) |
| POST | `/v1/auth/login` | public, rate-limited | phone + password login, return tokens |
| POST | `/v1/auth/wechat-login` | public, rate-limited | exchange a `wx.login` code for an OpenID, return tokens |
| POST | `/v1/auth/refresh` | refresh token | rotate the access token |
| POST | `/v1/auth/logout` | bearer | revoke the current session (204) |
| POST | `/v1/auth/reactivate` | public, rate-limited | restore a deactivated account via phone+password |
| POST | `/v1/auth/wechat-reactivate` | public, rate-limited | restore a deactivated account via WeChat code |
| POST | `/v1/me/deactivate` | bearer | start the deactivation grace period (204) |

## Me, workspaces, prompts, report discovery (`app/api.py` `design_router`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/v1/me` | bearer | current user profile + balance |
| PATCH | `/v1/me` | bearer | update profile (display name etc.) |
| GET | `/v1/me/workspaces` | bearer | list accessible workspaces + current selection |
| GET | `/v1/report-items?workspace_id=` | bearer | discover available report sections |
| GET | `/v1/prompt-templates` | bearer | list active prompt templates |
| GET | `/v1/prompt-templates/{prompt_template_name}` | bearer | one prompt template's variables/options |

## Design jobs (`app/api.py` `design_router`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/v1/design-jobs` | bearer | create + reserve a job; returns `202 Accepted` |
| GET | `/v1/design-jobs` | bearer | list the caller's jobs (paginated) |
| GET | `/v1/workspace/design-jobs` | bearer | list jobs in the current workspace |
| GET | `/v1/design-jobs/{design_job_id}` | bearer | one job's status + progress |
| GET | `/v1/design-jobs/{design_job_id}/report` | bearer | rendered HTML report (`HTMLResponse`) |
| GET | `/v1/design-jobs/{design_job_id}/result-file` | bearer | download the result file |
| DELETE | `/v1/design-jobs/{design_job_id}` | bearer | delete a terminal job (204) |

## Assets (`app/asset_api.py`, prefix `/v1/assets`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/v1/assets/upload-intents` | bearer + `Idempotency-Key` | mint a presigned direct-upload form (201, or 200 on replay) |
| POST | `/v1/assets/{asset_id}/complete` | bearer | verify the upload and finalize the asset |
| GET | `/v1/assets` | bearer | list the caller's assets (paginated) |
| GET | `/v1/assets/{asset_id}` | bearer | asset metadata + preview |
| DELETE | `/v1/assets/{asset_id}` | bearer | delete an asset (204) |

## Billing & payments (`app/billing_api.py`, prefix `/v1`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/v1/billing/catalog` | bearer | plans + token packages |
| POST | `/v1/subscriptions` | bearer | create a subscription payment order |
| POST | `/v1/token-purchases` | bearer | create a token-package payment order |
| GET | `/v1/payments?type=` | bearer | payment history |
| GET | `/v1/payments/{payment_order_id}` | bearer | one order status |
| POST | `/v1/payments/{payment_order_id}/pay` | bearer | (re)trigger JSAPI payment params |
| POST | `/v1/payments/{payment_order_id}/close` | bearer | close an unpaid order |
| POST | `/v1/payments/{payment_order_id}/refunds` | bearer | request a refund |
| GET | `/v1/refunds` | bearer | refund history |
| GET | `/v1/workspace` | bearer | current enterprise workspace management |
| POST | `/v1/workspace/invitations` | bearer (owner) | create an enterprise invitation |
| GET | `/v1/workspace/invitations` | bearer | list invitations |
| POST | `/v1/workspace/invitations/{invitation_id}/accept` | bearer | accept an invitation |
| POST | `/v1/workspace/invitations/{invitation_id}/decline` | bearer | decline an invitation (204) |
| DELETE | `/v1/workspace/invitations/{invitation_id}` | bearer (owner) | revoke an invitation (204) |
| DELETE | `/v1/workspace/members/{member_user_id}` | bearer (owner) | remove a member (204) |

### Payment webhooks (public, server-to-server)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/v1/webhooks/wechat/payments` | WeChat Pay payment notify (signature-verified) |
| POST | `/v1/webhooks/wechat/refunds` | WeChat Pay refund notify |

### Mock payment helpers (local only)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/mock/payments/{payment_order_id}/complete` | simulate payment success |
| POST | `/mock/refunds/{refund_order_id}/complete` | simulate refund success |

## Workspaces & share invitations (`app/workspace_api.py`, prefix `/v1`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/v1/workspaces/{workspace_id}` | bearer | workspace detail + members |
| GET | `/v1/workspaces/{workspace_id}/token-detail` | bearer | token ledger detail for the workspace |
| POST | `/v1/workspaces` | bearer | create an enterprise workspace |
| PATCH | `/v1/workspaces/{workspace_id}` | bearer (owner) | rename / update workspace |
| POST | `/v1/workspaces/{workspace_id}/invitations` | bearer (owner) | invite a member |
| POST | `/v1/workspaces/{workspace_id}/share-invitations` | bearer (owner) | create a share link |
| GET | `/v1/workspaces/{workspace_id}/share-invitations` | bearer | list share links |
| DELETE | `/v1/workspaces/{workspace_id}/share-invitations/{invitation_id}` | bearer (owner) | revoke a share link (204) |
| POST | `/v1/share-invitations/preview` | public, IP-limited | preview a share link |
| POST | `/v1/share-invitations/accept` | bearer + `Idempotency-Key` | accept a share link |
| DELETE | `/v1/workspaces/{workspace_id}/membership` | bearer | leave a workspace |
| DELETE | `/v1/workspaces/{workspace_id}/members/{member_user_id}` | bearer (owner) | remove a member (204) |

## Referrals & rewards (`app/referral_api.py`, prefix `/v1`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/v1/referral-invitations` | bearer + `Idempotency-Key` | create a referral bearer (201) |
| POST | `/v1/referral-invitations/preview` | public, IP-limited | preview a bearer |
| POST | `/v1/referral-invitations/accept` | bearer + `Idempotency-Key` | accept (first-wins attribution) |
| GET | `/v1/rewards` | bearer | list the caller's rewards |
| POST | `/v1/rewards/claim` | bearer + `Idempotency-Key` | claim reward tokens |

## Legal documents (`app/api.py` `legal_router`, prefix `/v1/legal-documents`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/v1/legal-documents/current` | bearer | list the current required legal docs |
| GET | `/v1/legal-documents/{slug}` | bearer | fetch one legal document + acceptance state |

## Admin routes

Admin routes are server-rendered HTML under `/admin` (login, users, model
providers, prompt templates, billing catalog, performance). They use a signed
browser session + CSRF token, not bearer JWTs, and are mostly excluded from the
OpenAPI schema (`include_in_schema=False`). See
[Authentication](/backend/authentication#admin-sessions-and-csrf).

## Versioning

There is no URL version negotiation beyond the fixed `/v1` prefix. Breaking
changes are delivered by adding new fields (additive Pydantic models) and, when
necessary, a new prefix; clients should ignore unknown fields.

## Read next

- [OpenAPI](/reference/openapi) — accessing `/openapi.json` and key schemas.
- [Data Model](/reference/data-model) — the tables behind these routes.
- [Configuration](/reference/configuration) — env vars that gate behavior.
