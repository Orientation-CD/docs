# Reports

A **report** (the `方案汇报` / `html_report` job family) assembles a shareable
HTML design report for a workspace: colored floor plans, circulation diagrams,
mood imagery, and other sections pulled either from a rendered provider or
from a curated object-storage library. This page covers report **configuration**,
**discovery**, **rendering**, and the signed **view** URLs. The data tables are
on the [Data Model](/reference/data-model) page.

## What a report is

A finished report is a row in `design_reports`, decomposed into sections in
`design_report_items`. Each item links to the assets that belong to it
(`design_report_item_assets`) and, for library-backed sections, the specific
objects chosen from storage (`design_report_item_objects`). A report is produced
by an `html_report` design job (see [Design Jobs](/backend/design-jobs)) and
rendered to HTML that the client then displays or exports.

## Report configuration: three levels

Report sections are configured by `ReportItemSetting` objects. The effective
configuration for a workspace is resolved by
`app/report_config.py:resolve_effective_report_config` with a clear precedence:

1. **Enterprise config** — if the workspace is an enterprise, use its own
   `report_config` JSON column.
2. **Default enterprise** — if the workspace is personal, look up the single
   enterprise flagged `is_default_report_config = true` and use its config.
3. **Global settings fallback** — otherwise use the `REPORT_ITEMS` env var /
   `settings.report_items`.

The returned `EffectiveReportConfig` records which `source` produced it
(`enterprise`, `default_enterprise`, or `global`) and which enterprise owns the
OSS namespace for library objects.

### One `ReportItemSetting`

Each section definition has:

| Field | Meaning |
| --- | --- |
| `key` | stable section identifier (must be unique) |
| `display_name` | label shown to the user |
| `source` | `provider` (rendered by a model) or `oss` (library object) |
| `base_path` | OSS base path for `oss` sections |
| `image_count` | how many images the section expects |
| `prompt_template_name` | for `provider` sections, which `PromptTemplate` to use |
| `include_request_prompts` | whether to echo the request prompts into the report |
| `is_enabled` | whether the section is offered |

`validated_report_config` strict-validates stored/admin JSON and rejects
duplicate keys. `save_enterprise_report_config` stages an enterprise's config
under a row lock; `set_default_report_config` atomically flips the optional
default enterprise.

## Discovery (what is selectable right now)

`app/report_discovery.py:discover_report_items` checks availability **without
changing the API shape**:

- for a `provider` section, availability means its configured
  `prompt_template_name` exists among active provider prompts;
- for an `oss` section, it lists objects under the resolved `base_path` in the
  workspace's OSS namespace via
  `report_library.list_valid_report_library_objects` (bounded by
  `REPORT_LIBRARY_MAX_OBJECTS_PER_ITEM`, default 1000).

The client calls this to render the report-builder UI, marking each section
available or unavailable.

## Built-in report prompt templates

`ensure_report_configuration_defaults` seeds two server-owned prompts once at
startup (without overwriting later admin edits):

- `colored_floor_plan` — "Generate a colored floor plan from the submitted floor plan."
- `circulation_plan` — "Generate a circulation plan from the submitted floor plan."

These are `PromptTemplate` rows that provider sections reference by
`prompt_template_name`.

## HTML report rendering

The `html_report` job type (`result_kind = HTML_REPORT`) drives assembly. The
renderer combines:

- the configured report items,
- the selected provider prompts (rendered through the prompt-template engine in
  `app/prompt_templates.py`),
- provider-rendered images for `provider` sections,
- chosen library objects for `oss` sections.

Output HTML is stored in object storage under the workspace's report prefix
(`REPORT_WORKSPACE_ASSET_PREFIX`, default `workspaces`); shared assets use
`REPORT_GLOBAL_ASSET_PREFIX` (default `global`). The rendered HTML must not
execute user/agent-injected scripts; it is treated as untrusted markup.

## Report view tokens

A finished report is shared through a short-lived, signed **view token** rather
than a permanent public URL. `REPORT_VIEW_TOKEN_SECONDS` (default **300**)
bounds token lifetime. The client exchanges a report id for a view token and
fetches the report HTML through a signed, expiring route. This keeps reports
private while still letting a recipient open one link for a few minutes.

## Template reconciliation & caching

Periodic worker jobs keep report storage consistent:

| Job / setting | Default | Purpose |
| --- | --- | --- |
| `REPORT_TEMPLATE_CACHE_TTL_SECONDS` | 300 | in-process render cache |
| `REPORT_TEMPLATE_RECONCILE_SCHEDULE_MINUTE` | 5 | how often to reconcile report templates |
| `REPORT_TEMPLATE_RECONCILE_BATCH_SIZE` / `_MAX_BATCHES` | 100 / 10 | batch bounds |
| `REPORT_RESULT_CLEANUP_MINIMUM_AGE_SECONDS` | 3600 | minimum age before cleanup |

`process_reconcile_report_templates` (poll worker) and
`process_cleanup_report_result_artifacts` keep rendered report artifacts aligned
with current config and garbage-collect old ones.

## Resolution precedence by example

For a personal workspace with no dedicated enterprise, the lookup chain is:

```text
personal workspace
  └─ is there an Enterprise flagged is_default_report_config = true and active?
       ├─ yes → use that enterprise.report_config   (source = "default_enterprise")
       └─ no  → use settings.report_items from REPORT_ITEMS / env (source = "global")
```

For an enterprise workspace, the answer is simply that enterprise's own
`report_config` JSON (`source = "enterprise"`). The `EffectiveReportConfig`
returned to callers records which source won, so the UI can show "this report
uses the default config" without guessing.

## Report view walk-through

1. An `html_report` job finishes and stores its rendered HTML under the
   workspace prefix.
2. The client requests a signed view token for the report (bounded by
   `REPORT_VIEW_TOKEN_SECONDS`).
3. The recipient opens the short-lived URL; the server validates the token,
   renders the stored HTML with raw HTML/scripts disabled, and returns it.

This keeps finished reports private while still allowing a recipient to open one
link for a few minutes, and it means the rendered HTML never needs to be made
public in the bucket.

## Per-workspace configuration in the admin UI

Admins edit an enterprise's report config from `/admin`, choose which
enterprise is the personal-workspace default, and preview the resolved
configuration. Because personal workspaces fall back to the default enterprise,
a single well-configured enterprise can drive reports for all free users until
they are moved to a dedicated enterprise.

## Read next

- [Design Jobs](/backend/design-jobs) — the `html_report` / `方案汇报` pipeline.
- [Assets & Storage](/backend/assets-storage) — OSS library objects and presigned reads.
- [Data Model](/reference/data-model) — `design_reports*` tables.
