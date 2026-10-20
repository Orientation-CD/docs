# Assets and object storage

An Asset UUID is the durable identity for a verified image, audio recording or document. Storage keys, hashes, ETags and exact versions remain server-managed; signed URLs are temporary access capabilities.

## Direct upload

1. `POST /v1/assets/upload-intents` with Bearer auth and `Idempotency-Key` declares type, purpose, role, filename, MIME and byte count.
2. Send the file with **exactly the returned multipart POST form fields** to `upload.url`. Do not add the application bearer token to the storage request.
3. `POST /v1/assets/{asset_id}/complete` verifies the object identity and decoded content, then returns the usable Asset state.
4. Reference the completed UUID with the correct Workflow port/role. Merely receiving storage HTTP success does not complete the Asset.

```json
{
  "type": "IMAGE",
  "purpose": "DESIGN_JOB_INPUT",
  "role": "image",
  "original_filename": "floorplan.png",
  "content_type": "image/png",
  "size_bytes": 184223
}
```

Ordinary design inputs use `IMAGE`, `AUDIO` or supported customer PPTX `DOCUMENT`; roles include `image`, `masked_image`, `reference_image`, `recording` and `attachment`. Purpose/type/role combinations are validated. Admin catalog uploads and legal documents use separate authorized purposes.

An exact replay returns the same intent. After completion, a replay can return `upload: null`. Expired/changed objects need a new intent; incomplete transfer and concurrent state conflicts have documented bounded retries. Full byte/media limits are in [REST API](/reference/rest-api).

## Reuse, access and deletion

To reuse an owned completed image result, call `/v1/assets/{source_asset_id}/design-input-copies` with its own idempotency key. The independent temporary input has a separate object key and deletion lifecycle. Workflow outputs are finalized immutable Assets before publication.

Authenticated owners can query their permitted Asset status. Public Asset listing/deletion APIs require administrator authorization; they are not an unrestricted customer file manager. [Admin Assets](/admin/assets) also enforces retained references before deletion.

## Storage configuration

`S3_ENDPOINT` is the server endpoint; `S3_PRESIGN_ENDPOINT` must be reachable from the actual browser/phone. Use MinIO `s3v4`; the verified Alibaba OSS compatibility deployment uses `s3`. Keep buckets private except explicitly published immutable legal content. Exact-version retention, CORS and lifecycle rules must preserve pinned Workflow inputs/results.

Cleanup reconciles temporary Assets, copied object versions, provider staging and unpublished report/PPTX/video reservations. It must not delete a version still retained by an active task. See [configuration](/reference/configuration), [local stack](/deploy/local-stack) and the pinned operations contract below.

---

Source evidence · backend `b13cc566`: [app/assets/asset_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/assets/asset_api.py) · [app/assets/asset_completion.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/assets/asset_completion.py) · [documents/ASSET_STORAGE_OPERATIONS.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/ASSET_STORAGE_OPERATIONS.md).
