# Workflows, Features and Operations

A Feature is the public product selected by request `type`. It owns its price, active state and subscription permission. A Workflow defines the executable graph; its nodes use reusable Operations. Node model selections belong to that Workflow, so changing one Workflow does not rebind every product using the same Operation.

## Submission contract

1. Discover executable products and prices through public `GET /v1/billing/features`.
2. Upload and complete any required Assets. Preserve the declared roles, immutable versions and product-specific port mapping.
3. Send `POST /v1/workflows` with Bearer auth, `Idempotency-Key`, explicit `workspace_id`, `type` and the product's exact inputs. `project_id` is optional; omission assigns scratch without making a later project move a different original request.
4. Persist the receipt and poll its returned `status_url` after `poll_after_seconds`/`Retry-After`. Read the ordered, typed `inputs`/`outputs`; inspect `result_kind` rather than assuming every result is an image.

New admissions freeze the accepted graph, model/connection configuration, prompts, commercial price and input identity. Later admin edits affect new work. Each run has durable Operations and Submissions, with attempt generations and execution fencing to prevent stale work from publishing over a newer attempt.

## State and accounting

Public state progresses through `pending` → `running` → `completed` or `failed`. Progress estimates remain monotonic; 100 means completion, not a prediction that every external stage will finish on schedule. The API limits concurrent active work per user across workspaces (default five).

The specified workspace pays. Admission reserves Tokens atomically; successful finalization consumes the reservation, and failure releases it. Included child work is not independently billed as a new customer product. See [billing](/backend/billing-tokens).

An exact request replay uses the same key/body and returns the accepted task. A failed task retry is a separate explicit action at `/v1/workflows/{design_job_id}/retry`, subject to the server's retry eligibility and frozen inputs. Ambiguous paid provider acceptance is not safely repeatable: follow returned error/retry metadata instead of automatically resubmitting a paid request.

## History and lifecycle

`GET /v1/workflows` is personal task history; `/v1/workspace/workflows` is the owner-scoped workspace view. The response's current Project controls filtering after a move. Move and delete use the canonical Workflow routes and check lifecycle, retained dependencies and permissions. A deletion cleanup failure can leave an accepted durable deletion claim; retry the documented operation rather than creating a replacement task.

Use [image/compatibility details](/backend/design-jobs), [reports](/backend/reports), [voice](/backend/voice), [copywriting](/backend/copywriting) and [video](/backend/video) for product differences. Complete schemas, error handling and deprecated routes are in [REST API](/reference/rest-api).

---

Source evidence · backend `b13cc566`: [app/workflows/workflow_admission.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/workflow_admission.py) · [app/workflows/workflow_execution.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/workflow_execution.py) · [documents/REST_API_INTERFACE.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md).
