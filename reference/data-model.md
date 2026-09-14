# Data Model

This page documents every SQLAlchemy model in `app/db_models.py` (~2,660 lines,
52 tables). It is the single source of truth for the PostgreSQL schema. Table
and column names below match the ORM exactly; migrations live in `alembic/`.

Conventions: every row has an `id` (UUID primary key) and `created_at` /
`updated_at` timestamps unless noted. String enums store their `.value`, not the
Python member name.

## Enums (reference)

| Enum | Values |
| --- | --- |
| `DesignJobStatus` | `pending`, `running`, `completed`, `failed` |
| `DesignJobSubmissionStatus` | `pending`, `running`, `completed`, `failed` |
| `ProviderDispatchState` | `PREPARED`, `DISPATCHING`, `STAGED`, `TERMINAL` |
| `ProviderAcceptanceCertainty` | `NOT_SENT`, `REJECTED`, `UNKNOWN` |
| `ProviderRetryDisposition` | `SAFE_AUTOMATIC`, `CLIENT_AFTER_CHANGE_OR_DELAY`, `NEVER` |
| `DesignJobResultKind` | `IMAGE`, `HTML_REPORT`, `MARKDOWN` |
| `ReportContentSource` | `PROVIDER_RENDER`, `OSS_LIBRARY` |
| `DesignReportItemStatus` | `pending`, `ready`, `failed` |
| `ReportTemplateScopeKind` | `global`, `enterprise` |
| `UserType` | `personal`, `enterprise`, `admin` |
| `AccountStatus` | `active`, `deactivated`, `suspended`, `anonymized` |
| `EnterpriseRole` | `owner`, `member` |
| `WorkspaceKind` | `personal`, `enterprise` |
| `JobTokenState` | `unreserved`, `reserved`, `settled`, `released` |
| `TokenSource` | `personal`, `enterprise` |
| `TokenDetailType` | `INITIAL_TOKEN_GRANT`, `TOKEN_PURCHASE`, `DESIGN_JOB_RESERVE`, `DESIGN_JOB_CONSUMED`, `DESIGN_JOB_RELEASE`, `SUBSCRIPTION_PURCHASE`, `SUBSCRIPTION_EXPIRATION`, `REFUND_DEDUCTION`, `TOKEN_ADJUSTMENT_CREDIT`, `TOKEN_ADJUSTMENT_DEDUCTION`, `GLOBAL_TOKEN_PURCHASE`, `GLOBAL_TOKEN_ADJUSTMENT_CREDIT`, `GLOBAL_TOKEN_ADJUSTMENT_DEDUCTION`, `REFERRAL_REWARD`, `REFERRAL_REWARD_CLAWBACK` |
| `SubscriptionInterval` | `monthly`, `quarterly`, `yearly` |
| `SubscriptionStatus` | `pending`, `active`, `expired` |
| `PaymentType` | `app`, `jsapi` |
| `PaymentKind` | `subscription`, `token_purchase` |
| `PaymentStatus` | `pending`, `paid`, `closed`, `refunded` |
| `RewardGrantStatus` | `holding`, `claimable`, `claimed`, `expired` |
| `CampaignCode` | `NEW_USER_REGISTRATION` |
| `RefundStatus` | `pending`, `succeeded`, `failed` |
| `FinanceCostCategory` | `cloud`, `model_provider` |
| `LegalDocumentType` | `terms`, `privacy` |
| `AssetType` | `IMAGE`, `DOCUMENT`, `AUDIO` |
| `AssetVisibility` | `PRIVATE`, `PUBLIC` |
| `AssetStatus` | `PENDING_UPLOAD`, `READY`, `RESERVED`, `ACTIVE` |
| `AssetUploadPurpose` | `DESIGN_JOB_INPUT`, `ADMIN_IMAGE`, `LEGAL_DOCUMENT` |
| `DesignJobAssetRole` | `image`, `masked_image`, `reference_image`, `result_image`, `recording` |

## Identity & access

### `users`

Registered accounts.

