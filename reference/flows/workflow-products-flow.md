# Product-specific requests and model execution

The shared lifecycle explains persistence and settlement. This chapter answers the next source-reading question: after `type` is selected, which exact inputs, provider branch and output shape run? The same submit endpoint does not make all products interchangeable.

## The shipped frontend's actual route choices {#frontend-routing}

| Page / user action | Preparation and HTTP path | Server branch | Result |
| --- | --- | --- | --- |
| Image/custom-design form: submit | `submitDesignJob` → `postPrepared` → `/v1/design-jobs`; legacy ordered `assets` | Compatibility adapter normalizes required image roles, then image Workflow | Image Asset |
| Voice-summary form: submit recordings | Same compatibility path with ordered recording `assets` | Voice canonical request/admission, shared summary operation | Markdown + Document Asset |
| Eight copywriting forms: generate | `prepareCopywriting` → same repository, but `isCopywritingFeature` selects `/v1/workflows` | Text-only canonical request, shared summary operation | Markdown + Document Asset |
| Video form: generate | `submitVideoGeneration` → typed `inputs`, `script`, optional model → `/v1/design-jobs` | Typed video admission and local video submission | MP4 Asset |
| Design-report form: submit | `prepareProjectWorkflow` / `postWorkflow` → `workflowsRepository.submit` → `/v1/workflows` | Blueprint-based report graph, included children and local export | HTML preview + PPTX |

