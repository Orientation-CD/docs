# Asset administration

`/admin/assets` is the administrator discovery and removal surface for verified Assets. Customer `/v1/assets` list/delete endpoints also require administrator authority; they are not a user's unrestricted gallery.

## Find an identity, not just a URL

Search/filter by the available metadata and inspect Asset ID, subtype (Image/Audio/Document/Video), purpose, state, owner, filename, size and times. Signed URLs expire. A public URL is available only for an already-public object; asking for one does not change visibility. Never copy private upload forms or signed capability URLs into durable documentation.

Current template reference clips are real Video Assets and posters are Images. The prompt form's reference-media intent→storage multipart POST→complete flow uses admin session/CSRF and the `ADMIN_REFERENCE_MEDIA` purpose. Completion validates bytes and returns a canonical private key for the template. Customer custom-reference uploads instead use the customer's Video input role. See [Prompts](/admin/prompts) and [video](/backend/video).

## Understand the state before removing anything

| Observation | Meaning |
| --- | --- |
| READY + archive receipt COMPLETED | Private input bytes prepared; final admission may not have accepted a Job |
| ACTIVE/no expiry + Job ownership/pins | Accepted durable input; retained execution evidence controls removal |
| RESERVED historical original | May require explicit completed-input eligibility check; never force ACTIVE with SQL |
| Separate result-copy Asset | Independent new input lifecycle, not a second reference to delete indiscriminately |

New direct inputs are archived before admission freezes physical identity. The same Asset ID can move to a canonical `design-jobs/inputs/` locator while old executed pins or receipt cleanup still retain source evidence. Inspect both logical ownership and exact key/version references.

## Removal and recovery

The Remove Asset confirmation covers the selected Asset and allowed stored versions. The service rejects active retained inputs/outputs, operation pins, copy/archive claims, template reference clips, legal versions and other protected consumers. Use task-owned cleanup for task inputs/results and [Legal Documents](/admin/legal-documents) for legal publication, not manual bucket deletion.

A transient storage/lease conflict is not permission to erase receipts. Keep copy claims and source/destination identities through quiescence; reconciliation owns uncertain writes. Historical completed-input repair is an explicit dry-run-first command described in [Assets and storage](/backend/assets-storage), not an automatic admin bulk operation. It preserves executed pins, output and charges.

---

Source evidence · backend `e59716c8`: [app/admin/assets.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/assets.py) · [app/assets/asset_management.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_management.py) · [app/assets/asset_input_archival.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_input_archival.py) · [app/assets/asset_cleanup.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/assets/asset_cleanup.py).
