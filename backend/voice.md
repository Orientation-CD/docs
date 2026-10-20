# Voice summaries and phone file upload

`voice_summary` runs 1–3 completed recording Assets through the shared multimodal text Operation. It produces a reusable Markdown Document, with inline text and signed Asset metadata in the standard typed output. Source recordings are data, not instructions.

## Prepare recordings

Create ordinary direct-upload intents with `type: AUDIO`, `purpose: DESIGN_JOB_INPUT`, `role: recording`. Supported media are MPEG, WAV, AAC and M4A types listed in the [REST contract](/reference/rest-api). Each recording is bounded to 25,000,000 bytes and a verified duration of 120 minutes; completion measures content rather than trusting the filename.

Submit the exact voice Workflow port/role structure to `/v1/workflows`, preserving recording order and an explicit workspace. Poll the returned URL. The accepted prompts, inputs and execution configuration remain frozen for retries.

## Phone file handoff

When native Mini Program file access cannot select an existing phone recording, the backend can issue a restricted browser session:

1. The authenticated client creates `/v1/voice-upload-sessions` with `workspace_id` and `available_slots` (1–3).
2. Open the returned `upload_page_url`. A short-lived handoff code is exchanged for a restricted browser cookie and CSRF token.
3. The browser requests per-slot upload intents, posts directly to storage and completes its linked Assets.
4. The original authenticated client polls the session and retrieves `ready_assets`, then submits the ordinary voice Workflow.

The browser session cannot browse the user's account or submit arbitrary tasks. Origin, cookie and CSRF checks apply. Upload, intent-issuance and retrieval deadlines are distinct; a retrieval window does not extend the upload deadline. Use the returned limits and timestamps rather than inventing client lifetime rules.

## Enable and diagnose

The optional flow requires `VOICE_UPLOAD_ENABLED`, an appropriate public HTTPS origin, Secure browser cookies in production, and upload-form/Asset retention windows compatible with the session deadlines. Session state is backed by Redis. Storage/Redis outages are recoverable service errors, not evidence that no files exist.

A successful summary can advance an ordinary Project to requirements captured through the standard completion rule. See [Projects](/backend/projects), [Assets](/backend/assets-storage) and [configuration](/reference/configuration).

---

Source evidence · backend `b13cc566`: [app/assets/voice_upload_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/assets/voice_upload_api.py) · [app/assets/voice_upload_sessions.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/assets/voice_upload_sessions.py) · [app/workflows/operations/summary/workflow_voice_definition.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/summary/workflow_voice_definition.py).
