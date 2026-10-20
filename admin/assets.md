# Asset administration

`/admin/assets` searches authorized Asset metadata and generates access URLs. It is the administrator file-discovery surface; customer `/v1/assets` list/delete operations likewise require administrator authorization.

## Find and inspect

Use the keyword search and available filters, then inspect Asset ID, type, purpose, status, visibility, filename, size and timestamps. Image results have authenticated thumbnail/enlarge controls; other objects can be opened through the supported object-view flow.

The URL form offers a presigned URL or a public URL. **Public URL is available only for an already-public Asset**; selecting it does not change visibility. Signed URLs expire and should be regenerated when needed. Never paste upload fields or signed private URLs into durable public documentation.

Admin image upload handlers use the same intent → direct multipart POST → completion verification as customer inputs, with the administrator purpose. Legal publication has its own [Legal Documents](/admin/legal-documents) workflow and immutable metadata.

## Removal

The Remove Asset confirmation covers the Asset and its stored object versions. The server rejects active retained references, incorrect state and unavailable storage. Do not manually delete an object retained by a Workflow, report, logo/gallery reference or legal acceptance.

A result reused as a design input is an independently copied Asset with its own lifecycle; deleting one identity is not permission to remove every related version. Use task cleanup for task-owned results. See [Assets and storage](/backend/assets-storage) for exact-version integrity and retention.

---

Source evidence · backend `b13cc566`: [app/admin/assets.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/assets.py) · [app/templates/admin/assets.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/assets.html) · [app/assets/asset_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/assets/asset_api.py).
