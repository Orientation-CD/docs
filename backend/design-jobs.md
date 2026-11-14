# Image generation Workflows

Image design uses the same [Workflow lifecycle](/backend/workflows) as reports, text and video. `DesignJob` remains the internal durable task model and response family; it does not imply that new clients should use the old creation route.

## Submit image work

Discover the Feature from `/v1/billing/features`, then stage one Asset per required role using [direct upload](/backend/assets-storage). The primary upload role is `image`; optional brush/mask and reference uploads use `masked_image` and `reference_image`. The canonical Workflow request carries the explicit port/role mapping defined by its image schema. Do not reuse a result Asset directly as a temporary input: first call its `design-input-copies` endpoint.

Prompt selection uses the existing `prompts.prompts[]` template-name and exact field name/value contract. Server validation rejects unknown or missing fields and multiple system prompts. The final system/configurable/negative sections are frozen at admission; clients do not send model credentials or a finished provider request.

Image completion publishes immutable application Assets, with signed URLs and matching expiration metadata in ordered `outputs`. A URL is a temporary access capability; the Asset UUID is the durable reference.

## Provider selection

An administrator declares model input/output modalities, then selects a compatible model on the Workflow node. The intersection of model-declared and adapter-supported types must cover the required node types. Existing mask and wire-protocol guards remain enforced. There is no Catalog assignment or manual Operation grant. See [models](/admin/providers) and [Workflow configuration](/admin/workflows).

## Compatibility boundary

The current UI still uses some adapters. Their exact supported/rejected behavior is centralized in [Compatibility](/reference/compatibility); new integrations use the canonical Workflow request.


---

Source evidence · backend `749e82df`: [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/api/__init__.py) · [app/core/models.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/core/models.py) · [app/providers/provider_configuration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/providers/provider_configuration.py).

## Standard image models and the SDK image family

The model-node instructions above apply to ordinary image generation. The seven ThreeVjia Features share `three_vjia_image`, an SDK execution family with original H5 request preparation, frozen render-document/primary-image pins and release-specific bindings. They do not use a new ordinary provider-model row. See [the SDK architecture](/backend/floor-plans) and [image call chain](/reference/flows/three-vjia-image-flow).
