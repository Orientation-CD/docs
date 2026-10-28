# REST API Index

Start with [the source-reading course](/reference/system-walkthrough). This index links **every public route** to its actual FastAPI handler and a dedicated full-chain explanation: UI/repository or external trigger, authorization, service calls, database/Redis/storage changes, response and failure recovery.

This page is a domain-oriented integration map. The [complete pinned REST contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/REST_API_INTERFACE.md) is normative for exact fields, successful/replay statuses and every reachable domain error. Internal Admin and conditional mocks have different boundaries.

## Conventions

Set `API_BASE_URL` to the selected environment, for example `http://localhost:<owner-selected-port>`. All paths below are relative to it. Use HTTPS for real clients. Most `/v1` calls require `Authorization: Bearer <access_token>`; exceptions are listed explicitly. Idempotency keys are durable per action (upload-intent keys are 8–128 characters), and must survive a timeout/restart when replaying the same action.

Domain errors have `{"detail":{"code":"STABLE_CODE","message":"..."}}`; branch on `code`, not message text. Request-shape `422` uses a validation array instead. `409 TRANSIENT_CONFLICT` carries `Retry-After: 1`; honor it and reuse the key for an idempotent action. Never retry a non-idempotent/paid operation merely because an SDK labels an error transient.

## Identity and discovery

| Methods / paths | Authentication and purpose |
| --- | --- |
| `GET /health/live`, `GET /health/ready` | Public; `200`, readiness can return `503 DEPENDENCY_UNAVAILABLE` |
| `GET /v1/legal-documents/current`, `GET /v1/legal-documents/{document_id}/content` | Public current immutable documents and their content |
| `POST /v1/auth/register`, `/login`, `/wechat-login`, `/douyin-login` | Public rate-limited authentication; registration/platform login includes current legal acceptance |
| `POST /v1/auth/refresh`, `/logout` | Refresh token in request body; rotate or revoke the session |
| `GET/PATCH /v1/me`, `POST /v1/me/deactivate` | Bearer profile and account lifecycle |
| `POST /v1/auth/reactivate`, `/wechat-reactivate`, `/douyin-reactivate` | Credential-specific reactivation flow |
| `GET /v1/billing/features`, `/v1/billing/catalog` | Public Feature/catalog; catalog is compatibility and supports `200`/`304` |
| `GET /v1/design-workflows` | Public deprecated alias of `/v1/billing/features`, with identical catalog/ETag behavior |
| `GET /v1/prompt-templates`, `/v1/prompt-templates/{prompt_template_name}` | Bearer; current template contract, exact names/fields are required at submission |
| `GET/POST /v1/prompt-presets`, `PATCH/DELETE /v1/prompt-presets/{preset_id}` | Bearer-owned prompt selections |

Example read:

```bash
curl --fail "$API_BASE_URL/v1/legal-documents/current?locale=zh-CN"
curl --fail "$API_BASE_URL/v1/billing/features"
```

A `503 LEGAL_DOCUMENTS_UNAVAILABLE` blocks admissible registration; `409 LEGAL_ACCEPTANCE_REQUIRED` requires fetching/displaying current documents and renewed consent. Do not insert invented document IDs into login examples.

## Workspaces and private Projects

| Methods / paths | Purpose |
| --- | --- |
| `GET /v1/me/workspaces`, `/v1/me/history-workspaces`, `/v1/me/workspace-removal-notices` | Bearer current access, departed history and removal notices |
| `GET/PATCH /v1/workspaces/{workspace_id}`, `POST /v1/workspaces` | Workspace detail, owner updates/creation according to the contract |
| `GET /v1/workspaces/{workspace_id}/overview`, `/token-detail` | Authorized workspace overview and financial detail |
| `GET /v1/project-statuses` | Bearer code-owned status catalog; outcomes depend on activation |
| `GET/POST /v1/workspaces/{workspace_id}/projects` | Creator-private project collection in the selected workspace |
| `PUT /v1/workspaces/{workspace_id}/projects/default` | Persist caller's default Project |
| `GET/PATCH /v1/workspaces/{workspace_id}/projects/{project_id}` | Authorized detail/creator mutation |
| `POST /v1/workspaces/{workspace_id}/projects/{project_id}/delete` | Guarded project deletion; not an unqualified hard delete |
| `POST/GET /v1/workspaces/{workspace_id}/share-invitations` | Enterprise-owner creation/list; list `200`, token absent from owner list |
| `POST /v1/share-invitations/preview`, `/accept` | Public preview; authenticated atomic accept |
| `DELETE /v1/workspaces/{workspace_id}/share-invitations/{invitation_id}` | Owner revocation, `204` |
| `POST /v1/workspaces/{workspace_id}/invitations`, `DELETE /.../members/{member_user_id}` | Owner phone invitation/member removal |
| `DELETE /v1/workspaces/{workspace_id}/membership` | Authenticated member leaves |

