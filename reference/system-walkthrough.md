# Read the system from a user action to stored evidence

Reference is a source-reading course. Pick an action you can recognize in the mini program, follow its request into FastAPI, then identify the records and external calls that explain the visible result. You do not need to understand the entire repository before following one chain.

## A concrete first journey {#first-journey}

Use [the real local-API tutorial](/get-started/quickstart), with simulated external services where configured. Frontend Mock never reaches SQL, Redis or workers. Check [integration status](/reference/integration-status) first; the new floor-plan client is not a working backend-main exercise.

Choose one image task and keep user ID, workspace ID, uploaded Asset ID, action key and public Job ID. These identities connect processes; filenames and progress percentages do not.

```mermaid
sequenceDiagram
  autonumber
  participant U as Person / mini program
  participant A as FastAPI
  participant D as PostgreSQL
  participant O as Object storage
  participant Q as Redis / ARQ
  participant W as Worker
  participant P as Provider
  U->>A: Login and discover Feature
  A->>D: Resolve identity / permission
  U->>A: Create upload intent
  U->>O: Signed multipart POST bytes
  U->>A: Complete Asset
  A->>D: Commit verified READY upload
  U->>A: Submit exact body and action key
  A->>D: Commit Asset-owned archive claim
  A->>O: Copy and verify exact version outside SQL transaction
  A->>D: Publish COMPLETED archive receipt
  A->>D: Recheck, commit ACTIVE inputs, Job, pins, wallet/quota and outbox
  A->>Q: Dispatch committed generation
  Q->>W: Execute fenced submission
  W->>P: Submit/query frozen provider request
  W->>O: Stage and publish exact output
  W->>D: Finalize graph, settle once
  U->>A: Poll public Job ID
  A->>D: Check creator or current-owner read access
  A-->>U: Typed outputs and expiring URLs
```

Messages 6, 8, 10, 11 and 16 are distinct SQL checkpoints. Storage I/O at9 cannot hold the final admission transaction open. A completed archive at10 can still be followed by rejected admission at11; it does not prove a Job exists. A202 confirms acceptance, not generation completion. Server Poll workers recover scheduling; they are different from the client's HTTP polling.

| Messages | Code-reading chapter | Evidence to identify |
| --- | --- | --- |
| 1–2 | [Identity](/reference/flows/wechat-login-flow), [discovery](/reference/flows/discovery-prompts-flow) | Platform proof, current consent and effective Feature |
| 3–10 | [Asset upload/archive](/reference/flows/asset-upload-flow), [audio handoff](/reference/flows/voice-upload-flow) | Role-bound intent, verified version, receipt and Asset identity |
| 7–14 | [Admission/workers](/reference/flows/design-job-lifecycle), [member cap](/reference/flows/member-quota-flow), [product branches](/reference/flows/workflow-products-flow) | Exact replay before new work; durable pins, wallet/quota reservation and generation |
| 15–16 | [Reports/exports](/reference/flows/report-view-flow), [diagnosis](/reference/flows/runtime-debugging) | Publication evidence and one-time settlement |
| 17–19 | [History/actions](/reference/flows/workflow-history-flow) | Refreshable links, authorized read-only owner detail and creator-only writes |

## How a source link becomes a learning step {#reading-code}

A link such as `file → function` opens a fixed commit and a function's starting line. In your editor, open that relative file under the correct repository and search for the same function. `src/` belongs to the frontend; `app/` belongs to the backend. A `.vue` file combines page behavior and markup; a `.ts` repository translates UI actions into HTTP; a Python route binds HTTP input to a handler.

Read a function in this order:

1. **Input:** parameters, request model and `Depends(...)`. Dependencies obtain the authenticated user, DB session or storage; they can reject the request before the handler runs.
2. **Branch:** `if`/`isinstance`/`raise`. These explain why two apparently similar requests have different outcomes.
3. **Call:** follow the named service function, not every import. `await` waits for that I/O within this coroutine; it does not mean a background Job has completed.
4. **State:** `select(...)` reads SQL rows; `db.add`/field assignment stages a write; `flush` issues SQL without committing; `commit` makes it durable.
5. **Boundary:** `queue.enqueue_job` schedules another process; provider HTTP can spend money; storage writes bytes separately from database metadata.
6. **Return:** match the response fields to the frontend mapper and reactive page state. A successful HTTP status proves only the operation documented at that endpoint.

Example starting points:

