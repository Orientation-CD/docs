# Design Jobs & the Multi-Provider Catalog

A **design job** is the unit of async AI work: the user uploads a floor plan
(or records a conversation), the backend charges a token hold, hands the work
to an external model provider, polls it until it finishes, stores the result,
and settles the charge. This page covers the full lifecycle, the provider
dispatch logic, and the new **multi-provider catalog system** that lets
operators bind different models to different job types without redeploying.

If you just want the endpoint list, see [REST API](/reference/rest-api). The
data model lives on the [Data Model](/reference/data-model) page.

## Job types

Design job types are rows in the `design_job_types` table, seeded at startup
and editable by admins. Each row has:

| Column | Meaning |
| --- | --- |
| `key` | stable identifier (also the **catalog key** used to bind models) |
| `display_name` | human label shown in the Mini Program |
| `token_cost` | tokens charged when the job completes |
| `result_kind` | `IMAGE`, `MARKDOWN`, or `HTML_REPORT` |
| `is_active` | whether the job type is currently selectable |

The product-facing job types enumerated in `app/design_job.py`
(`SupportedDesignJobType`) are:

| `key` (enum value) | Label |
| --- | --- |
| `室内设计` | interior design |
| `局部改造` | room refresh |
| `厨房改造` | kitchen refresh |
| `卫生间改造` | bathroom refresh |
| `家具试搭` | furniture try-on |
| `方案汇报` | floorplan reporting (drives HTML reports) |

Two additional non-UI types are seeded but start **inactive**:

- `voice_summary` — turns a recorded conversation into structured Markdown
  (`result_kind = MARKDOWN`), from `app/summary_catalog.py`.
- `html_report` — assembles an HTML report (`result_kind = HTML_REPORT`),
  from `app/report_config.py`.

## Lifecycle states

`DesignJob.status` moves through a strict state machine. A job is created in a
non-terminal state, transitions through provider dispatch, and ends in either
`completed` or `failed`. The transitions are guarded by row locks and short
Redis leases so retries never double-submit.

```
 created ──► reserved ──► provider_dispatch ──► provider_running
                              │                      │
                              │                      └──► completed (settle tokens)
                              └──► failed (release tokens)
```

Key functions in `app/design_job.py`:

| Function | Role |
| --- | --- |
| `reserve_design_job_assets` | validate & lock input assets, create the `DesignJob`, hold tokens |
| `submit_design_job` | (worker) compose provider request, submit, record `provider_job_id`, enqueue poll |
| `poll_design_job` | (worker) poll provider, download result, persist, settle tokens |
| `mark_job_failed` | terminal failure path, releases held tokens |
| `reconcile_stale_design_jobs` | periodic re-drive of jobs lost mid-flight |
| `delete_terminal_design_job` | user/admin deletion of finished jobs |
| `average_design_job_duration_seconds` | historical duration used for progress estimation |

Progress is estimated client-side from
`DESIGN_PROGRESS_DEFAULT_DURATION_SECONDS` / `_MINIMUM_SAMPLES` / `_SAMPLE_SIZE`
/ `_HISTORY_DAYS`, so the UI can show a percentage even before the provider
replies.

## Token reservation & settlement (billing handshake)

Design jobs are billed in two phases (see [Billing & Tokens](/backend/billing-tokens)
for the full ledger):

1. **Reserve** at creation: `reserve_design_tokens` moves `token_cost` from the
   workspace's `remaining_tokens` into `reserved_tokens` and writes a
   `token_ledger_entries` row. This is the "hold".
2. **Settle** on completion: `settle_design_tokens` confirms the charge; on
   failure `release_design_tokens` returns the hold. This prevents running out
   of tokens mid-batch.

## Provider input/output contract

