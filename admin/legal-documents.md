# Legal documents and acceptance evidence

`/admin/legal-documents` publishes immutable Terms and Privacy text. Current documents are a prerequisite for customer registration/login consent; an empty library is not a valid way to bypass consent.

## Publish a version

Choose document type (`terms` or `privacy`), unique version metadata, locale, title, effective time **in UTC**, and reviewed UTF-8 plain-text file up to **1 MiB**. The browser creates an upload intent, posts the file directly and completes it. The optional checkbox makes the new version current immediately.

Content and metadata cannot be edited after publication. Correct a document by publishing a new version. Preview the stored text and verify both current documents for the locale used by customers.

## Select and retain

Stored rows show version/effective/published times, Asset identity and acceptance count. A noncurrent version can be selected as current through the corresponding form. Current versions cannot be removed; versions already accepted by users remain evidence and are also protected from deletion.

The customer endpoint `/v1/legal-documents/current` provides current immutable IDs and URLs with cache validators. Content is anonymously readable through the public HTTPS content route when the Asset bucket remains private; a separately configured public legal origin needs verified anonymous delivery. Do not substitute an expiring private presigned URL for the legal contract's stable content URL.

Changing the current selection updates what subsequent consent flows must accept; it does not rewrite historical acceptances. Storage publication and metadata selection are distinct states, so a file upload alone does not guarantee both Terms and Privacy are ready. See [authentication](/backend/authentication) and [storage](/backend/assets-storage).

---

Source evidence · backend `e59716c8`: [app/admin/assets.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/assets.py) · [app/identity/legal_documents.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/identity/legal_documents.py) · [app/templates/admin/legal_documents.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/legal_documents.html).