Singular `/v1/workspace*` routes remain compatibility interfaces for invitation inbox/accept/decline and owner access. They are not a substitute for explicit selected-workspace authorization. Referral `/v1/referral-invitations*` and reward `/v1/rewards*` are a separate attribution/claim system; they do not join an enterprise.

## Asset admission

| Method / path | Credential and successful result |
| --- | --- |
| `POST /v1/assets/upload-intents` | Bearer + key; `201` new / `200` exact replay; returns Asset identity and optional signed POST form |
| `POST /v1/assets/{asset_id}/complete` | Owner/Admin Bearer; `200` verified completion |
| `POST /v1/assets/{source_asset_id}/design-input-copies` | Authorized Bearer + key; `201` new / `200` replay; independent reusable result copy |
| `GET /v1/assets/{asset_id}` | Authorized safe metadata; signed preview can expire |
| `GET /v1/assets` | Administrator-only collection |
| `DELETE /v1/assets/{asset_id}` | Administrator-only guarded deletion, `204` |

```bash
curl --fail --request POST "$API_BASE_URL/v1/assets/upload-intents" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Idempotency-Key: $UPLOAD_KEY" --header 'Content-Type: application/json' \
  --data '{"type":"IMAGE","purpose":"DESIGN_JOB_INPUT","role":"image","original_filename":"room.jpg","content_type":"image/jpeg","size_bytes":12345}'
```

`12345` is illustrative; supply the actual byte count. POST the binary file and every returned `upload.fields` value to `upload.url` without the API Bearer header. Then complete and require `READY`. See the [upload chain](/reference/flows/asset-upload-flow).

## Member monthly quota

| Method/path | Authorization and behavior |
| --- | --- |
| `GET /v1/workspaces/{workspace_id}/me/token-quota` | Current member/owner self-read; owner has unlimited cap, usage remains counted |
| `PUT /v1/workspaces/{workspace_id}/member-token-limit` | Current owner; null or1..10,000,000; every save clears member overrides |
| `PUT /v1/workspaces/{workspace_id}/members/{user_id}/token-limit` | Current owner; null or0..10,000,000; zero pauses the member |

Usage follows reservation month in Asia/Shanghai; reserved is a subset of used. [Quota chain](/reference/flows/member-quota-flow) explains validation, authorization, audit, admission and settlement. No quota editor exists in this frontend snapshot.

## Workflows and read-only owner detail

| Method / path | Meaning |
| --- | --- |
| `POST /v1/design-job-quotes` | Retired; authenticated call returns `409 WORKFLOW_UPDATED`; new flows skip the quote round trip |
| `POST /v1/workflows` | Bearer + durable key; canonical typed submission; `202` for both acceptance and exact replay |
| `GET /v1/workflows`, `/v1/workflows/{workflow_id}` | Bearer history/status; `200`; public Workflow ID is the Job ID |
| `POST /v1/workflows/{design_job_id}/retry` | Original creator + retry key; `202`; same Job with durable retry receipt |
| `POST /v1/workflows/{design_job_id}/move` | Creator/current access; expected-source plus target project |
| `DELETE /v1/workflows/{design_job_id}` | Creator; guarded deletion |
| `GET /v1/workflows/{design_job_id}/result-file` | Authorized Bearer; image streaming or fresh signed-artifact redirect |
| `GET /v1/workflows/{design_job_id}/report`, `/presentation` | Signed query-token browser capabilities, not a generic Bearer API call |
| `GET /v1/workspace/workflows?workspace_id=<UUID>` | Explicit selected-workspace owner collection; required workspace query |

