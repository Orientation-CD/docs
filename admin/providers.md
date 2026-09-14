# Model Providers & Catalogs

The Model Providers page at `GET /admin/provider` (template `app/templates/admin/provider.html`) is the most configuration-dense screen in Studio Control. It controls **which external AI models the platform calls, how it calls them, and which job types are allowed to use them**. The business logic lives in `app/provider_configuration.py`; the data rows are `ProviderConnection`, `ProviderModelConfig`, and `ProviderModelCatalog`.

## The three-layer model

Think of provider routing as three stacked layers:

1. **ProviderConnection** — *how to talk to one provider endpoint*: base URL, auth, transport timeouts. One connection per adapter.
2. **ProviderModelConfig** — *which model on that connection*, and its output capabilities (size, format, watermark, request shapes).
3. **ProviderModelCatalog** — *permission binding*: which job-type catalog(s) a model config is allowed to serve. This is what lets a subscription plan actually run a job.

When a design job arrives, the system picks a model from the catalog assigned to that job type, uses its connection for transport, and enforces the model's declared capabilities against the job's requirements.

## Supported adapters

`SUPPORTED_PROVIDER_ADAPTERS = ("mock_async", "seedream", "doubao_text", "gpt_image")` in `provider_configuration.py`. Each adapter declares fixed capabilities in `PROVIDER_CAPABILITIES`:

| Adapter | Execution | Supported request shapes | Polling | Notes |
| --- | --- | --- | --- | --- |
| `mock_async` | async | SINGLE_IMAGE, IMAGE_WITH_REFERENCE, RECORDING_SEQUENCE | yes | Test/dummy async provider; accepts mock options. |
| `seedream` | sync | SINGLE_IMAGE, IMAGE_WITH_REFERENCE | no | Seedream image generation. |
| `doubao_text` | sync | RECORDING_SEQUENCE | no | Doubao text/report (recording sequence → markdown). |
| `gpt_image` | sync | SINGLE_IMAGE | no | GPT-image (inline result). |

Request shapes are `ProviderRequestShape`: `SINGLE_IMAGE`, `IMAGE_WITH_REFERENCE`, `RECORDING_SEQUENCE`. A model can only serve job types whose required shape is in its declared set (validated by `provider_model_supports_job_type`).

## Layer 1 — ProviderConnection fields

Create via `POST /admin/provider/connections`; archive/restore via `POST /admin/provider/connections/{id}/lifecycle`. Each connection is optimistic-locked by `configuration_version`.

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Adapter | select | Yes | One of the four supported adapters. Unique per connection (one connection per adapter). | — |
| Base URL | text | Yes | Provider root, e.g. `https://api.example.com`. | — |
| Submit path | text | Yes | Path appended to base URL to submit a job. | — |
| Status path | text | Yes | Path used to poll job status (async adapters). | — |
| API key | password | No | Credential; stored encrypted (`encrypted_api_key`), never shown back. | — |
| Auth header | text | No | Header name carrying the credential. | `Authorization` |
| Auth scheme | text | No | Scheme prefix, e.g. `Bearer`; normalized per adapter (Seedream defaults to Bearer when blank). | `Bearer` |
| Output hosts | text/list | No | Allowed hostnames the provider may return image/output URLs from (allowlist). | empty |
| Allow HTTP | checkbox | No | Permit non-HTTPS base/output hosts. Off in production. | off |
| Send auth to output | checkbox | No | Forward the auth header when fetching output objects from the provider. | off |
| Request timeout (s) | number | Yes | HTTP timeout; integer 1 … 300. | 300 |

Validation (`validate_provider_connection_values`) rejects unknown adapters, checks that required paths are present, and enforces the host/allow-HTTP rules. A stale `expected_version` returns `409 PROVIDER_CONFIGURATION_CHANGED`.

### Connection lifecycle

Connections are **archived**, never deleted:
- **Archive** stops new model dispatch through this connection but keeps it (and its model configs) for history.
- **Restore** reactivates it.
- The lifecycle action is guarded by the `provider-connection` advisory lock.

## Layer 2 — ProviderModelConfig fields

Create via `POST /admin/provider/models`; archive/restore via `POST /admin/provider/models/{id}/lifecycle`. Each model belongs to one connection and is unique by `(connection_id, model_id)`.

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Connection | select | Yes | Which ProviderConnection this model runs on. | — |
| Model ID | text | Yes | The provider's model identifier (trimmed, non-empty). | — |
| Image size | text | Yes | Output resolution label, e.g. `1.5K`. | `1.5K` |
| Output format | select | Yes | `jpeg` or `png`. | `jpeg` |
| Watermark | checkbox | No | Request a watermark on outputs. | off |
| Request shapes | multi-select | Yes | Which `ProviderRequestShape`s this model supports; must intersect the connection adapter's capabilities. | — |
| Supports masked input | checkbox | No | Whether the model accepts masked/brush edits. | off |

Model-level validation (`validate_provider_model_values`) ensures the adapter is supported, the model id is present, output format is valid, and the request shapes are legal for the adapter.

### Model lifecycle

Like connections, model configs are **archived/restored**, not deleted. Archiving a model removes it from dispatch; its catalog bindings are cleared at the same time.

## Layer 3 — ProviderModelCatalog assignment

The catalog table binds a model config to one or more **job-type keys** (the "catalog"). Assignments are made on the provider form's "allowed catalogs" multi-select when creating/editing a model.

