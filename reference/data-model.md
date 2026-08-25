# Data Model

This page maps the **database schema** (SQLAlchemy ORM models in
`app/db_models.py`, managed by Alembic). It gives you the entities, their
relationships and where each belongs. This is a conceptual map — for exact
columns/types always check the model source or the live database.

## Design-job status machine

The central enums:

- `DesignJobStatus` — `pending`, `running`, `completed`, `failed` (plus
  cancelled/deleted handled at the API layer).
- `DesignJobSubmissionStatus` — provider submission sub-state.
- `DesignJobResultKind` — what kind of result the job produced.
- `JobTokenState` — reservation state (`reserved`, `settled`, `refunded`).

## Entity groups

### 1. Users & identity

| Model | Purpose |
| --- | --- |
| `User` | Account: `wechat_openid`, `phone_e164`, `password_hash`, `display_name`, `remaining_tokens`, `allowed_workspaces`, `is_active` |
| `AuthSession` | Server-side session backing refresh tokens |
| `LegalDocument` / `CurrentLegalDocument` | Legal document versions + which is current |
| `LegalDocumentAcceptance` | A user's acceptance of required docs |

### 2. Workspaces & organizations

| Model | Purpose |
| --- | --- |
| `Workspace` (abstract) | Base: `kind` (personal/enterprise), `name`, owner |
| `PersonalWorkspace` | The per-user private workspace |
| `Enterprise` | Enterprise workspace; `kind=enterprise`, seats, branding |
| `EnterpriseMembership` | User ↔ Enterprise membership with `role` (owner/member) |
| `EnterpriseInvitation` | Internal invitations (by identity) |
| `WorkspaceShareInvitation` | Link-based share invitations |
| `ShareInvitationIdempotency` | Dedupe for share-invitation accept |

### 3. Assets (object storage metadata)

| Model | Purpose |
| --- | --- |
| `Asset` (base) | `type`, `purpose`, `status`, `object_key`, `content_type`, `size_bytes`, `content_sha256`, `object_etag`, `width`, `height`, `asset_expires_at` |
| `Image` / `Document` | Specialized asset types |
| `AssetDisplayMetadata` | Display metadata for asset galleries |
| `AssetUploadIntent` | The upload-intent row (PENDING_UPLOAD → READY) |

### 4. Design jobs

| Model | Purpose |
| --- | --- |
| `DesignJobType` | Catalog of job types (features), `token_cost`, image requirements, provider mapping |
| `DesignJob` | The job: `workspace_id`, `user_id`, `type`, `name`, `status`, `token_cost`, `prompt snapshot`, `client_info`, timestamps, `error_code` |
| `DesignJobSubmission` | Provider submission: `provider_job_id`, submission state |
| `DesignJobAsset` | Design job ↔ asset binding with roles (image/mask/reference/result) |
| `DesignReport` | One completed report (linked to a design job) |
| `DesignReportItem` / `DesignReportItemAsset` / `DesignReportItemObject` | Report items + their assets/objects |

### 5. Tokens & billing

| Model | Purpose |
| --- | --- |
| `TokenLedgerEntry` | Append-only ledger: `scope`, `user_id`, `delta`, `balance_after`, `reason` (`TokenDetailType`), `idempotency_key` |
| `SubscriptionPlan` / `TokenPackage` | Store catalog |
| `UserSubscription` | User ↔ plan, `status`, interval, allowance |
| `PaymentOrder` | A payment order (token purchase / subscription) |
| `PurchasedTokenBatch` | Credited token batch from a purchase |
| `RefundOrder` | A refund |
| `WeChatPaymentEvent` | Inbound WeChat Pay notification log (audit) |
| `FinanceCostEntry` / `FinanceCostCategory` | Internal cost accounting (provider spend) |

### 6. Product content

| Model | Purpose |
| --- | --- |
| `PromptTemplate` / `PromptVariable` / `PromptOption` | AI prompt templates with variables/options |
| `ImageProviderConfig` | Provider endpoint/credentials per provider |

## Key relationships

```
User 1──N AuthSession
User 1──N LegalDocumentAcceptance
User 1──1 PersonalWorkspace
User N──N Enterprise   (via EnterpriseMembership, role=owner|member)
Enterprise 1──N EnterpriseInvitation / WorkspaceShareInvitation

User 1──N DesignJob
Workspace 1──N DesignJob
DesignJob N──1 DesignJobType
DesignJob 1──N DesignJobSubmission
DesignJob 1──N DesignJobAsset  N──1 Asset
DesignJob 1──0..1 DesignReport
DesignReport 1──N DesignReportItem
DesignReportItem N──M DesignReportItemAsset / DesignReportItemObject

User 1──N TokenLedgerEntry
User 1──N PaymentOrder  (token_purchase | subscription)
PaymentOrder 1──1 PurchasedTokenBatch  (for token purchases)
User 1──N UserSubscription  N──1 SubscriptionPlan
PaymentOrder 1──0..1 RefundOrder
```

## Where the data lives

- **Relational (PostgreSQL)**: everything above.
- **Object storage (MinIO/OSS)**: the *bytes* behind `Asset.object_key`
  (photos, renderings, report assets, legal-document HTML).
- **Redis**: ARQ queues, rate-limit counters, progress metrics snapshots,
  short-lived caches. Nothing durable lives only in Redis.

## Migration workflow

- Schema changes are **forward-only Alembic migrations**.
- Never edit an applied revision — add a new one.
- Deployment runs `alembic upgrade head` + `alembic check` (fails closed if
  live schema ≠ model metadata). See [SAE Deployment](/deploy/sae-deployment).

## Next steps

- [REST API Overview](/reference/rest-api) — endpoints over this model.
- [Configuration Reference](/reference/configuration) — tuning knobs.