Example canonical image request (replace all UUIDs with accessible returned identities):

Current task detail permits its creator or current active-enterprise owner; owner-other views hide inputs and grant no write actions. See [history authorization](/reference/flows/workflow-history-flow).

```json
{
  "workspace_id": "22222222-2222-2222-2222-222222222222",
  "type": "colored_floor_plan",
  "name": "Living-room proposal",
  "inputs": [{"kind":"asset","port":"images","role":"primary","asset_id":"00000000-0000-0000-0000-000000000001"}],
  "prompts": {"prompts":[{"name":"feature_colored_floor_plan","fields":[]}]}
}
```

Choose the actual active Feature/template and required role set from discovery; the example does not promise the Feature is configured in every environment. Canonical roles are `primary`, `mask`, `reference`, validated against immutable upload roles. `/v1/design-jobs` remains an in-process compatibility adapter, including supported history/status/retry/result operations; new clients use Workflows. Retired request fields may explicitly require resubmission.

Text/copywriting, ordered voice, Blueprint/PPTX and video use distinct discriminated bodies. Script video API accepts one character image, 0–12 scenes, optional recording and script up to 20,000 characters; its current UI requires exactly one scene and limits script to1,000. Same-style managed/custom branches use prompts, required recording over5seconds,0–1 scene, and the configured/uploaded reference Video. Replacements and optional replace_scope have a separate frozen contract. See [video](/backend/video); API acceptance never proves provider acceptance.

## Billing and platform events

| Methods / paths | Credential and behavior |
| --- | --- |
| `POST /v1/subscriptions`, `/v1/token-purchases` | Bearer + key; server selects price and entitlement snapshot |
| `GET /v1/payments`, `/v1/payments/{payment_order_id}` | Purchaser Bearer; `200`, authoritative local state |
| `POST /v1/payments/{payment_order_id}/pay`, `/close`, `/reconcile` | Purchaser Bearer; resume, close/reconcile under server rules |
| `POST /v1/payments/{payment_order_id}/refunds` | Purchaser Bearer + key; guarded full refund |
| `GET /v1/refunds`, `POST /v1/refunds/{refund_order_id}/reconcile` | Purchaser state; explicit reconcile endpoint is Douyin-only |
| `POST /v1/webhooks/wechat/payments`, `/refunds` | Verified WeChat APIv3 signature; no mobile Bearer |
| `POST /v1/webhooks/douyin/payment`, `/refund`, `/refund-application` | Verified Douyin RSA/raw-body signature |

The explicit payment/refund `/reconcile` endpoints use the Douyin gateway; they are not a generic manual WeChat reconciliation API. Client payment success does not grant tokens. Expired pending orders remain “confirming” until server evidence closes/settles them. Refund APIs exist; the mini program currently has no user-facing refund application entry.

## Voice browser handoff and internal interfaces

`POST /v1/voice-upload-sessions` requires owner Bearer + key (`201`/`200` replay); owner status is `GET /v1/voice-upload-sessions/{session_id}`. Browser `/voice-upload/exchange` consumes a one-time code and issues a restricted cookie. `/voice-upload/session` and `/voice-upload/files/{slot}/upload-intent`/`complete` require that cookie; writes additionally require exact Origin and CSRF. They do not expose a general API session.

`/admin/*` uses browser sessions/CSRF and is excluded from public OpenAPI. Conditional `/mock/*` payment helpers and standalone mock provider servers are test interfaces. Read [OpenAPI boundaries](/reference/openapi), the [full REST contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/REST_API_INTERFACE.md), and its per-endpoint error tables before implementing a new action.

## Every API and its call chain {#generated-route-index}

This inventory records declared default success statuses and deprecation metadata, not endpoint authorization or every runtime/replay response. Use the manual guidance above and the pinned REST contract for those semantics.

<!--@include: ../.vitepress/generated/api.en.md-->

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions).

- [Normative method/path/auth/status and error contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/REST_API_INTERFACE.md)
- [Public request/response schemas](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/models.py)
- [Asset signing/admission routes](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_api.py)
- [Workflow routes and compatibility](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/api.py)
