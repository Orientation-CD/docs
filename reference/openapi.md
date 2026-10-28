# OpenAPI and Contract Boundaries

Use the running backend's `/openapi.json` for machine-readable transport schemas and `/docs` for Swagger UI. The pinned [REST client contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/REST_API_INTERFACE.md) defines domain errors and retry semantics. These sources serve different purposes.

## Read a schema from the selected environment

```bash
export API_BASE_URL='http://localhost:<selected-session-port>'
curl --fail "$API_BASE_URL/openapi.json" -o openapi.json
```

Replace the placeholder before running. A downloaded schema describes the deployed application/configuration at that URL, not necessarily this documentation snapshot. Record the server `APP_VERSION`/source revision alongside generated clients. Downloading a schema is read-only; Swagger's **Try it out** can mutate real data and trigger paid work.

## Included interfaces

The production contract covers the recorded method/path operations, including health, authentication/consent, Workflows, compatibility jobs, Assets, workspaces/Projects, prompts, billing, payment/refund callbacks and voice handoff. Schema coverage is not a promise of feature activation.

The schemas preserve literal path parameter names, body discriminators, typed input/output shapes, declared parameters and success statuses. Use `POST /v1/workflows` for new integrations; `/v1/design-jobs` compatibility operations remain documented where still supported. Discovery and live entitlement checks decide which capabilities a user may run.

## Different authentication boundaries

| Surface | Credential |
| --- | --- |
| Most mobile `/v1` operations | Access-token Bearer header |
| Refresh/logout | Refresh token in the body |
| Legal/discovery and public invitation preview | Public as specified per endpoint |
| Report/presentation browser view | Short-lived signed `token` query capability |
| Payment/refund webhooks | Platform signatures over the exact raw request bytes |
| `/voice-upload/*` after exchange | Restricted HttpOnly cookie, exact Origin and CSRF token for writes |
| `/admin/*` | Browser Admin session and CSRF; excluded from public OpenAPI |

Do not paste a general bearer token into a signed storage form, browser capability URL or webhook request. Admin JSON/partial endpoints are internal operational interfaces, not public client APIs merely because they return JSON.

## Validation, errors and idempotency

Request-shape errors use `422` with a validation array. Stable domain errors use `detail.code` plus display/diagnostic message and optional metadata. The REST contract's per-endpoint errors/retry rules are authoritative: generated OpenAPI can include framework `422` without enumerating every domain status.

Creation endpoints that require `Idempotency-Key` must replay the original key with the same normalized request after transport uncertainty. A new key is a new action and can incur a new reservation/payment/provider call. Reusing a key with changed content is a conflict. Do not derive retry policy from a generated client's generic HTTP exception class.

## Conditional mocks and legacy behavior

`MOCK_PAYMENT_ENDPOINTS_ENABLED` controls local completion helpers; Douyin also has mode-dependent mock routes. Separate mock image/provider servers run outside the main API. These are conditional test interfaces, not production client operations. Their exact contract is the pinned mock document/tests.

Compatibility paths are not proof that retired request fields remain accepted. Some historical Workflow fields are explicitly rejected for resubmission; follow the current discriminator/schema. The [API index](/reference/rest-api) and [Workflow lifecycle](/reference/flows/design-job-lifecycle) explain the supported client path.

## Client generation

Generate a client from a saved, revision-identified schema with your team's pinned generator. Keep its output separate from handwritten domain/repository logic. Check discriminated unions, nullable values, endpoint-specific statuses (Asset/voice-session creation `201` new versus `200` replay; Workflow submission `202` for both), capability URLs and multipart **POST** storage forms manually. Schema generation cannot implement consent UX, entitlement handling, safe paid retries or platform payment bridges for you.

## A candidate fixture is not this backend main

The frontend contains captured floor-plan schemas from candidate source branches. This audited backend main exposes no dedicated floor-plan routes. [Integration status](/reference/integration-status) and [floor-plan source reading](/frontend/floor-plans) identify the gap; those client contracts are deliberately excluded from the main public-route inventory. Only the explicitly scoped candidate guide may reference their recorded method/path set. Do not generate a main client from a merged collection of incompatible schemas.

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions).

- [Normative REST contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/REST_API_INTERFACE.md)
- [Application router registration](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/main.py)
- [Public schemas](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/models.py)
- [Conditional mock interfaces](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/MOCK_API_INTERFACE.md)
