# Asset Upload Flow (End-to-End)

This is the full call chain for **uploading an image** — from the user picking a photo
to the asset being `READY` in object storage. The defining property: **the backend
never proxies image bytes**. The mini program uploads directly to object storage using a
presigned form.

## Part 0 — User picks a photo (frontend)

```
User picks an image (or draws a mask)
        │
        ▼
Frontend src/pkg-features/repositories/designAssets.ts
  stageDesignImages(...)
  for each required role (image / masked_image / reference_image):
    1. read local metadata (getFileInfo): size, type
    2. build a logical file id + idempotency key (services/idempotency.ts)
    3. POST /v1/assets/upload-intents
```

## Part 1 — Upload intent (backend signs a form)

```
POST /v1/assets/upload-intents
  Authorization: Bearer <access_token>
  Idempotency-Key: <8..128 chars>
  body: { type: "IMAGE", purpose: "DESIGN_JOB_INPUT",
          role: "image", original_filename, content_type, size_bytes }
        │
        ▼
FastAPI → app/asset_api.py: create_asset_upload_intent  (router prefix /v1/assets)
  1. get_current_user
  2. rate limit (asset-upload-intent-user,
       ASSET_UPLOAD_INTENT_RATE_LIMIT_ATTEMPTS / WINDOW_SECONDS)
  3. create_upload_intent(...)
       • validate type/purpose/role/size (MAX_UPLOAD_BYTES, MAX_IMAGE_PIXELS)
       • idempotency: replay an existing matching intent (200, not 201)
       • create asset_upload_intents + assets row:
           status = PENDING_UPLOAD, object_key = server-generated
       • build an S3 POST policy (presigned form):
           url = S3_PRESIGN_ENDPOINT + "/" + bucket
           fields = { key, policy, x-amz-signature, ... }
           expires in S3_UPLOAD_FORM_SECONDS
  4. return AssetUploadIntentResponse
     { asset_id, type, purpose, role, status: "PENDING_UPLOAD",
       upload: { method: "POST", url, fields, expires_at } }
```

## Part 2 — Direct upload (frontend → object storage)

```
Frontend services/assets.ts → directUpload(file, form)
  uni.uploadFile({
    url: form.url,          // object storage, NOT the backend
    name: "file",
    formData: form.fields,  // signed fields
    onProgressUpdate → progress bar
  })
        │
        ▼
Object storage verifies the signed policy, stores the object,
returns 2xx on success.
```

The backend is **not in the data path** — this keeps large images out of API request
memory and off the API network path. `httpUrl.ts` / `validateUploadUrl` constrains the
upload URL to HTTPS (or dev loopback/LAN).

## Part 3 — Complete (backend finalizes)

```
POST /v1/assets/{asset_id}/complete
        │
        ▼
FastAPI → app/asset_api.py → app/asset_completion.py
  1. get_current_user
  2. rate limit (asset-upload-completion-user,
       ASSET_UPLOAD_COMPLETION_RATE_LIMIT_ATTEMPTS / WINDOW_SECONDS)
  3. load the pending intent (must be PENDING_UPLOAD)
  4. verify the object exists in storage with the expected size/version
  5. capture content_sha256, object_etag, width, height (image_validation)
  6. mark assets.status = READY
  7. return AssetCompletionResponse
     { asset_id, type, purpose, role, status: "READY",
       content_type, size_bytes, content_sha256, object_etag,
       width, height, expires_at }
```

If the asset was already `READY` (idempotent retry), the intent endpoint returns
`READY` without a new form and the complete call succeeds again.

## Part 4 — The asset feeds a design job

The staged `asset_id`s are then passed in the design-job submission
(`assets: [{ role, asset_id }]`). When the job is created:

- The assets are **bound** via `design_job_assets` and **protected** from temp-asset
  cleanup for the job's lifetime.
- The submit worker resolves verified, version-bound object URLs from storage when
  composing the normalized `ProviderRequest` inputs.

## Cleanup & retention

- Uploaded inputs are **temporary**: they carry `asset_expires_at`
  (`ASSET_TEMPORARY_RETENTION_SECONDS`).
- The poll worker cron `cleanup_expired_temp_assets` deletes expired
  `PENDING_UPLOAD` / unconsumed `READY` assets in batches (bounded by
  `ASSET_CLEANUP_BATCH_SIZE` / `ASSET_CLEANUP_MAX_BATCHES`).
- Provider-staged artifacts have their own namespace: `cleanup_provider_staging` reaps
  only expired exact versions under `PROVIDER_STAGING_RETENTION_SECONDS`, with a
  durable Redis cursor so retained first-page objects cannot starve cleanup.
- A design job **reserves** its inputs so they survive until job completion.

## Security properties in this flow

| Property | Where enforced |
| --- | --- |
| Server-generated object keys | backend (client filenames sanitized) |
| Time-limited signed upload | presigned POST policy (`S3_UPLOAD_FORM_SECONDS`) |
| No backend in the data path | direct upload to storage |
| Client upload URL validation | frontend `validateUploadUrl` (HTTPS/loopback) |
| Size/pixel limits | backend intent validation + `image_validation` |
| Versioned bucket | MinIO `mc version enable` / OSS versioning |

## Related call chains

- [Design Job Lifecycle](/reference/flows/design-job-lifecycle) — Part 0 calls this flow.
- [Payment Flow](/reference/flows/payment-flow) — the same JWT/protection model.
