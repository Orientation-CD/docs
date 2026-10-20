# Data Model

PostgreSQL stores identity, private project/workspace relationships, financial state and durable Workflow execution. This is a relationship guide to the current ORM, not a replacement DDL specification. Use the pinned models and forward Alembic migrations for exact columns, constraints and indexes.

## Domain map

| Domain | Current tables | Main invariant |
| --- | --- | --- |
| Identity | `users`, `auth_sessions` | Platform identities and account lifecycle resolve to one user; refresh sessions are durable and revocable |
| Legal consent | `legal_documents`, `current_legal_documents`, `legal_document_acceptances` | Acceptance references immutable document IDs, not mutable URLs/text |
| Asset base and subtypes | `assets`, `images`, `audio_assets`, `documents`, `asset_display_metadata` | Verified binary content is version-bound; subtype metadata must agree with actual bytes |
| Upload/copy intents | `asset_upload_intents`, `asset_copy_intents` | Intent role, owner, constraints and idempotency are immutable; copies become independent input Assets |
| Workspaces | `workspaces`, `personal_workspaces`, `enterprises`, `enterprise_memberships`, `enterprise_membership_history` | Personal and enterprise wallets/access differ; departed history does not confer active membership |
| Projects | `projects`, `project_preferences`, `project_activity_state` | Projects are creator-private inside their original workspace; defaults and activity trust have explicit persistence |
| Invitations | `enterprise_invitations`, `workspace_share_invitations`, `share_invitation_idempotency` | Phone-targeted and transferable share invitations are separate protocols |
| Configuration | `operation_definitions`, `workflow_definitions`, `features`, `workflow_node_configurations` | Feature admission/price/activation comes from a validated graph and selected Operations/models |
| Execution | `design_jobs`, `workflow_runs`, `operation_runs`, `operation_run_inputs`, `operation_run_dependencies`, `operation_run_outputs` | Public Job identity projects one aggregate; ordered inputs and durable dependencies drive execution |
| Provider attempts | `design_job_submissions`, `operation_provider_calls`, `design_job_retry_requests` | Attempts freeze request/provider identity; uncertain paid dispatch cannot be blindly repeated |
| Publication and scheduling | `design_job_outputs`, `workflow_generated_sources`, `workflow_outbox_events` | Typed published Assets and transactional scheduling survive retries/restarts |
| Local conversion | `pptx_export_attempts`, `pptx_export_reservations`, `video_render_attempts`, `video_render_reservations` | Local conversion work has bounded resource reservations and recoverable attempts |
| Provider configuration | `provider_connections`, `provider_model_configs` | Connection credentials and model modality/transport are separate, versioned configuration; Token price belongs to the Feature |
| Billing | `token_ledger_entries`, `subscription_plans`, `token_packages`, `user_subscriptions`, `payment_orders`, `purchased_token_batches`, `refund_orders` | Financial evidence and frozen entitlements determine balances; client prices are never trusted |
| Marketing/finance | `campaign_configurations`, `referral_*`, `reward_*`, `finance_cost_entries` | Attribution, explicit claims, fulfillment/outbox and financial costs are distinct records |
| Platform events/prompts | `wechat_payment_events`, `douyin_payment_events`, `douyin_trade_configurations`, `prompt_templates`, `prompt_presets`, `prompt_variables`, `prompt_options` | Verified callbacks and product/prompt configuration retain their own audit boundaries |

## Projects and outcomes

Each creator/workspace has one scratch Project (`临时项目`); ordinary Projects carry customer/address/status metadata. Jobs bind to the same creator/workspace/project identity. Omitted `project_id` resolves to scratch; an explicit project must be accessible in the requested workspace. A shared workspace does not make every member's Project editable by others.

Main status codes are `NEW`, `REQUIREMENTS_CAPTURED`, `REPORT_PRODUCED`. Outcome-enabled catalogs add `WON`/`LOST` with source status, close time and loss metadata. Clients fetch `/v1/project-statuses` rather than inventing status labels/order or relying on a fixed count. `project_activity_state` records the trusted epoch and incident reference; it is not a user-facing on/off flag.

## Job and Asset state

Public job statuses are `pending`, `running`, `completed`, `failed`. Financial state is separately `unreserved`, `reserved`, `settled`, `released`. Provider dispatch has `PREPARED`, `DISPATCHING`, `STAGED`, `TERMINAL`, plus acceptance certainty and retry disposition. These state machines are related but not interchangeable.

A public Workflow response uses typed `inputs` and `outputs`. `result_kind` remains a compatibility projection (`IMAGE`, `HTML_REPORT`, `MARKDOWN`, `VIDEO`); it is insufficient to locate all output ports or presentation files. Artifact identity is an Asset ID and verified metadata, not its expiring signed URL. Provider payload snapshots and credentials stay encrypted/private.

## Retired schema is not a current reference

Earlier docs described the image-only `image_provider_configs`, Catalog-level provider selection and legacy provider output columns. The current model uses normalized connections/models, Workflow node selection and typed provider/output records. Historical migration code can mention removed tables without making them valid runtime dependencies. Do not create legacy tables or restore an old application's snapshot to repair a current deployment.

Migrations may deliberately refuse downgrade after outcomes or compatibility boundaries. Application rollback retains forward schema and requires a compatible image; see [production recovery](/deploy/production).

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions).

- [Current ORM and constraints](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/persistence/db_models.py)
- [Public response schemas](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py)
- [Project status vocabulary](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/project_statuses.py)
- [Forward migration history](https://github.com/Orientation-CD/YuanZhu-AI/tree/b13cc5668920620a274cb91a3393ed9fadac72ae/migrations/versions)
