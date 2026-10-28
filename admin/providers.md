# Provider connections and model modalities

`/admin/provider` manages protocol connections and the models on them. Workflow node selection lives on the separate [Workflows](/admin/workflows) page; there is no current model-to-Catalog binding or manual Operation eligibility grant.

## Connection

Choose the adapter, then configure its base URL/path, credential and supported transport fields. The ordinary selector exposes `mock_async`, `seedream`, `doubao_text` and `gpt_image`; the backend also accepts the retained multimodal-chat adapter identity where required by stored/configured contracts.

The API key is encrypted at rest using the stable configuration encryption key. A blank password field preserves the configured key; explicit clearing is restricted by adapter/lifecycle rules. Never reconstruct a missing key from display placeholders.

Output-host allowlisting, HTTPS, redirect/auth-forwarding and adapter-specific endpoint validation guard provider output retrieval. The form exposes only supported fields: plain HTTP/auth-to-output controls are not general production toggles. Archive/restore connections and models through lifecycle actions rather than deleting historical identities.

## Model

A model declares its provider ID, **input modalities**, **output modalities**, request timeout and relevant image options. Current timeout bounds are 1–900 seconds, default 300. Missing modality declarations do not mean all types. Model and adapter types must together cover the Workflow node's requirements; extra declared types do not disqualify text-only copywriting, and selection does not filter by image count.

Saving a compatible edit to an already-bound model is permitted; a change that breaks a current Workflow binding is rejected. Connection/model/node changes have independent versions; on `PROVIDER_CONFIGURATION_CHANGED`, reload and compare before saving again. Timeout is a model setting and has its own save control.

## Make a product executable

1. Save a structurally ready connection and a compatible model.
2. Select it on the target Workflow node.
3. Configure the Feature's price, activation and subscription grants in [Billing](/admin/billing).
4. Verify the intended product in the authorized environment.

A saved credential is not a live vendor acceptance test. Existing accepted runs retain frozen provider configuration. The [provider integration policy](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/MODEL_PROVIDER_INTEGRATION_POLICY.md) keeps vendor-specific protocol behavior inside adapters.

---

Source evidence · backend `e59716c8`: [app/admin/providers.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/providers.py) · [app/providers/provider_configuration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/providers/provider_configuration.py) · [app/templates/admin/provider.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/provider.html).
