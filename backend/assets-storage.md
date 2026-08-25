# Assets & Object Storage

Every image in the system — user uploads, generated renderings, report assets,
legal documents — lives in **S3-compatible object storage**. This page explains
the asset model, the upload path, and how the backend signs and verifies
storage operations.

## Storage backends

| Environment | Backend | `STORAGE_BACKEND` |
| --- | --- | --- |
| Local / dev | MinIO | `s3` (endpoint = MinIO) |
| Production | Aliyun OSS | `s3` (endpoint = OSS) |

The abstraction is `app/storage.py` → `ObjectStorage`, which wraps an S3 client
with **two endpoint personalities**:

- **`S3_ENDPOINT`** — server-side endpoint (backend & workers talk here).
- **`S3_PRESIGN_ENDPOINT`** — the endpoint embedded in **presigned URLs** handed
  to the mini program / browser (must be publicly reachable, HTTPS).

## The asset model

An **asset** is a metadata row in PostgreSQL pointing at one object in storage:

| Field | Meaning |
| --- | --- |
| `id` | UUID |
| `type` | `IMAGE` (the current type) |
| `purpose` | `DESIGN_JOB_INPUT`, result, report asset, legal doc |
| `role` | For inputs: `image` / `masked_image` / `reference_image` |
| `status` | `PENDING_UPLOAD` → `READY` |
| `object_key` | Storage key |
| `content_type`, `size_bytes`, `content_sha256`, `object_etag` | Integrity metadata |
| `width`, `height` | Image dimensions (after completion) |
| `asset_expires_at` | For temporary inputs (retention window) |

## Upload path (frontend uploads directly)

The backend **never proxies image bytes**. The flow is:

```
Mini program                          Backend                          Object storage
    │ POST /api/v1/assets/upload-intents │                                 │
    ├───────────────────────────────────►│ 1. validate + create asset      │
    │ ◄──────────────────────────────────┤    (PENDING_UPLOAD)             │
    │ { asset_id, upload: { url, fields, expires_at } }                    │
    │                                    │                                 │
    │ POST <presigned upload URL>  ──────┼────────────────────────────────►│ 2. direct upload
    │    (multipart, signed fields)      │                                 │
    │                                    │                                 │
    │ POST /api/v1/assets/{id}/complete  │                                 │
    ├───────────────────────────────────►│ 3. verify object + finalize     │
    │ ◄──────────────────────────────────┤    → READY (sha256, etag, dims) │
    │ { content_type, size_bytes, ... }  │                                 │
```

### 1. Upload intent — `POST /api/v1/assets/upload-intents`

The mini program requests permission to upload an asset:

```json
{
  "type": "IMAGE",
  "purpose": "DESIGN_JOB_INPUT",
  "role": "image",
  "original_filename": "room.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 123456
}
```

The backend (`asset_api.py`):

- Validates the request (type/purpose/role/size against
  `MAX_UPLOAD_BYTES`/`MAX_IMAGE_PIXELS`).
- Creates/returns the asset row (`PENDING_UPLOAD`), idempotently.
- Builds a **presigned POST form** (S3 POST policy) with the object key and
  signed fields, valid for `S3_UPLOAD_FORM_SECONDS`.
- Returns `{ asset_id, upload: { method, url, fields, expires_at } }`.
- If the asset already exists and is `READY`, returns `READY` without a new
  form (idempotent retry).

### 2. Direct upload

The mini program uploads the file **directly to storage** with
`uni.uploadFile` using the presigned form. The backend is not in the data path.

### 3. Complete — `POST /api/v1/assets/{id}/complete`

The mini program confirms the upload. The backend:

- Verifies the object exists in storage and matches expected size.
- Computes/verifies `content_sha256` and captures `object_etag`, `width`,
  `height`.
- Marks the asset `READY`.

## Temporary input retention

Uploaded design inputs are **temporary**: they have `asset_expires_at` and are
deleted by the cron `cleanup_expired_temp_assets` if not consumed by a design
job in time. **Reserving** a design job binds its input assets so they survive
until job completion; unused temp assets are cleaned up automatically.

## Design-job asset binding

When a design job is created, its input assets are **bound** to the job
(`design_job_asset_finalization.py`). At completion:

- The provider **result image** is written to storage (workers upload it).
- The result asset is attached to the job (with dimensions).
- The input assets may be freed / retained per policy.

## Reading results

- Result/report images are served via **short-lived presigned GET URLs**
  (`url_expires_at`), so clients always have time-boxed access and nothing is
  publicly readable without a signature.
- `PROVIDER_OUTPUT_HOSTS` restricts which hosts workers may fetch provider
  results from (anti-SSRF).

## Report assets & legal documents

- Report system assets (covers, mood boards, renderings) live under
  configurable base paths (`REPORT_GLOBAL_ASSET_PREFIX`, `REPORT_WORKSPACE_ASSET_PREFIX`).
- **Legal documents** (privacy policy, terms) are objects too; they can be
  served from a public HTTPS origin (`LEGAL_DOCUMENTS_PUBLIC_BASE_URL`) or from
  the private bucket.

## Security properties

- Presigned URLs are **time-limited** and scoped to one object.
- Direct upload means the backend never handles large image payloads in
  request memory.
- Upload URL validation (HTTPS, registered domains) happens on the client too.
- Storage keys are server-generated; client filenames are sanitized.
- Anti-SSRF: provider result fetches are restricted to allow-listed hosts.

## Full call chain

See [Asset Upload Flow](/reference/flows/asset-upload-flow).

## Next steps

- [Design Jobs](/backend/design-jobs) — how assets feed jobs.
- [Reports](/backend/reports) — report asset handling.
