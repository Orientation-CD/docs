# Assets and durable input storage

An Asset UUID identifies verified content. Its object key, exact version, ETag and SHA-256 are server authority; signed URLs are temporary capabilities. The supported modalities now include Image, Audio, Document and Video. Read the [full upload and archive chain](/reference/flows/asset-upload-flow) before changing upload or cleanup code.

## File → verified Asset → owned execution input

| Boundary | What has actually been proved | State/effect |
| --- | --- | --- |
| `POST /v1/assets/upload-intents` | Authenticated declaration of role, MIME, size and one action key | Returns exact multipart POST fields; bytes are not uploaded yet |
| Storage multipart POST | Object storage accepted bytes under the signed policy | Does not complete the Asset |
| `POST /v1/assets/{asset_id}/complete` | Actual content, decoded metadata and exact object identity verified | Ordinary customer input becomes READY with persisted expiry |
| Admission preflight | Source version copied and reverified at private durable input locator | Same Asset ID, archive receipt COMPLETED; still READY until accepted |
| Final admission transaction | Exclusive ownership, role/pins, execution and financial checks all pass | ACTIVE, no expiry, immutable execution pins and Job ownership commit together |

Send **only the returned multipart form fields** to `upload.url`; never attach the application's Bearer token to that storage request. Complete before using an Asset ID. An exact intent replay may return `upload:null` when already complete; it does not authorize changing bytes.

Image roles include `image`, `masked_image` and `reference_image`; audio uses `recording`; customer append PPTX uses `attachment`. Same-style custom clips use type `VIDEO`, purpose `DESIGN_JOB_INPUT`, role `reference_video`, at most 100 MiB and 120 seconds. The public port inventory is explained in [video](/backend/video). Admin reference media uses a separate authorized purpose.

## Archive before freezing

`asset_input_archival.py` records source identity and destination under `design-jobs/inputs/{asset_id}/`, commits a bounded claim, then performs versioned copy/hash verification without holding DB locks. Publication fences the claim and moves the existing Asset locator; content and UUID do not change. The final admission transaction rechecks this receipt before activating the input and freezing physical pins.

A completed archive receipt is not an accepted task. If later Feature/quota/funds validation fails, the Asset remains READY and expiring; the same valid input/receipt can be reused while eligible. Lost copy acknowledgement is reconciled against the recorded destination; deleting a receipt to force another copy breaks this protection. `ASSET_ARCHIVE_IN_PROGRESS` is a bounded conflict; `ASSET_STORAGE_UNAVAILABLE` means restore storage and retry the same logical request. Changed exact content requires a new valid input or restoration of the recorded version.

Borrowed ACTIVE inputs and already accepted execution pins are not rewritten. Result reuse creates an independent temporary input via `/v1/assets/{source_asset_id}/design-input-copies`, then the new request owns its own archive/activation lifecycle. A new report cannot consume another Job's owned append upload.

## Retention, cleanup and repair

| Object family | Retention authority |
| --- | --- |
| Temporary direct upload/copy | Persisted Asset expiry, upload intent and copy claim |
| Canonical owned input | Owning Job, Operation pins and archive receipt/tombstone |
| Published output | Frozen output identity and retained consumer references |
| Prompt reference clip/poster | Active template references plus protected Asset metadata |

Cleanup must preserve both old source evidence and canonical destination through copy quiescence. Do not apply a temporary-upload lifecycle rule to `design-jobs/inputs/`. Public Asset list/delete remain administrator APIs.

Historical completed inputs have an explicit dry-run-first repair command:

```bash
python -m app.assets.input_asset_repair --job-id <job-uuid> --asset-id <asset-uuid>
```

Use the target environment's existing credentials/settings. The command neither scans targets nor starts services. Review `eligible`, then use `--apply` only for the intended pair. It preserves executed pins, Job status, outputs and charges; replay can return `already_repaired`. Ambiguous ownership is an operator decision, not permission to choose a consumer. See [operations and recovery](/deploy/production) and the pinned storage runbook for exact eligibility/errors.

## Storage deployment boundary

`S3_ENDPOINT` is the server endpoint; `S3_PRESIGN_ENDPOINT` must be reachable from the phone/browser. MinIO uses `s3v4`; the verified OSS compatibility path uses `s3`. Buckets stay private except explicitly published legal content. Versioning, CORS, HEAD/GET/copy/delete permissions and exact version retention must support the full archive lifecycle, not just successful direct upload.

---

Source evidence · backend `e59716c8`: [app/assets/asset_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_api.py) · [app/assets/asset_completion.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_completion.py) · [app/assets/asset_input_archival.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_input_archival.py) · [documents/ASSET_STORAGE_OPERATIONS.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/ASSET_STORAGE_OPERATIONS.md).