- A job type (`DesignJobType.key`) can be served by any model config listed in its catalog.
- Subscription plans further restrict which catalogs a customer may reach (see [billing](/admin/billing) plan permissions).
- Reassigning catalogs takes a `provider-model-catalog` advisory lock and rewrites the binding set atomically.

## How dispatch uses catalogs

At job time, the flow is:

1. Customer requests a job of type `T`.
2. The system loads the model config(s) in the catalog for `T`, filtered by the customer's plan permissions and by model `supports_masked_input` / required request shape vs. the job's inputs.
3. It picks an available, non-archived model, reads its connection for base URL/auth/timeout, and dispatches.
4. Async adapters are polled via `status_path`; sync adapters return inline.

If no model in the catalog satisfies the job's shape (e.g. needs `IMAGE_WITH_REFERENCE` but none supports it), the job fails fast with a clear configuration error — fix the model's request shapes or add a model to the catalog.

## Field reference quick-checklist

- **Connection** = endpoint + credential + transport (adapter, base_url, submit_path, status_path, auth_header, auth_scheme, output_hosts, allow_http, send_auth_to_output, request_timeout_seconds).
- **Model** = output contract (model_id, image_size, output_format, watermark, request_shapes, supports_masked_input).
- **Catalog** = job-type binding (which job types this model may serve).

## Validation internals (for debugging)

When a save fails, the error usually comes from one of these validators in `provider_configuration.py`:

- `validate_provider_connection_values(...)` — adapter must be in `SUPPORTED_PROVIDER_ADAPTERS`; base URL must parse; submit/status paths must be present and begin with `/`; for non-`mock_async` adapters an auth scheme is required; if `allow_http` is off, base URL and every output host must be HTTPS.
- `normalize_provider_auth_scheme(adapter, auth_scheme)` — blanks default to the adapter's expected scheme (notably Seedream's `Bearer`), so a connection works even when the operator leaves the field empty.
- `validate_provider_model_values(...)` — `model_id` must be non-empty and pre-trimmed; `output_format` ∈ {jpeg, png}; `image_size` non-empty; `request_shapes` must be a subset of the adapter's declared shapes; `supports_masked_input` only allowed if the adapter itself supports masked input.
- `provider_model_supports_job_type(...)` — at dispatch time it recomputes the required shape from the job (recording sequence → `RECORDING_SEQUENCE`; reference image required → `IMAGE_WITH_REFERENCE`; else `SINGLE_IMAGE`) and checks membership in the model's shapes.

Concurrency is managed with Postgres advisory locks and a monotonic `configuration_version`:

| Lock namespace | Resource |
| --- | --- |
| `provider-connection` | A single connection (and its model catalog writes). |
| `provider-configuration` | Cross-connection configuration changes. |
| `provider-model-catalog` | Catalog membership rewrites. |

If two admins save the same connection/model and one submits a stale `expected_version`, the second write gets `409 PROVIDER_CONFIGURATION_CHANGED` and must reload before retrying. This prevents silently overwriting a peer's API key or routing change.

## Output safety fields (security model)

Three connection fields exist specifically to prevent the platform from being tricked into trusting or fetching attacker-controlled content:

- **`output_hosts`** — an allowlist of hostnames the provider is permitted to return as image/output URLs. If a provider tries to redirect a result to a host not in this list, dispatch treats it as untrusted.
- **`allow_http`** — when off (the safe default), both `base_url` and every output host must be HTTPS. Turn it on only for local/mock debugging, never in production.
- **`send_auth_to_output`** — by default the auth header is sent only to the provider's own submit/status endpoints, **not** when downloading returned output objects. Set it to on only if the provider's output bucket genuinely requires the same credential; this avoids leaking the API key to third-party CDNs.

These are validated together in `validate_provider_connection_values`: enabling `allow_http` while leaving output hosts unlisted, or pointing at a non-HTTPS host, produces a configuration error rather than a silently insecure runtime.

## A worked configuration example

To take the Seedream image provider live:

1. **Create the connection** with adapter `seedream`, the provider's base URL, its submit and status paths, the API key (encrypted on save), default `Authorization`/`Bearer`, and a timeout such as `300`.
2. **Create a model** on that connection: `model_id` = the provider's model string, `image_size` = `1.5K`, `output_format` = `jpeg`, enable the request shapes the job needs (e.g. `SINGLE_IMAGE` + `IMAGE_WITH_REFERENCE`), and tick `supports_masked_input` if it supports brush edits.
3. **Assign catalogs** — tick the job-type keys this model should serve (e.g. `interior_redesign`).
4. **Restrict by plan** (in [billing](/admin/billing)) so only the subscription intervals you intend include that catalog.
5. Submit a real test job of that type and confirm it dispatches and returns an image.

## Safe operating notes

- Never paste a real API key into documentation or chat; enter it only through the encrypted form field.
- Start with one adapter (e.g. `seedream`), create a model, assign it to a catalog, then run a test job and confirm the output before broadening.
- Archive a connection/model rather than deleting it when decommissioning — dispatch will simply stop selecting it and history stays intact.
- If jobs suddenly fail with "no eligible model", check (a) the model isn't archived, (b) its request shapes match the job, (c) it's assigned to the job's catalog, and (d) the customer's plan allows that catalog.
