# Image Workflows and compatibility

Image design uses the same [Workflow lifecycle](/backend/workflows) as reports, text and video. `DesignJob` remains the internal durable task model and response family; it does not imply that new clients should use the old creation route.

## Submit image work

Discover the Feature from `/v1/billing/features`, then stage one Asset per required role using [direct upload](/backend/assets-storage). The primary upload role is `image`; optional brush/mask and reference uploads use `masked_image` and `reference_image`. The canonical Workflow request carries the explicit port/role mapping defined by its image schema. Do not reuse a result Asset directly as a temporary input: first call its `design-input-copies` endpoint.

Prompt selection uses the existing `prompts.prompts[]` template-name and exact field name/value contract. Server validation rejects unknown or missing fields and multiple system prompts. The final system/configurable/negative sections are frozen at admission; clients do not send model credentials or a finished provider request.

Image completion publishes immutable application Assets, with signed URLs and matching expiration metadata in ordered `outputs`. A URL is a temporary access capability; the Asset UUID is the durable reference.

## Provider selection

An administrator declares model input/output modalities, then selects a compatible model on the Workflow node. The intersection of model-declared and adapter-supported types must cover the required node types. Existing mask and wire-protocol guards remain enforced. There is no Catalog assignment or manual Operation grant. See [models](/admin/providers) and [Workflow configuration](/admin/workflows).

## Legacy URLs

The `/v1/design-jobs` creation/list/detail/retry/move/delete/result/report/presentation routes remain deprecated compatibility paths. New clients use `/v1/workflows` and the returned URLs. Historical requests and fingerprints can have narrower replay rules; replacing a legacy URL while replaying an old receipt is not always equivalent. Follow the migration section of [REST API](/reference/rest-api).

The old report-item product and quote round trip are retired. Use [Blueprint reports](/backend/reports); an old quote-bearing request receives `409 WORKFLOW_UPDATED` rather than silently changing its meaning.

---

Source evidence · backend `b13cc566`: [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/api/__init__.py) · [app/core/models.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py) · [app/providers/provider_configuration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/providers/provider_configuration.py).
