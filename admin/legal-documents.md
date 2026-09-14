# Legal Documents

The Legal Documents page at `GET /admin/legal-documents` (template `app/templates/admin/legal_documents.html`) publishes the Terms of Service and Privacy Policy versions that customers must accept, and tracks how many users have accepted each version.

## Document types

There are exactly two legal document types (`LegalDocumentType`):

| Type | Code | Purpose |
| --- | --- | --- |
| Terms of Service | `terms` | The product terms. |
| Privacy Policy | `privacy` | The privacy policy. |

Each type can have **one current version** active at a time; older versions are retained for acceptance history.

## Upload a new version

Uploads use the same two-step direct-to-storage flow (upload intent → PUT → complete). Submit the metadata via `POST /admin/legal-documents/upload-intents` and finalize with `POST /admin/legal-documents/{id}/complete`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| Document type | select | Yes | `terms` or `privacy`. |
| Version | text | Yes | Version label; must be unique per document type. Duplicate version returns `LEGAL_DOCUMENT_VERSION_EXISTS`. |
| Locale | text | Yes | BCP-47 locale, e.g. `zh-CN`, `en`. |
| Title | text | Yes | Display title. |
| Effective at | datetime | Yes | When the version becomes effective. |
| File | file | Yes | UTF-8 plain-text content, max **1 MiB** (`LEGAL_DOCUMENT_MAX_BYTES = 1024*1024`, content type `text/plain; charset=utf-8`). |
| Set as current on upload | checkbox | No | If checked, this version immediately becomes the active one. |

## The documents table

| Column | What it shows |
| --- | --- |
| Type | terms / privacy. |
| Version | Version label. |
| Locale | Locale. |
| Title | Document title. |
| Effective at | Effective datetime. |
| Accepted | How many users accepted this version. |
| Current | Badge marking the active version. |

## Per-row actions

### Set current (`POST /admin/legal-documents/{id}/current`)

Promotes this historical version to the current one. Customers then must accept the newly active version. Only one current per document type at a time.

### View file (`GET /admin/legal-documents/{id}/file`)

Streams the stored document text so you can review exact wording before promoting.

### Remove (`POST /admin/legal-documents/{id}/remove`)

Removes a version. You can only remove a version that is **not current** and that **no user has accepted** — accepted and current documents are protected so the legal acceptance trail stays intact.

## Acceptance tracking

Every acceptance is recorded (`LegalDocumentAcceptance`). The "Accepted" count per version answers "how many users are on this version?" and surfaces when you publish a new version (so you can see how long enforcement takes).

## Publishing workflow

1. Upload the new version (optionally "set current" immediately).
2. Review it via **view file**.
3. If not set on upload, **set current** when ready.
4. Monitor the Accepted count as users re-accept on next sign-in.
