# Floor-plan API execution chains

Read [the server model](/backend/floor-plans) first. Its numbered diagram follows original save, before-image import, Workflow admission and persisted output. This page provides the distinct scope, side effects and recovery boundary for every editor/Works operation, including H5 gateway methods.

Native entry uses [useFloorPlanEntry](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/src/composables/useFloorPlanEntry.ts#L24); Works management uses [floorPlanManagement](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/src/repositories/floorPlanManagement.ts#L34). H5 render interception and stable pending receipts live in [dispatchStored](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/static/3vjia/h5/bridge.js#L437). All source links identify the same audited pair.

## Check editor availability {#editor-context}

`GET /v1/floor-plan-editor/context` enters `editor_context`. The native availability repository and H5 bootstrap send current workspace and optional project/group. `authenticate_editor_context` establishes platform identity and project authority. `resolve_entry_work` uses a scratch project for a new Work or resolves the registered group and live layout for continuation; retired `scheme_id` locators are rejected. The response combines enabled image/panorama Features, selected release metadata and contract-supported render modes. A context read is not a login probe or a reservation. Missing supplier metadata and unavailable release remain explicit errors/states.

Source reading: [editor_context](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/api.py#L41) · [authenticate_editor_context](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/works.py#L90) · [resolve_entry_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L272).

## Open or continue the editor {#editor-url}

`POST /v1/floor-plan-editor/editor-url` enters `refresh_editor_url`. The native repository requests `bootstrap_auth:true`. `prepare_editor_entry` checks platform scope, the exact SDK release and required group operations, commits before the external login probe, then rechecks the same configuration and authority under locks. Continuing uses the registered Work project/layout; a new `house_catalog` entry selects the house selector. Optional independent platform auth is committed only after qualification. The response URL/version is a free entry capability, not a saved Work or successful render. Native handoff rejects stale/foreign origins and expired credentials.

Source reading: [refresh_editor_url](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/api.py#L156) · [prepare_editor_entry](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/editor_entry.py#L182).

## List locally registered Works {#list-works}

`GET /v1/floor-plan-works` enters `list_works`. Plans requests page/page_size (up to 100) and optional project. SQL selects readable nondeleted local ownership rows and computes total before external metadata reads; without a project filter it restricts to the current original author. Per-author/configuration readers fetch supplier metadata with bounded concurrency. `finalize_work_views` rechecks live access and attaches current assignment/permissions and related Workflow counts before returning. Supplier absence can produce an unavailable Work, not an invented empty history. Titles/covers are live supplier fields.

Source reading: [list_works](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L294) · [finalize_work_views](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L401).

## Read a Work detail {#work-detail}

`GET /v1/floor-plan-works/detail` enters `get_work`. `floorPlanManagement.detail` supplies workspace and opaque group. `readable_work` checks history workspace, project access and current readable ownership, separately from editor authority. Deleted Works return the explicit deleted error; supplier-deleted cleanup rows need no supplier fetch. The handler reads live metadata, then `finalize_work_views` revalidates access and exposes permissions. Being an enterprise owner/assignee reader does not grant rename or edit authority. A conflicting project or workspace cannot be overridden by client labels.

Source reading: [get_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L553) · [readable_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L503) · [finalize_work_views](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L401).

## Rename and confirm supplier metadata {#rename-work}

`PATCH /v1/floor-plan-works/{group_id:path}` enters `rename_work`. The author sends workspace/name; `locate_work` and `require_work` establish writable ownership. The selected release must support group_update. `register_management_write` persists a write fence before external SDK dispatch. A terminal receipt releases the fence; an uncertain upstream error is followed by metadata confirmation rather than an unconditional resend. Only a matching live name returns WorkDetail; otherwise `FLOOR_PLAN_RENAME_UNCONFIRMED` keeps uncertainty visible. A concurrent project assignment does not rewrite the original accepted supplier write.

Source reading: [rename_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L581) · [register_management_write](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_deletion.py#L24).

## Expand a Work into standard executions {#work-workflows}

`GET /v1/floor-plan-works/workflows` enters `work_workflows`. The Works composable requests limit (1–100), offset, group and optional project. `readable_work` rejects deleted/deleting groups. SQL joins the same readable root-history baseline used by counts, excludes deletion-started jobs and reads limit+1 to derive has_more. `job_response` renders normal Workflow DTOs; private inputs are exposed only to their original author. Work and Workflow permissions are finalized again after response preparation. The frontend verifies each embedded Workflow workspace/group/ID and paginates, without fetching all history.

Source reading: [work_workflows](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L634) · [readable_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L503).

## Move one Work and its executions atomically {#move-work}

`POST /v1/floor-plan-works/{group_id:path}/move` enters `move_work`. The build-selected move repository sends workspace, expected_source_project_id and target_project_id. `move_group` acquires the author admission lock, validates Work identity, current source, all related jobs and both accessible movable projects, then changes local Work/job associations in one caller-committed transaction. No supplier HTTP occurs. `PROJECT_SOURCE_STALE` requires reloading the current Work rather than retrying against an invented source. Immutable supplier/request identities remain unchanged; successful response returns the actual target project.

Source reading: [move_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L721) · [move_group](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_move.py#L73).

## Delete through a durable recovery claim {#delete-work}

`DELETE /v1/floor-plan-works/{group_id:path}` enters `delete_work`. An already completed identity-free tombstone returns 204. Otherwise the original author is required. `claim_group_deletion` checks running/deleting jobs and management writes, persists a frozen recovery claim, then `enqueue_group_deletion` wakes the poll queue after commit. 202 is accepted cleanup, not completion. `resume_group_deletion` dispatches remove once, records the dispatch fence, confirms absence by reads and delegates existing job/Asset cleanup. After its 120-second window, a dispatched unknown claim stops automatic polling. `confirm_only=true` with the captured deadline requests one read of that original claim, never a fresh removal. The frontend keeps the item until 204.

Source reading: [delete_work](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L821) · [claim_group_deletion](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_deletion.py#L77) · [enqueue_group_deletion](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_recovery.py#L36) · [resume_group_deletion](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_recovery.py#L172).

## Read deletion progress without dispatch {#deletion-status}

`GET /v1/floor-plan-works/{group_id:path}/deletion` enters `work_deletion_status`. Polling authenticates readable Work scope and calls `deletion_view`; it does not enqueue another supplier removal. A complete tombstone returns 204 without former owner/workspace disclosure. Otherwise 200 reports active, waiting_writes, waiting_supplier, supplier_unknown, supplier_unconfirmed or cleanup, plus automatic_polling, deadline and error_code. The client follows automatic_polling instead of assuming every 200 means keep polling. supplier_deleted still means local cleanup can remain outstanding.

Source reading: [work_deletion_status](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L803) · [deletion_view](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/group_works.py#L760).

## Open a read-only panorama result {#panorama-viewer}

`POST /v1/floor-plan-editor/panorama-viewer-url` enters `panorama_viewer_url`. The result page sends workflow_id/workspace_id and optional bootstrap_auth. It loads a readable Workflow in that workspace, requires a professional Feature and frozen panorama mode, then checks the current available SDK release/digest and complete viewer manifest. External release I/O finishes before `require_design_job_read_access` rechecks current authority and optional platform session commits. Response viewer_url/version is a fresh read capability, not a supplier render or public share link. Wrong mode returns WORKFLOW_INPUT_INVALID; unavailable viewer files are a provider-unavailable error.

Source reading: [panorama_viewer_url](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/panorama.py#L38) · [require_design_job_read_access](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/read_access.py#L102).

## Import the render before image {#floor-before-image}

`POST /v1/floor-plan-editor/before-assets` enters `import_before_image`. The editor bridge passes source_url, workspace, optional project and a stable Idempotency-Key before paid submission. `import_before_asset` fingerprints owner/scope/source and persists a temporary private Image plus UploadIntent before external I/O. The SDK-bound transport limits remote artifact hosts/size and rejects redirects; image validation, versioned storage and normal Asset completion produce a canonical READY identity. Same-key different input conflicts; exact completed replay returns replayed=true, while an active duplicate import is a state conflict. Rate limits, invalid image, upstream and storage errors preserve distinct HTTP failure boundaries. This endpoint creates no paid Workflow.

Source reading: [import_before_image](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/api.py#L255) · [import_before_asset](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/before_assets.py#L88).

## Redeem an aliased supplier upload grant {#supplier-upload}

`POST /v1/floor-plan-editor/uploads/{upload_id}` enters `upload`. Original H5 supplier upload compatibility uses an opaque upload ID emitted by gateway response adaptation, not an arbitrary destination URL. `authenticate_editor_context` determines the current user/configuration/generation; AuthCache must contain the unexpired upload grant in that scope. The handler bounds the body, restores only the exact aliased form fields, forwards one POST without redirects and accepts only a successful bounded receipt. It returns 200 with no-store. Missing/expired/mutated grants return FLOOR_PLAN_UPLOAD_UNAVAILABLE; cache outage and upstream errors are separate. This supplier upload is not a completed platform Asset; the before-assets path owns that later import.

Source reading: [upload](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L794) · [authenticate_editor_context](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/works.py#L90).

## Shared gateway authorization and transport {#gateway-boundary}

The nine method declarations below enter the same `relay` boundary. Read its common checks in order, then the method-specific behavior. The boundary pins a **contract service and its origin**, while intentionally permitting unknown ordinary supplier paths inside that service; it is not a complete per-path allowlist.

| Step | Source | What must hold before the next step |
| --- | --- | --- |
| 1. Authenticate scope | [authenticate_editor_context](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/works.py#L90) | Current platform identity, workspace/project authority and SDK configuration/generation are established. |
| 2. Select the exact contract | [selected_contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/sdk_binding.py#L24) | Bind the SDK configuration and `X-Editor-Version`; a requested retained release must still be available. Resolve `target` only through that contract's service origin. |
| 3. Guard the resource boundary | [relay](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/floor_plans/gateway.py#L263) | Check the literal raw-path prefix. Block known render/history signatures across releases and mismatched management methods; recognized saves/updates/removals retain Work/write fences. Ordinary path/query bytes otherwise remain intact. |
| 4. Exchange a bounded receipt | [ThreeVjiaSDK.forward](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/three_vjia/sdk.py#L276) | The gateway filters/substitutes credentials, keeps aliases/cookies scoped, and conceals response secrets. Transport stays within the selected service, does not follow redirects, bounds response bytes/headers, and returns `no-store`. |

Errors distinguish route-forbidden, auth-cache miss, unavailable configuration and upstream failure. A failed auth/cache read does not establish that an earlier remote write was never accepted. Before retrying a write, follow the numbered save/render chain in [the server model](/backend/floor-plans). Method declaration alone does not authorize every supplier operation.

## GET through the H5 gateway {#gateway-get}

`GET /v1/floor-plan-editor/gateway/{target}/{path:path}` enters `relay`. Read ordinary supplier resources; SDK transport treats an unmapped GET as read-only for uncertain-response classification. No local paid reservation is created. Apply the [shared gateway checks](#gateway-boundary) before interpreting the receipt.

## POST through the H5 gateway {#gateway-post}

`POST /v1/floor-plan-editor/gateway/{target}/{path:path}` enters `relay`. This is the original H5 save/update compatibility path as well as ordinary supplier POST transport. Group save is observed with prepare_group_save/finish_group_save; removal is converted into the durable deletion claim. Paid render signatures are refused and must use Workflows. Apply the [shared gateway checks](#gateway-boundary) before interpreting the receipt.

## PUT through the H5 gateway {#gateway-put}

`PUT /v1/floor-plan-editor/gateway/{target}/{path:path}` enters `relay`. Body-bearing supplier PUT is not classified as read-only. Recognized management operations must match their contract method and retain original Work/write fences; an ambiguous receipt is not safe evidence to resend. Apply the [shared gateway checks](#gateway-boundary) before interpreting the receipt.

## PATCH through the H5 gateway {#gateway-patch}

`PATCH /v1/floor-plan-editor/gateway/{target}/{path:path}` enters `relay`. Ordinary PATCH keeps supplier body bytes. Known management targets are extracted from the actual supplier payload and compared with platform Work context before dispatch, rather than trusting a client group label. Apply the [shared gateway checks](#gateway-boundary) before interpreting the receipt.

## DELETE through the H5 gateway {#gateway-delete}

`DELETE /v1/floor-plan-editor/gateway/{target}/{path:path}` enters `relay`. The generic DELETE declaration does not bypass Work ownership or cleanup. A recognized group removal takes the same durable claim/recovery branch; terminal 204 and accepted 202 retain their different meanings. Apply the [shared gateway checks](#gateway-boundary) before interpreting the receipt.

## HEAD through the H5 gateway {#gateway-head}

`HEAD /v1/floor-plan-editor/gateway/{target}/{path:path}` enters `relay`. Read resource headers through the same scoped boundary. SDK treats an unmapped HEAD as read-only; it is not a permission or availability shortcut. Apply the [shared gateway checks](#gateway-boundary) before interpreting the receipt.

## OPTIONS through the H5 gateway {#gateway-options}

`OPTIONS /v1/floor-plan-editor/gateway/{target}/{path:path}` enters `relay`. Forward an ordinary supplier OPTIONS request with platform authentication. This is separate from browser CORS middleware and remains read-only for unmapped transport classification. Apply the [shared gateway checks](#gateway-boundary) before interpreting the receipt.

## TRACE through the H5 gateway {#gateway-trace}

`TRACE /v1/floor-plan-editor/gateway/{target}/{path:path}` enters `relay`. TRACE is declared on the compatibility route and reaches relay; it is not used by the current native repositories. There is no extra diagnostic permission or unrestricted echo API: selected-service, credential filtering, body bounds and interception still apply. SDK treats unmapped TRACE as a non-read operation. Apply the [shared gateway checks](#gateway-boundary) before interpreting the receipt.

## CONNECT through the H5 gateway {#gateway-connect}

`CONNECT /v1/floor-plan-editor/gateway/{target}/{path:path}` enters `relay`. CONNECT is a declared compatibility method, not a platform tunnel service. relay still performs its normal bounded HTTP exchange against the selected contract service; no separate tunnel lifecycle is implemented here. SDK treats unmapped CONNECT as a non-read operation. Apply the [shared gateway checks](#gateway-boundary) before interpreting the receipt.