Open [src/pkg-features/repositories/designJobSubmit.ts → postPrepared](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/repositories/designJobSubmit.ts#L128) to see the actual path conditional. A new API client can submit supported typed image/voice/video bodies through `/v1/workflows`; changing a shipped form's path requires its corresponding body/mapper contract, not a documentation-only substitution. An `html_report` legacy branch still visible in old frontend helper code is not evidence that its retired server request is accepted.

## Image and customized design {#image-branch}

[app/core/models.py → ImageWorkflowDesignJobCreate](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py#L658) requires 1–3 role-bearing inputs, one `primary`, at most one each `mask` and `reference`, with the actual inventory constrained by the chosen Feature/graph. Immutable upload roles must agree with these semantic roles. Customized design is an image branch; it does not authorize an arbitrary URL or a free-form provider endpoint.

```mermaid
sequenceDiagram
  autonumber
  participant UI as Image form / upload repository
  participant A as Admission
  participant W as Image execution
  participant P as Frozen image provider
  participant O as Storage
  participant DB as PostgreSQL
  UI->>A: Prepared assets/prompts and action key
  A->>DB: Freeze roles, composed prompt, node model and reservation
  W->>DB: Claim current Submission and frozen inputs
  W->>P: ProviderRequest with signed immutable images
  P-->>W: Typed image result or pollable task ID
  W->>O: Stage/verify exact image and copy publication version
  W->>DB: Link Image Asset and complete child
```

| Message | Source and what it proves |
| --- | --- |
| 1–2 | [Admission](/reference/flows/design-job-lifecycle#submit-workflow): canonical vs supported legacy normalization happens before a supplier request |
| 3–5 | [app/workflows/operations/image/workflow_image_execution.py → dispatch_image_workflow_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/image/workflow_image_execution.py#L1525) → [app/workflows/operations/image/workflow_image_execution.py → build_image_provider_request](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/image/workflow_image_execution.py#L214): load frozen pins, build instructions/image inputs and validate adapter capabilities |
| 6–7 | [app/workflows/operations/image/workflow_image_execution.py → _publish](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/image/workflow_image_execution.py#L1202): publication intent, lease, exact object version/hash, generation and authority are checked again before association |

A temporary supplier URL is transport evidence, not a permanent result. The executor materializes/verifies/stages it, then publishes an authorized own-storage Asset. A model returning a successful HTTP status with missing/wrong output cannot mark the Job completed. Provider adapters such as GPT image and Seedream implement their own request/response transport; the runtime consumes the typed image output rather than exposing those provider response shapes to the mini program.

## Ordered audio → a persisted Markdown result {#voice-branch}

[app/core/models.py → VoiceWorkflowDesignJobCreate](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py#L702) accepts **1–3 distinct recordings** under `port: "recordings", role: "recording"`; input order matters. The current frontend compatibility `assets` list is normalized to that order. Browser handoff only prepares the recordings; [its restricted session](/reference/flows/voice-upload-flow) does not itself create the paid summary.

1. Admission verifies ownership/readiness/object pins and freezes the summary instructions.
2. [app/workflows/submissions/workflow_provider_submission.py → dispatch_workflow_provider_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/submissions/workflow_provider_submission.py#L768) chooses the frozen adapter. [app/workflows/operations/summary/summary_execution.py → build_summary_provider_request](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/summary/summary_execution.py#L19) creates ordered `AudioInput` values and requests Markdown text. Capabilities must actually support audio; a text-only adapter is not sufficient.
3. Provider completion text is validated/restored under the same attempt, then [app/workflows/operations/markdown_output_assets.py → materialize_markdown_output](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/markdown_output_assets.py#L407) creates a private versioned Document output with content hash and durable Asset ID.
4. Coordinator/finalizer binds that output to the public Job and settles it. Root voice completion can advance Project status to requirements captured.
5. The Markdown result page reads typed output content and identity. An inline string is convenient for display but does not replace the Document required as a reusable report source.

A canonical body has this shape (replace both UUIDs with returned accessible IDs):

```json
{
  "workspace_id": "22222222-2222-2222-2222-222222222222",
  "type": "voice_summary",
  "name": "Local consultation summary",
  "inputs": [
    {"kind":"asset","port":"recordings","role":"recording","asset_id":"00000000-0000-0000-0000-000000000001"}
  ]
}
```

`workspace_id` identifies the billing/access context; `asset_id` is a completed audio upload, not a file path. Omitted `project_id` uses the server's caller-specific scratch Project. This example is for `/v1/workflows`; the compatibility UI body uses `assets` instead of `inputs`.

## Eight copywriting features share one text engine {#copywriting-branch}

| Feature key | User-facing purpose |
| --- | --- |
| `copywriting_short_video` | Short-video script |
| `copywriting_xiaohongshu` | Xiaohongshu copy |
| `copywriting_moments` | WeChat Moments copy |
| `copywriting_titles` | Title suggestions |
| `copywriting_shooting` | Shooting guidance |
| `copywriting_knowledge` | Knowledge content |
| `copywriting_pitfalls` | Pitfall content |
| `copywriting_operations_experience` | Operations experience |

Follow [src/pkg-features/services/copywritingSubmit.ts → prepareCopywriting](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/copywritingSubmit.ts#L13) from the form's `submit`. It validates the selected feature's fields, loads profile/catalog/templates, checks current context/eligibility, normalizes fields, binds a Project when enabled and creates a persistent logical action key. `inputs` is an empty array: the user's text belongs in the named prompt fields, not fabricated Asset inputs. Exact template names/field names are configuration contracts.

[app/core/models.py → CopywritingWorkflowDesignJobCreate](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py#L740) rejects nonempty `inputs`. Admission composes configurable prompts and reads the workspace/feature knowledge material through [app/workflows/operations/summary/copywriting_kb.py → read_copywriting_kb](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/summary/copywriting_kb.py#L23). It snapshots the relevant knowledge text/configuration so a later object/config edit does not silently change the accepted execution. A malformed knowledge object fails as `COPYWRITING_KB_INVALID` before model dispatch.

The same summary operation builds a text-only `ProviderRequest`: configurable prompt/knowledge text becomes typed `TextInput`; system and negative instructions remain explicit. It then validates Markdown and materializes the same durable Document output as voice. Reusing the operation does not mean these eight Features share activation, prices, templates or knowledge configuration. Search by the exact feature key through frontend catalog, prompt selection and backend admission to see those differences.

## Video uses a bounded local orchestration process {#video-branch}

[src/pkg-features/services/videoGenerationSubmit.ts → submitVideoGeneration](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/videoGenerationSubmit.ts#L45) checks profile/catalog/entitlements, stages character/scene/optional recording Assets and prepares the script. [app/core/models.py → VideoWorkflowDesignJobCreate](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py#L789) accepts exactly one character image, 0–12 distinct scene images, at most one recording and a nonblank script up to 20,000 characters. The shipped form deliberately requires one scene and limits script to 1,000 characters; installed supplier capabilities can be narrower again. These are three different layers of limits.

```mermaid
sequenceDiagram
  autonumber
  participant UI as Video form
  participant API as Video admission
  participant W as Submit worker
  participant C as Render child process / jinqiuai
  participant O as Own object storage
  participant DB as PostgreSQL
  UI->>API: Inputs, script, optional known model and key
  API->>DB: Freeze pins/model/script and create local Submission
  W->>DB: Claim generation and render authority
  W->>C: Download pinned inputs, write bounded request, render once
  C-->>W: Validated result locator
  W->>DB: Stage locator and result evidence
  W->>O: Download bounded MP4, hash and upload own version
  W->>DB: Verify and link Video output, coordinate parent
```

| Message | Exact code |
| --- | --- |
| 1 | [src/pkg-features/services/videoGenerationSubmit.ts → submitVideoGeneration](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/videoGenerationSubmit.ts#L45) |
| 2 | `admit_workflow_job` / `_resolve_video_inputs` in [admission](/reference/flows/design-job-lifecycle) |
| 3 | [app/worker.py → execute_video_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/worker.py#L353) → [app/workflows/submissions/workflow_local_video_submission.py → execute_local_video_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/submissions/workflow_local_video_submission.py#L881) |
| 4–5 | [app/conversion/video_subprocess.py → SubprocessVideoClient](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/conversion/video_subprocess.py#L85) → [app/conversion/video_jinqiu_adapter.py → main](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/conversion/video_jinqiu_adapter.py#L121) |
| 6–8 | [app/workflows/submissions/workflow_local_video_submission.py → execute_local_video_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/submissions/workflow_local_video_submission.py#L881) → [app/workflows/submissions/workflow_local_video_submission.py → attach_verified_video_output](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/submissions/workflow_local_video_submission.py#L721) |

“Local” means our worker owns the orchestrating child process; the third-party pipeline may still call paid remote services. The child receives only a minimal environment plus required credentials, not DB/storage authority. The worker owns pins and final publication. A timed-out render is uncertain and is not automatically rendered again; recovering a staged download/upload is different from repurchasing a render. A supplier download URL is not returned as the permanent Job output.

The optional requested model is only honored under the server's model-selection activation; otherwise the configured baseline is used. A UI/API change alone cannot add support to the installed private dependency. Source/package preparation and Linux runtime checks remain part of [deployment](/deploy/local-stack).

## Reports combine these branches {#report-branch}

A report Blueprint can reference existing verified image/summary results, frozen gallery objects or included generated designs. Its graph then composes report HTML and exports PPTX. Do not send an HTML string or old `report_items` and assume it is the new contract. Follow [report composition and viewing](/reference/flows/report-view-flow) for parent/child dependencies, page plans, sanitization, conversion and signed access. Direct `design_report_pptx` create requests are currently rejected with `WORKFLOW_UNAVAILABLE`; HTML/PPTX outputs of the active report pipeline are the supported main path.

## Compare two products in the source {#exercise}

Choose voice and copywriting. Starting at their form handlers, identify the different body shapes and the shared summary operation. In the stored `operation_run_inputs`, distinguish ordered audio pins from text instructions/knowledge. Find the shared Document materialization and explain how a report can reuse it later. Then compare video: identify the OS process boundary and the point at which a recoverable download stops being permission to rerun the supplier. Use local mock providers; source reading does not require paid invocation.
