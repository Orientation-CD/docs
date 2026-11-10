# Video fees: preview, confirm and freeze

A video form can show a price before it creates a task. That preview and the eventual paid acceptance are different boundaries. Follow one example: a user chooses an uploaded reference clip, confirms its model and Tokens, then submits the prepared request. The reference Asset's measured duration is authoritative; a client duration label is presentation.

## Request the authoritative preview {#video-price-preview}

`POST /v1/video-billing/preview` calls `preview_video_billing`. The caller supplies `workspace_id`, optional known `model`, and **exactly one** of `script`, `template_name`, or `reference_asset_id`. `VideoBillingPreviewRequest` rejects ambiguous sources and a blank script with 422. The authenticated frontend caller is `previewVideoBilling`; the form refreshes its display after a 400 ms debounce and the submit service obtains a fresh preview before confirmation.

```mermaid
sequenceDiagram
  autonumber
  participant UI as Video form and submit service
  participant API as Fee preview and admission
  participant DB as PostgreSQL
  participant W as Local video worker
  participant S as Versioned storage
  participant C as Bounded video subprocess
  UI->>API: Preview source, workspace and requested model
  API->>DB: Read access, activation and coherent pricing rules
  API->>DB: Resolve source metadata and personal plan
  API-->>UI: Calculated breakdown without reservation
  UI->>API: Confirmed amount/model, exact inputs and action key
  API->>DB: Recheck price, freeze snapshot and reserve atomically
  W->>DB: Read frozen model, price and input versions
  W->>C: Execute frozen script or remake configuration
  C-->>W: Staged result and bounded diagnostics
  W->>S: Verify and publish exact MP4 version
  W->>DB: Attach output and settle once
```

