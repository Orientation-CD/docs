# Compatibility boundaries

These are facts about interfaces still exposed by the audited server, not a recipe for reviving removed products. New integrations start with `/v1/workflows`, typed Assets, Feature prices and Workflow-node configuration. Current UI adapters remain part of the [actual source-reading map](/reference/flows/workflow-products-flow#frontend-routing).

## Three different states

| State | Actual behavior | Where to read the chain |
| --- | --- | --- |
| Supported adapter | `/v1/design-jobs` creation/list/detail/retry/move/delete/result/report/presentation routes enter supported Workflow handlers; they are deprecated in OpenAPI | [Admission](/reference/flows/design-job-lifecycle), [history](/reference/flows/workflow-history-flow), [report publication](/reference/flows/report-view-flow) |
| Catalog aliases | `GET /v1/billing/catalog` and `GET /v1/design-workflows` use the catalog handler; they are not an independent pricing/model-binding system | [Discovery](/reference/flows/discovery-prompts-flow) |
| Explicit rejection | `POST /v1/design-job-quotes` returns `409 WORKFLOW_UPDATED`; an old quote is not silently converted into a current report request | [Retired quote boundary](/reference/flows/design-job-lifecycle#retired-quote) |

The owner-history alias `/v1/workspace/design-jobs` shares the owner-scoped Workflow collection authorization. This does not grant creator mutations. Both detail aliases now use the same `readable_design_job` predicate for the original author, current project assignee with membership, and active enterprise owner. Authorized by-ID detail exposes input Assets; owner/project collections still withhold other authors' inputs. Returned `submitted_by`, current `project_assignee` and `permissions` preserve the distinction between reading and new author actions. See [history authorization](/reference/flows/workflow-history-flow).

A route's declared status is not every possible runtime response. In particular, deprecated does not mean every adapter returns 409, and a declared 200 result-file route can issue a signed redirect.

## Recovering an uncertain action

Keep the original endpoint, normalized body and idempotency key for an exact replay. Fingerprint compatibility and retry receipts are checked by the server. Do not “migrate” an in-flight request by changing its URL/body/key and assume that it remains the same action. Once its result is known, use the current canonical contract for a separate new action. A possibly accepted supplier POST is a different boundary: [UNKNOWN recovery](/backend/workflows#unknown-recovery) uses the frozen attempt, a durable deadline and read-only confirmations; changing an adapter URL or key cannot make another paid dispatch safe.

## Content that no longer defines the system

The removed report-template editor, report-item/quote assembly, image-only provider schema and Catalog-based model assignment are not current configuration instructions. New ThreeVjia work uses shared SDK configuration/releases, not a restored generic 3vjia_render Provider model. Existing frozen historical executions retain explicit SDK compatibility decoding; unavailable historical releases are not replaced by the latest release. Old single-JSON floor-plan requests are accepted for exact prior-receipt recovery only; new rendering requires JSON plus a verified primary Image. Current reports use Blueprint products, models are selected on Workflow nodes, and outputs are typed Assets. Old URL stubs point to these current guides and stay out of search. Historical migration files are recovery evidence, not runtime installation instructions.

All still-declared public adapters remain in the [generated route inventory](/reference/rest-api#generated-route-index), with endpoint-specific explanations. Removing old guidance must not conceal a still-exposed API or pretend the current app has finished its transport migration.

Source: [src/pkg-features/repositories/designJobSubmit.ts](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/src/pkg-features/repositories/designJobSubmit.ts) · [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/api/__init__.py) · [app/workflows/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/api.py) · [app/billing/billing_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/billing/billing_api.py)