Every provider adapter speaks one normalized contract defined in
`app/providers/base.py`. Inputs and outputs are **ordered multimodal** lists
(#216), so the model sees parts in a deterministic order regardless of adapter:

```python
@dataclass(frozen=True)
class InputPart:
    kind: Literal["text", "image"]
    text: str | None = None
    media_url: str | None = None

@dataclass(frozen=True)
class OutputPart:
    kind: Literal["image", "markdown", "text"]
    media_url: str | None = None
    text: str | None = None
```

An adapter receives `(inputs: tuple[InputPart, ...], settings, ...)` and returns
`tuple[OutputPart, ...]`. Adapters translate between this neutral shape and
each vendor's native request/response JSON. This is what lets
`mock_multimodal.py`, `seedream.py`, and `doubao_text.py` be swapped without
changing `design_job.py`.

## The bundled adapters (`app/providers/`)

| File | Adapter key | Result kind | Notes |
| --- | --- | --- | --- |
| `base.py` | — | — | protocol + `InputPart`/`OutputPart`, `ProviderError` hierarchy |
| `mock_multimodal.py` | `mock_async` | image | default local adapter; exercises the same async REST lifecycle as real providers |
| `seedream.py` | `seedream` | image | Volcengine Ark Seedream image generations |
| `doubao_text.py` | `doubao_text` | markdown | text/LLM adapter used by `voice_summary` and report prompts |
| `gpt_image.py` | `gpt_image` | image | **disabled by default** (`PROVIDER_MODEL` empty); gated by a deploy approval |
| `ark_sdk.py` | — | — | shared Ark SDK helpers used by Seedream |
| `http_transport.py` | — | — | bounded connection-pool `httpx` transport (max connections, keepalive) |

## Multi-provider catalog system

Before this system, there was effectively one global provider configured by env
vars. Now providers, their models, and the **binding of a model to a job type**
are rows in the database, editable from the admin UI without a redeploy. Three
tables do the work (see [Data Model](/reference/data-model)):

### 1. `provider_connections`

One row per vendor/account. It stores:

- `adapter` — which adapter class to use (`mock_async`, `seedream`,
  `doubao_text`, `gpt_image`…),
- `base_url`,
- encrypted credentials (`api_key_ciphertext`, `encryption_key_id` — encrypted
  at rest with `CONFIG_ENCRYPTION_KEY`),
- `request_timeout_seconds`, poll timing, retry budget,
- output hosts allow-list (`output_hosts`) and `allow_http` flag (production
  rejects mock/fake endpoints at startup).

### 2. `provider_model_configs`

One row per concrete model under a connection. It stores:

- `model_id`,
- `image_size`, `output_format`, `watermark`,
- `request_shapes` (the ordered input/output shape the model expects),
- adapter-specific overrides.

### 3. `provider_model_catalogs` (junction)

The binding table. It pairs a `provider_model_config_id` with a
`catalog_key`. Crucially, **`catalog_key` is a `design_job_types.key`** — so the
catalog answers "for this job type (e.g. `室内设计`), which model config should
be used?". This is how providers are assigned to design job types.

### Adapter capability profiles

`app/provider_configuration.py` defines a `PROVIDER_CAPABILITIES` map (and
`PROVIDER_CAPABILITY_MAP`) describing, per adapter, its input/output kinds,
default paths (`submit_path`, `status_path`), default image sizes, and which
settings are required. `validate_adapter_settings` enforces them. This is the
runtime source of truth for what each adapter supports; admin forms and
`/openapi.json` derive from it.

### How a job is dispatched

When `submit_design_job` runs:

1. It loads the **active catalog entry** for the job's `design_job_type.key`.
2. That entry points to a `provider_model_config`, which points to a
   `provider_connection`.
3. `ProviderRuntimeSettings` is assembled from the DB row, falling back to the
   `PROVIDER_*` env bootstrap values only during migration.
4. The inputs are normalized into ordered `InputPart`s, the adapter is invoked
   over the bounded `http_transport`, and the result is normalized into ordered
   `OutputPart`s.

**Personal subscription enforcement + live catalog permissions** (#201) means
that which catalog entries are visible to a job depends on the caller's current
personal subscription entitlement (`subscription_entitlements.py:
load_current_personal_subscription`) — premium catalog models can be gated to
paid plans.

## Prompt composition

Design jobs may carry a **prompt selection** of one or more admin-managed
`PromptTemplate`s (see [Reports](/backend/reports) and
`app/prompt_templates.py`). `compose_design_prompt` renders each selected
template's `{variable}` placeholders with the mobile-supplied values and joins
the system / configurable / negative prompt channels. At most one selected
template may contribute a `system_prompt`. Composed prompts are bounded to
`_MAX_COMPOSED_PROMPT_LENGTH` (12,000 chars).

## Recording summaries (#208)

The `voice_summary` job type reuses the same pipeline but with `result_kind =
MARKDOWN` and the `doubao_text` adapter. `app/summary_prompt.py` owns the
server-side system prompt (a Chinese renovation-needs summarizer) and enforces
that the output is a bounded Markdown document with H2 headings and bullet
lists; source recordings are treated as **data, not instructions**, to prevent
prompt injection. `app/summary_catalog.py` seeds the job type and prompt once at
startup without overwriting later admin edits.

## Operational knobs

| Setting | Default | Meaning |
| --- | --- | --- |
| `DESIGN_RATE_LIMIT_JOBS` / `_WINDOW_SECONDS` | 20 / 3600 | per-user hourly submissions |
| `MAX_ACTIVE_DESIGN_JOBS_PER_USER` | 5 | concurrent active jobs per user |
| `PROVIDER_REQUEST_TIMEOUT_SECONDS` | 300 | per provider HTTP call timeout |
| `PROVIDER_POLL_INTERVAL_SECONDS` | 10 | poll cadence |
| `PROVIDER_MAX_WAIT_SECONDS` | 900 | give up after 15 minutes |
| `PROVIDER_MAX_RETRIES` | 4 | retries before failure |
| `DESIGN_PROGRESS_*` | — | client-side progress estimation |

## Read next

- [Billing & Tokens](/backend/billing-tokens) — the ledger behind reserve/settle.
- [Reports](/backend/reports) — how `方案汇报` / `html_report` assemble HTML.
- [Reference: REST API](/reference/rest-api) — the `/design-jobs` routes.