| Message | Pinned source | Read this boundary |
| --- | --- | --- |
|1|[submitVideoGeneration](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/src/pkg-features/services/videoGenerationSubmit.ts#L76)|Resolve profile/catalog, stage a custom reference, request the exact current price.|
|2–3|[preview_video_billing](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/billing/video_billing_api.py#L131) → [preview_source](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/billing/video_billing_api.py#L50) / [preview_discount](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/billing/video_billing_api.py#L103)|Authenticate workspace access and executable product, [load_video_pricing](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/billing/video_pricing.py#L85), then resolve source and plan; no Job exists.|
|4|[calculate_video_price](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/billing/video_pricing.py#L122)|Calculate integer Tokens from that coherent configuration; rollback the read transaction.|
|5|[submitVideoGeneration](https://github.com/Orientation-CD/wechat_mini_program/blob/88c75c1f15cd65f45c7fb09d560df80430ddc198/src/pkg-features/services/videoGenerationSubmit.ts#L76)|Confirm fee, upload remaining materials, persist the exact body and action key before sending.|
|6|[video_commercial_snapshot](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/billing/video_billing.py#L34) / [admit_workflow_job](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/workflow_admission.py#L3291)|Recalculate under admission authority, compare acknowledgements, then reserve and freeze provenance.|
|7–11|[execute_local_video_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/submissions/workflow_local_video_submission.py#L1132) / [frozen_video_model](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/billing/video_billing.py#L93)|Execute the frozen model and publish verified MP4; coordinate exactly-once settlement/release.|

`preview_source` uses the active same-style template's reference Asset, or validates the uploaded reference's owner, upload role, READY state and immutable identity. Both paths run `_validate_reference_video`: 15,000–120,000 ms inclusive, at most 100 MiB, and an actual measured Video. Missing duration is `ASSET_CONTENT_CHANGED`; a short/long clip returns 422 `VIDEO_REFERENCE_INVALID` with `reason: too_short/too_long`.

`accessible_workspace` protects the chosen billing context. `preview_discount` gives enterprises zero personal discount; a personal preview requires a currently active subscription whose plan allows `video_generation`. The route also checks product activation and an executable video contract. It does not test the wallet balance or member monthly capacity, reserve Tokens, create a Job/outbox, upload output, or call the render pipeline. It rolls back its read transaction before returning. A preview is permission to display a price, not an execution receipt.

The response includes `effective_model`, `mode`, `configuration_version`, `billing_method`, source count/duration, `billable_seconds`, `tokens_per_second`, `base_token_cost`, `discount_percent`, and final `token_cost`. A missing/unpriced model or invalid configuration fails closed as `WORKFLOW_UNAVAILABLE`; the client must not invent a fallback amount.

## Calculate billable seconds

| Rule | Count used by `calculate_video_price` |
| --- | --- |
| Script, `per_second` | Ceiling of UTF-16 script length divided by `script_chars_per_second` |
| Either reference mode, `per_second` | Ceiling of persisted `duration_ms / 1000` |
| Any mode, `per_task` | Its configured positive `fixed_seconds` |

Multiply seconds by the selected model's **stored integer** Tokens/second. Apply the personal discount with upward rounding and a minimum final charge of 10 Tokens: `max(10, ceil(base × (100 - discount_percent) / 100))`. For example, a 15,001 ms reference, rate 8, and zero discount yields 16 × 8 = 128 Tokens. This example is arithmetic, not a promise of current production prices. JavaScript counts UTF-16 units, so the backend deliberately matches that count for emoji and other supplementary characters.

Models are code-owned identities, while monetary rates are database-owned `VideoModelRate` rows. `VIDEO_MODEL_SELECTION_ENABLED=false` forces `Doubao-Seedance-2.0-mini`; a supplied model must still be a recognized identity. The catalog offers only configured/priced choices. Resolution is frozen as `480p`; this calculator does not estimate supplier money or actual generated duration.

## Confirm, reserve and replay

The submit service asks the user to confirm the server breakdown, then writes `expected_token_cost` and `expected_effective_model` into its prepared request. It stores that body and its logical action key before sending to the current `/v1/design-jobs` compatibility entry. The canonical `/v1/workflows` uses the same video admission. Optional fields in the request schema do not imply successful acceptance without a current acknowledgement: new admission compares both fields to the recomputed price.

`video_commercial_snapshot` runs before wallet reservation. A mismatch returns 409 `VIDEO_PRICE_CHANGED` with `current_price`, with no new Job/reservation. The form enters reconfirmation, obtains and confirms a new preview, updates only the acknowledged price/model in the prepared body, persists it, and reuses the logical action. This differs from a transport failure with an unknown receipt: replay the **unchanged** saved body/key and avoid refreshing the price or rotating the key while acceptance is uncertain.

After the match, admission checks wallet spendable balance and enterprise member quota. It freezes `video_time_v1` provenance including rate/configuration version, effective model, rule, count/duration, discount, final price and reference Asset version/hash. The Job, run and operation use this same accepted cost. A repeated accepted key returns its original receipt even if prices or quotas later change; it does not reserve twice.

## Execution and recovery use the accepted facts

`frozen_video_model` validates snapshot identity and integer arithmetic before a new-schema run is executed. Existing `feature_v1` runs retain their compatibility behavior. A later flag, rate or template edit cannot silently change an accepted `video_time_v1` model or price.

A failed local render is not automatically purchased again. The shared explicit retry controller requires eligible persisted failure evidence, released accounting and current authority; a proven-not-sent RETRYABLE case can be accepted as a new generation with the original frozen price/model. Ordinary terminal render failure remains blocked. Replaying the retry receipt does not create a second generation. See the [history/retry chain](/reference/flows/workflow-history-flow).

The subprocess records `runtime_version` only when the installed `jinqiu_e2e` package can report it. Missing provenance stays unknown. Preserve backend commit, image digest, private supplier revision and available runtime version when investigating a model/script mismatch. Client diagnostics redact credentials and signed URLs; protected project reads additionally redact customer fields. Bounded file sharing has a copy fallback. Neither export proves whether a supplier accepted a paid call.

## Read the regression evidence

[tests/test_video_billing_admission.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/tests/test_video_billing_admission.py) covers acknowledgement changes, atomic rejection and accepted replay; [tests/test_video_billing_retry_integration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/tests/test_video_billing_retry_integration.py) covers frozen retry accounting; [tests/test_video_member_quota_integration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/tests/test_video_member_quota_integration.py) covers member-capacity rejection and accepted replay. These are source evidence for the behavior, not a report that this docs update ran the application or a paid supplier.