- [src/services/request.ts → request](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/src/services/request.ts#L369)
- [app/workflows/api.py → create_workflow](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/api.py#L1135)
- [app/workflows/workflow_admission.py → admit_workflow_job](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/workflow_admission.py#L2939)
- [app/worker.py → execute_workflow_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/worker.py#L254)

Do not infer the running path from a filename alone. The current API accepts canonical `/v1/workflows`, while some shipped image/audio/video forms still deliberately post to the compatibility `/v1/design-jobs` adapter. The [product route matrix](/reference/flows/workflow-products-flow#frontend-routing) states the actual caller for each branch.

## Choose a domain, then an exact API {#reading-map}

| User question | Full chain |
| --- | --- |
| How does a login code become our account, and why can consent block login? | [Identity, legal documents, sessions and account lifecycle](/reference/flows/wechat-login-flow) |
| Why does a feature appear unavailable? Where do prompt fields come from? | [Discovery and prompt configuration](/reference/flows/discovery-prompts-flow) |
| Why did upload succeed but task submission fail? | [Asset intent → signed POST → completion → immutable input](/reference/flows/asset-upload-flow) |
| How does an upload web-view hand audio back to the mini program? | [Voice handoff session and restricted browser cookie](/reference/flows/voice-upload-flow) |
| How do images, voice, eight copywriting tools and video share one runtime? | [Product-specific request and execution paths](/reference/flows/workflow-products-flow) |
| How does one report wait for generated designs and become HTML plus PPTX? | [Report composition, publication and export](/reference/flows/report-view-flow) |
| What survives a timeout, worker crash, retry or page refresh? | [Durable Workflow lifecycle](/reference/flows/design-job-lifecycle) · [history actions](/reference/flows/workflow-history-flow) |
| How do projects, enterprise seats and referral rewards differ? | [Projects](/reference/flows/project-flow) · [membership](/reference/flows/workspace-membership-flow) · [referrals](/reference/flows/referral-rewards-flow) |
| What really grants tokens after a payment or removes them after refund? | [Payment](/reference/flows/payment-flow) · [Douyin](/reference/douyin-payment) · [refunds](/reference/flows/refund-flow) |
| Why can a funded enterprise reject one member? | [Monthly cap and accounting month](/reference/flows/member-quota-flow) |
| Which new frontend cannot run against this backend main? | [Integration status](/reference/integration-status) · [floor plans](/frontend/floor-plans) |

The [per-API route index](/reference/rest-api#generated-route-index) links every public route declaration to its handler and an endpoint-specific explanation. A webhook has a provider trigger; an operator API may have no mini-program button. Those boundaries are stated explicitly instead of inventing a UI caller. Conditional mock routes and browser Admin routes are explained as separate surfaces, not counted as public mobile APIs.

## Keep four kinds of identity separate {#identities}

```mermaid
erDiagram
  USER ||--o{ DESIGN_JOB : submits
  WORKSPACE ||--o{ DESIGN_JOB : scopes
  PROJECT ||--o{ DESIGN_JOB : groups
  DESIGN_JOB ||--|| WORKFLOW_RUN : freezes
  WORKFLOW_RUN ||--|{ OPERATION_RUN : contains
  OPERATION_RUN ||--o{ SUBMISSION : executes
  SUBMISSION }o--o| PROVIDER_TASK : tracks
  OPERATION_RUN ||--o{ OUTPUT_ASSET : publishes
```

This is a conceptual map; exact SQL tables/foreign keys are in [the data model](/reference/data-model). Public Workflow ID equals `design_jobs.id`; internal `workflow_runs.id` and `operation_runs.id` are different values. A provider task ID identifies an external charge/execution, not an authorization credential. Expiring output URLs are temporary access capabilities, not durable result identity.

## A guided source-reading exercise {#exercise}

Use a local task already created by the onboarding tutorial; do not purchase a real model run just to read the code.

1. Find its POST request in the developer tool Network panel. Record the actual path and `Idempotency-Key`; explain the UI-to-repository transition with the route matrix.
2. Open the handler link, then `admit_workflow_job`. Locate the replay check before fresh admission. Explain why the original key must be retained after a lost response.
3. Trace its Job ID through the read-only joins in [runtime diagnosis](/reference/flows/runtime-debugging#sql-trace). Identify the frozen run, operation, submission generation and output Asset.
4. Find the step that uploads bytes, the step that publishes SQL output identity, and the step that settles the parent. Explain why these are separate checkpoints.
5. Close/reopen the detail page. Use the GET request and frontend poller to explain why the result survives navigation.

If you cannot name a concrete function or stored identity for a step, return to that chapter's code map. Reading the whole repository alphabetically is not necessary.