| Column | Notes |
| --- | --- |
| `id` | PK |
| `wechat_openid` | unique WeChat OpenID (nullable for password-only) |
| `phone_e164` | unique normalized phone |
| `password_hash` | Argon2id hash (nullable for WeChat-only) |
| `display_name`, `avatar_url` | profile |
| `user_type` | `UserType` |
| `account_status` | `AccountStatus` (active/deactivated/suspended/anonymized) |
| `is_active` | denormalized quick filter |
| `remaining_tokens`, `reserved_tokens` | personal wallet |
| `current_workspace_id` | FK → `workspaces.id` |
| `deactivated_at`, `anonymized_at` | lifecycle timestamps |

### `auth_sessions`

Durable refresh-token sessions. Each row backs one refresh token (`sid` claim),
enabling server-side revocation.

## Workspaces & organizations

### `workspaces`

Shared workspace base table (joined-per-table inheritance).

| Column | Notes |
| --- | --- |
| `id` | PK |
| `kind` | `WorkspaceKind` |
| `name` | display name |
| `is_active`, `removed_at` | soft-delete / enable |
| `remaining_tokens`, `reserved_tokens` | enterprise wallet (personal uses the user's) |
| `report_config` | JSON report-section config (enterprise) |
| `is_default_report_config` | enterprise flagged as the personal-workspace default |

### `personal_workspaces`

One-to-one child of `workspaces`; `user_id` → `users.id`. Named `个人空间`.

### `enterprises`

One-to-one child of `workspaces`; adds `member_limit`.

### `enterprise_memberships`

| Column | Notes |
| --- | --- |
| `enterprise_id` | FK → `enterprises` |
| `user_id` | FK → `users` |
| `role` | `EnterpriseRole` (owner/member) |
| `joined_at` | membership timestamp |

### `enterprise_invitations`

Email/phone → enterprise + role, token, expiry (`ENTERPRISE_INVITATION_HOURS`).

### `workspace_share_invitations` / `share_invitation_idempotency`

Share-link invitations and their idempotency records.

## Assets & storage

### `assets`

Base asset row (joined-per-table inheritance).

| Column | Notes |
| --- | --- |
| `type` | `AssetType` |
| `status` | `AssetStatus` |
| `visibility` | `AssetVisibility` |
| `owner_user_id`, `workspace_id` | ownership |
| `object_key`, `content_type`, `size_bytes`, `sha256` | storage metadata |
| `upload_intent_id` | back-reference |

### `images` / `audio_assets` / `documents`

Type-specific child tables (dimensions/pixels, duration, mime, etc.).

### `asset_display_metadata`

Cached display labels for an asset.

### `asset_upload_intents`

One row per `POST /upload-intents`: declared type/purpose/role, idempotency key,
presign expiry, temporary version.

## Design jobs & providers

### `design_job_types`

Catalog of job types. `key` is also the **catalog binding key** for
`provider_model_catalogs`.

| Column | Notes |
| --- | --- |
| `key` | PK (e.g. `室内设计`, `voice_summary`, `html_report`) |
| `display_name` | label |
| `token_cost` | tokens charged on completion |
| `result_kind` | `DesignJobResultKind` |
| `is_active` | selectable? |

### `design_jobs`

The core job.

| Column | Notes |
| --- | --- |
| `user_id`, `workspace_id`, `job_type_key` | ownership + type |
| `status` | `DesignJobStatus` |
| `token_state` | `JobTokenState` |
| `token_source` | `TokenSource` (personal/enterprise) |
| `prompt_selection` | JSON of chosen prompt templates + field values |
| `provider_dispatch_state` | `ProviderDispatchState` |
| `provider_connection_id`, `provider_model_config_id` | resolved provider |
| `provider_job_id`, `provider_result_url` | external handoff |
| `progress`, `error_code`, `result_kind` | outcome |

### `design_job_submissions`

Durable child submissions (retryable provider attempts), with their own
`DesignJobSubmissionStatus`, acceptance certainty, and retry disposition.

### `design_job_assets`

Join table linking a job to its input/output assets with a
`DesignJobAssetRole`.

### **`provider_connections`** (new)

One vendor/account.

| Column | Notes |
| --- | --- |
| `adapter` | e.g. `mock_async`, `seedream`, `doubao_text`, `gpt_image` |
| `base_url` | provider endpoint |
| `api_key_ciphertext`, `encryption_key_id` | encrypted credentials |
| `request_timeout_seconds`, poll/retry knobs | runtime |
| `output_hosts` | allow-list of result hosts |
| `allow_http`, `is_active` | safety flags |

### **`provider_model_configs`** (new)

One concrete model under a connection.

| Column | Notes |
| --- | --- |
| `provider_connection_id` | parent |
| `model_id` | vendor model name |
| `image_size`, `output_format`, `watermark` | output controls |
| `request_shapes` | ordered multimodal I/O shape |

### **`provider_model_catalogs`** (new)

The junction binding a model to a job type:

| Column | Notes |
| --- | --- |
| `provider_model_config_id` | FK → `provider_model_configs` |
| `catalog_key` | **FK / value = `design_job_types.key`** |

This is how providers are assigned to design job types.

## Prompt templates

### **`prompt_templates`** (new)

| Column | Notes |
| --- | --- |
| `name` | unique public name |
| `description` | admin note |
| `system_prompt`, `template_text`, `negative_prompt` | prompt channels |
| `is_active` | selectable? |

### **`prompt_variables`** (new)

Configurable `{variable}` fields: `template_id`, `key`, `default_value`,
display order.

### **`prompt_options`** (new)

Predefined selectable values for a variable: `template_id`, `variable_key`,
`label`, `value`, sort order.

## Reports

### `design_reports`

One assembled report: `workspace_id`, status, rendered HTML location, frozen
template scope (`ReportTemplateScopeKind`).

### `design_report_items`

One selected section: `report_id`, `key`, status (`DesignReportItemStatus`),
content source.

### `design_report_item_assets` / `design_report_item_objects`

Assets and chosen OSS library objects belonging to a report item.

## Billing & tokens

### `token_ledger_entries`

Append-only audit trail. `user_id`/`enterprise_id` (one side), signed `amount`,
`detail_type` (`TokenDetailType`), correlation reference, balance snapshot.

### `subscription_plans` / `token_packages`

Catalog: plan code/name/interval/price/included tokens/benefit items; package
price + token grant.

### `user_subscriptions`

One active paid period per user: `plan_code`, `plan_name`, `status`
(`SubscriptionStatus`), `current_period_start/end`, denormalized
`benefit_items`.

### `payment_orders` / `purchased_token_batches`

Orders with merchant `out_trade_no`, `kind` (`PaymentKind`), `type`
(`PaymentType`), `status` (`PaymentStatus`), amount (fen); batches record the
credited token grant on success.

### `refund_orders` / `finance_cost_entries` / `wechat_payment_events`

Refund lifecycle, operating-cost categories, and raw WeChat Pay notify records.

## Referrals & campaigns

### `referral_invitations`

Single-use bearer: `inviter_user_id`, token digest, expiry
(`REFERRAL_INVITATION_LIFETIME_SECONDS`).

### `campaign_configurations` (new)

Runtime reward amounts: `code` (PK, e.g. `NEW_USER_REGISTRATION`),
`token_amount`, optimistic `version`, `updated_by_user_id`.

### `referral_attributions` / `referral_identity_claims`

Immutable first-wins inviter→invitee attribution and IP/device evidence.

### `reward_grants` / `reward_grant_items`

Promised rewards (`RewardGrantStatus`) and their line items.

### `reward_claims` / `reward_fulfillments`

Explicit claim → atomic fulfillment into personal tokens.

### `referral_reward_sources` / `reward_outbox_events` / `reward_operation_idempotency`

Which purchase triggered a reward, the transactional outbox, and idempotency.

## Legal

### `legal_documents` / `current_legal_documents` / `legal_document_acceptances`

Versioned terms/privacy documents, the currently-active pointer, and per-user
acceptance records.

## Read next

- [REST API](/reference/rest-api) — which routes read/write these tables.
- [Design Jobs](/backend/design-jobs) — the `design_jobs` / provider catalog flow.
- [Billing & Tokens](/backend/billing-tokens) — the ledger semantics.
