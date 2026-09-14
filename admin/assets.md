# Asset Management

The Assets section at `GET /admin/assets` (template `app/templates/admin/assets.html`) lists files stored in object storage — images, documents, audio — and lets you upload admin images, generate access URLs, and remove objects.

## Search-first

This page is **search-first**: no results are shown until you type a query. Use the search box to filter by title, file name, or asset id. Results paginate at 50 per page.

## Asset types & statuses

| Type (`AssetType`) | Meaning |
| --- | --- |
| `IMAGE` | An image (input, reference, mask, or result). |
| `DOCUMENT` | A document file. |
| `AUDIO` | An audio recording. |

| Status (`AssetStatus`) | Meaning |
| --- | --- |
| `PENDING_UPLOAD` | An upload intent created but not yet completed. |
| `READY` | File uploaded, not yet bound to a job. |
| `RESERVED` | Reserved by a pending/in-flight job. |
| `ACTIVE` | In active use by a completed job. |

Visibility is `PRIVATE` (default) or `PUBLIC`.

## The assets table

| Column | What it shows |
| --- | --- |
| Type | IMAGE / DOCUMENT / AUDIO badge. |
| Title | Admin-assigned or descriptive title. |
| Visibility | Private / public. |
| Dimensions / duration | Image width×height, or audio length. |
| Size | File size. |
| Created | Upload time. |
| Asset ID | Internal UUID. |

Each row offers thumbnail, URL, and remove actions.

## Uploading an admin image

Uploads are a **two-step direct-to-storage** flow driven by `admin.js`:

1. **Create an upload intent** — `POST /admin/assets/upload-intents` with the desired title. The server returns an object key and a signed upload target.
2. **PUT the file directly to object storage** from the browser.
3. **Complete the upload** — `POST /admin/assets/{id}/complete` so the server records the object as ready and extracts metadata (dimensions, size, content type).

| Form field | Type | Required | Description |
| --- | --- | --- | --- |
| Title | text | Yes | Label for the asset. |
| Image | file | Yes | The image file to upload. |

## Per-row actions

### Get access URL (`POST /admin/assets/{id}/url`)

Generates a usable URL for the object. Depending on storage configuration this is either a presigned `GET` URL or a public URL; the row shows the result you can open or copy.

### Thumbnail (`GET /admin/assets/{id}/thumbnail`)

Redirects to (or streams) a thumbnail rendition of the image for quick preview without opening the full object.

### Remove (`POST /admin/assets/{id}/remove`)

Removes the asset. Objects still reserved/active on a job are protected; you can only clean up assets no longer in use.

## Notes

- Admin uploads are tagged as `ADMIN_IMAGE` purpose; customer job inputs use other purposes (`DESIGN_JOB_INPUT`, `LEGAL_DOCUMENT`).
- Never expose private asset URLs publicly; use presigned URLs and respect their expiry.
