# Prompt templates and same-style reference media

`/admin/prompts` manages the database-authoritative prompt library: search, create/edit, activation, removal and complete JSON export/import. A template's stable name and purpose are contracts; changing them can change which client discovery set sees it.

## General and same-style templates

| Concern | General template | Same-style video template |
| --- | --- | --- |
| Purpose | No purpose for general discovery | `same_style_video` |
| Customer discovery | `GET /v1/prompt-templates` | Same route with `?purpose=same_style_video` |
| Composition | Optional system/configurable/negative sections, at least one valid section | Submission runtime requires only `称呼`, no system/negative prompt and valid txt scene structure |
| Reference media | Cleared when purpose is not same-style | Required reference clip; optional poster |
| Reserved name | Stable application key | `__user_reference__` cannot be created/imported as a real template |

Field rows use exact `key | example` definitions and must agree with placeholders. Accepted tasks freeze composition/media identity; editing or importing later does not change accepted execution or frozen retries.

## Prepare a usable same-style template

1. Select the same-style purpose and a stable display name.
2. Upload reference clip and optional poster through the form's reference-media upload controls. Clip becomes a verified Video Asset, poster an Image; both use `ADMIN_REFERENCE_MEDIA`, not customer `DESIGN_JOB_INPUT`.
3. Keep the returned private reference key in the form; do not paste a temporary signed playback URL as a durable key. Save resolves the reference Video Asset FK used during admission.
4. Author a valid configurable txt script with field exactly `称呼`, no system/negative text, at most15,000 rendered characters and one `【人物】` matching the selected salutation in every `【场景N】` scene.
5. Confirm discovery returns preview metadata, then validate a controlled submission against the intended environment/provider policy. Preview alone creates no Job and reserves no Tokens.

The current admin save layer permits empty same-style prompt sections, but admission still calls `render_video_script` and rejects empty/invalid body. **Saving successfully is not proof a template can admit work.** Use the complete valid definition above; custom uploaded-reference mode is the separate no-template/no-script-pin branch. The actual boundary is recorded in [integration status](/reference/integration-status).

## Upload and preview chain

The form requests an authorized upload intent, sends exact multipart fields to storage, then completes verified content. `admin_prompt_reference_media_intent` and `admin_prompt_reference_media_complete` require admin session and CSRF. Completion returns Asset ID, canonical object key, MIME and state. `list_prompt_templates` filters exact purpose; `prompt_template_response` signs reference clip/poster URLs and can return null when signing is unavailable. Refetch expired preview capabilities.

## Complete-library import is replacement

Export a backup first. Import validates the complete archive (at most1,000,000 bytes), requires replacement confirmation, locks prompt management and atomically replaces all definitions. It is not an incremental merge or a UI undo operation. Preserve existing entries/edits in the archive; importing an eight-template seed alone discards other library entries.

Version2 export retains purpose and reference keys. Import rejects the reserved custom-reference name before replacing anything, clears media for non-same-style purpose and resolves template reference Video IDs. Missing seed templates can be created at startup without overwriting deployed values; editing initial JSON does not overwrite an existing authoritative database library. Personal presets remain separate `/v1/prompt-presets` data. Report execution configuration belongs to [Workflows](/admin/workflows).

---

Source evidence · backend `e59716c8`: [app/admin/prompts.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/prompts.py) · [app/admin/assets.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/assets.py) · [app/prompts/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/prompts/api.py) · [app/workflows/video_template_rules.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/video_template_rules.py) · [app/templates/admin/prompt_form.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/prompt_form.html).
