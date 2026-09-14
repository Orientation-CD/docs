# Assets & Object Storage

An **asset** is a binary the user (or a provider) contributes to a design job:
an uploaded floor plan image, a recorded conversation audio file, or a document.
The bytes live in S3-compatible object storage; the metadata lives in
PostgreSQL. This page explains the upload-intent → direct-upload → completion
flow, the storage abstraction, and cleanup. Routes are in `app/asset_api.py`;
the transactional logic is in `app/assets.py` and `app/asset_completion.py`;
the storage client is `app/storage.py`.

## Why direct upload?

Uploading large floor plans through the FastAPI process would tie up API
connections and worker memory. Instead the Mini Program uploads **directly to
object storage** using a presigned form the API issues. The API only brokers a
short-lived, constrained upload form and later verifies the result — it never
sees the bytes in the request body.

```
 Mini Program            FastAPI API                  S3 / MinIO / OSS
     │  POST /assets/upload-intents ──►  (validate, mint form)
     │  ◄──── presigned upload form + asset_id
     │  PUT bytes ───────────────────────────────────────►  (stored as temporary version)
     │  POST /assets/{id}/complete ──►  (verify object, promote)
     │  ◄──── final asset metadata
```

## Asset types and roles

Assets are typed rows in the `assets` table with sub-tables per kind:

| Kind | Metadata table | Used for |
| --- | --- | --- |
| image | `images` | uploaded floor plans, rendered provider outputs, report images |
| audio | `audio_assets` | customer conversation recordings fed to `voice_summary` |
| document | `documents` | uploaded reference documents |

Each asset has a `purpose` (what it will be used for) and, when linked to a
job, a `design_job_assets.role` (the expected input role such as floor plan,
mood board, or reference). `asset_display_metadata` holds cached display labels.

## Upload intents

`POST /api/v1/assets/upload-intents` (bearer auth) creates or replays an upload
intent. The caller sends:

```json
{
  "type": "image",
  "purpose": "design_input",
  "role": "floor_plan",
  "original_filename": "my-floorplan.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 1820000
}
```

and a required header:

```
Idempotency-Key: <8..128 chars, chosen by the client>
```

The server (`app/assets.py:create_upload_intent`):

1. Rate-limits per user (`ASSET_UPLOAD_INTENT_RATE_LIMIT_ATTEMPTS` /
   `_WINDOW_SECONDS`).
2. Enforces size/type limits (`MAX_UPLOAD_BYTES`, `MAX_REQUEST_BYTES`,
   `MAX_IMAGE_PIXELS`) and purpose authorization.
3. Creates an `asset_upload_intents` row and a temporary `assets` row.
4. Asks `ObjectStorage` to mint a **presigned upload form** valid for
   `S3_UPLOAD_FORM_SECONDS` (default 900s).
5. Returns the form fields + URL + `asset_id`.

Replaying the same `Idempotency-Key` returns the **same** intent (HTTP 200 on
replay, 201 on create), so a network retry never double-creates an asset.

## Completion

After the Mini Program PUTs the bytes to object storage, it calls:

```
POST /api/v1/assets/{asset_id}/complete
```

`complete_asset_upload` (`app/asset_completion.py`):

1. Rate-limits per user (`ASSET_UPLOAD_COMPLETION_RATE_LIMIT_*`).
2. Verifies the object actually exists in storage and that its size/type match
   the declared intent.
3. For images, decodes and validates pixels (`MAX_IMAGE_PIXELS`); for audio,
   validates the recording format.
4. Promotes the temporary asset to a finalized, usable asset row.
5. If the upload was stored as a separate temporary version, deletes that
   version (best-effort; failures are logged and retried by cleanup).

Only completed assets can be referenced by a design job.

## Listing and reading

`GET /api/v1/assets` lists the caller's assets (paginated). Admin paths can
list across users. Preview URLs are signed on demand
(`S3_PRESIGN_SECONDS`, default 3600s) — the API never serves bytes itself.

## Storage abstraction (`app/storage.py`)

`ObjectStorage` is the backend-agnostic interface the rest of the code uses;
implementations are selected by `STORAGE_BACKEND`:

| Setting | Local | Production |
| --- | --- | --- |
| `STORAGE_BACKEND` | `s3` (Compose MinIO overlay) | `s3` |
| `S3_BUCKET` | isolated local bucket | private cloud bucket |
| `S3_ENDPOINT` | MinIO | e.g. `https://s3.oss-cn-chengdu-internal.aliyuncs.com` |
| `S3_PRESIGN_ENDPOINT` | MinIO | public OSS endpoint for browser/mini-program URLs |
| `S3_FORCE_PATH_STYLE` | true (MinIO) | false (OSS virtual-hosted) |
| `S3_SIGNATURE_VERSION` | `s3v4` | `s3` (OSS compatibility requirement) |

The storage client supports `put`, `get`, presigned upload forms, presigned
reads, multipart (`S3_MULTIPART_THRESHOLD_BYTES`,
`S3_TRANSFER_CHUNK_BYTES`), and server-side encryption
(`S3_SERVER_SIDE_ENCRYPTION=AES256`). Report assets are namespaced by workspace
under `REPORT_WORKSPACE_ASSET_PREFIX` with a shared `REPORT_GLOBAL_ASSET_PREFIX`.

## Temporary lifecycle & cleanup

Uploads that are never completed, provider staging artifacts, and old report
results are cleaned by periodic worker jobs:

| Setting | Default | Meaning |
| --- | --- | --- |
| `ASSET_TEMPORARY_RETENTION_SECONDS` | 259200 (3 d) | how long an un-completed upload stays |
| `ASSET_CLEANUP_SCHEDULE_MINUTE` | 0 | minute-of-hour the cleanup runs |
| `ASSET_CLEANUP_BATCH_SIZE` / `_MAX_BATCHES` | 100 / 10 | batches per run |
| `PROVIDER_STAGING_RETENTION_SECONDS` | 259200 | provider-staged input/output retention |
| `REPORT_RESULT_CLEANUP_MINIMUM_AGE_SECONDS` | 3600 | don't delete report results younger than this |

`process_cleanup_temporary_assets` and `process_cleanup_provider_staging_artifacts`
run on **both** worker pools; `process_cleanup_report_result_artifacts` runs on
the poll worker (see [Architecture](/backend/architecture)).

## Safety notes

- Upload intents reject oversized or disallowed content types up front, so the
  client fails fast instead of uploading a rejected blob.
- Object keys never include user-supplied filenames verbatim; names are
  sanitized and namespaced by workspace.
- Preview/reading URLs are presigned and time-limited; the API itself does not
  proxy binary bytes.

## Read next

- [Design Jobs](/backend/design-jobs) — how completed assets become job inputs.
- [Reports](/backend/reports) — how report library objects are read from storage.
