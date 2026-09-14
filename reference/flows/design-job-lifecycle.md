# Design Job Lifecycle (End-to-End)

This is the **full call chain** for a design job — the most important flow in the
system. It traces what happens from the moment a user taps **submit** in the mini
program to the moment the result appears on screen, including every hop through the API,
Redis, workers, the **multi-provider catalog**, object storage, and the database.

> Every feature (interior, room refresh, kitchen, bathroom, furniture, report) funnels
> into this same pipeline. Understand this page and you understand most of the backend.

## The normalized provider catalog (read this first)

Jobs are no longer routed through a single `PROVIDER_*` env blob. At submit time the
worker resolves a provider through a database catalog:

```text
design_job_types  (catalog / "job type", key = the job's type key)
  selected_model_config_id ──┐
                             ▼
provider_model_catalogs  (N:N join: which model configs this catalog may use)
                             │
                             ▼
provider_model_configs  (model_id, image_size, output_format, watermark,
                         request_shapes[], supports_masked_input)
                             │  belongs to
                             ▼
provider_connections  (base_url, adapter, submit_path, status_path,
                       auth header/scheme, output_hosts, Fernet-encrypted api key)
```

- **Adapters:** `mock_async`, `seedream`, `doubao_text`, `gpt_image`.
- Each adapter declares a capability envelope (`PROVIDER_CAPABILITIES`): allowed request
  shapes (`SINGLE_IMAGE`, `IMAGE_WITH_REFERENCE`, `RECORDING_SEQUENCE`), sync vs async,
  polling support, artifact source, and replay behavior.
- A model may narrow (never exceed) its adapter envelope. At selection time the catalog's
  `result_kind`, `masked_image_required`, and `reference_image_required` are checked
  against the model's `request_shapes`.
- Each accepted `DesignJobSubmission` captures a **non-secret JSON snapshot**
  (`schema_version: 2`: connection + model IDs and configuration versions, base_url,
  paths, output hosts, timeout) plus a separately encrypted API key. A job always runs
  against the exact provider generation it was submitted with.

The normalized I/O contract (`app/providers/base.py`) is a strict
`ProviderRequest` (`instructions` + ordered `inputs` + `output`) that every adapter must
either accept or reject closed — adapters never silently drop content.

## Part 0 — User taps submit (frontend)

```
User taps "提交" on a feature page
        │
        ▼
Frontend src/pkg-features/services/standardDesignSubmit.ts
  submitStandardDesign(input)
  1. reads image metadata (imageFileMetadata.ts)
  2. loads profile + job-type catalog + prompt catalog (parallel)
  3. validates the job type is "available"
  4. builds the prompt selection
  5. token preflight (designTokenPreflight.ts → assertPersonalTokenBalance)
  6. STAGES the images (see Asset Upload Flow)
  7. submits POST /v1/design-jobs with an Idempotency-Key
```

## Part 1 — The API receives the submission

```
POST /v1/design-jobs
  Authorization: Bearer <access_token>
  Idempotency-Key: <8..128 chars>
  body: { workspace_id, type, name, prompts, assets, client_info? }
        │
        ▼
FastAPI → app/api.py: create_design_job  (design_router, prefix /v1)
  1. get_current_user → decode JWT, load user (app/auth.py)
  2. accessible_workspace(db, user, workspace_id) → membership check
  3. resolve the design_job_types row (catalog) for type; require is_active
  4. design rate limit (DESIGN_RATE_LIMIT_JOBS / WINDOW) + active-job slot check
        │
        ▼
  5. reserve_design_job_assets(...)  (app/design_job.py)
       • validates job type / prompt selection / assets under row locks
       • billing.reserve_design_tokens(user, token_cost)
           - row lock on the token account; remaining_tokens >= cost
           - append token_ledger_entries (RESERVE)
       • insert design_jobs row: status=pending, prompt snapshot,
         input asset keys, token_cost, client_info
       • bind input assets via design_job_assets and protect them from cleanup
       • idempotency: replay on matching request fingerprint
        ▼
  6. enqueue ARQ task "submit_design_job"(design_job_id)
     → queue_name = ADMISSION_QUEUE  ("arq:admission_queue")
     → _job_id = design_job.id
        ▼
  7. return 202 Accepted DesignJobResponse
     { id, status: "pending", poll_after_seconds, ... }
     (Retry-After header mirrors poll_after_seconds)
```

**At this moment:** one DB row exists (`pending`), tokens are reserved, and a message
sits in Redis. The frontend receives the job id and begins polling.

## Part 2 — Submit worker talks to the provider

```
Redis ADMISSION_QUEUE ──► submit worker (arq, app.worker.SubmitWorkerSettings)
        │
        ▼
app/design_job.py: submit_design_job(ctx, design_job_id)
  1. acquire a cross-replica short lock "design-job-submit-lock:<id>" (lease)
  2. re-check job still pending (skip if superseded)
  3. finalize_design_job_assets(...) → verified, version-bound input URLs
  4. _reserve_pending_design_job(...) → re-check token reservation
  5. _prepare_provider_submissions(...) → resolve the catalog:
       • load design_job_types (catalog) → selected_model_config_id
       • load provider_model_configs → provider_connections
       • validate connection/model pair against adapter capabilities
       • decrypt the Fernet-encrypted API key in memory
       • snapshot the exact generation onto each design_job_submission
  6. for each submission:
       • _build_provider_request(...) → normalized ProviderRequest
            (instructions + ordered ImageInput[primary,?reference] + OutputSpec)
       • renew the submit lock lease
       • record provider dispatching; call
            _provider_for(...).submit(request=..., idempotency_key=submission.idempotency_key)
       • sync adapters (seedream/gpt_image/doubao_text) complete inline:
            _record_sync_provider_completion → _persist_provider_result
       • async adapters (mock_async):
            _record_provider_acceptance(provider_job_id, state=running)
            → _schedule_poll(...) → POLL_QUEUE
```

Provider failures at this stage mark the job `failed` (typed `ProviderFailure` with an
acceptance-certainty and retry disposition), refund the reservation, and the poll
response tells the client. A "request was never sent" failure is safe to retry; an
"outcome unknown" failure never auto-retries a paid provider call.

## Part 3 — Poll worker drives completion

```
Redis POLL_QUEUE ──► poll worker (arq, app.worker.PollWorkerSettings)
        │
        ▼
app/design_job.py: poll_design_job(ctx, design_job_id, submission_id?)
  loop {
    acquire "design-job-poll-lock:<id>:<submission>"
    provider = provider_settings_from_snapshot(submission) → adapter
    provider.query(provider_job_id)         (PollableProvider; async only)
    if still running  → wait provider_poll_interval_seconds, re-enqueue poll
    if done:
       _record_provider_completion(...)
       _persist_provider_result(...)
         • download / stage the artifact (StagedArtifactLocator or inline)
         • verify result identity (size + sha256, not ETag)
         • upload to object storage → new Asset, attach design_job_assets (role=result)
         • billing.settle_design_tokens → exact cost, append ledger (SETTLE),
           release reservation
         • design_jobs.status = completed; completed_at; average_duration_seconds
         • if it has a design_report → _complete_report_if_ready(...)
    if failed:
       design_jobs.status = failed, error_code
       billing.refund → credit back the reservation
    past provider_deadline_at → failed with "provider_timeout"
  }
```

### Reconciliation safety net

If a worker dies between steps, the cron `reconcile_stale_design_jobs` (every ~15 s on
the poll worker) finds jobs stuck in a non-terminal state past a short cutoff and
**re-enqueues** the right step. A lost job never stalls forever.

## Part 4 — The client polls and gets the result

```
Frontend pollScheduler ──► GET /v1/design-jobs/{id}  (every poll_after_seconds)
        │
        ▼
app/api.py: get_design_job
  1. get_current_user
  2. get_owned_design_job(db, id, user_id) + related data
  3. build DesignJobResponse:
       status: pending | running | completed | failed
       progress fields; poll_after_seconds (also Retry-After header)
       result URL (presigned, expires_at) when completed
       error_code when failed
```

The frontend stops polling when the status is terminal:

- **completed** → show the result image (presigned URL), offer "生成汇报".
- **failed** → map `error_code` to a friendly message and show actions
  (retry / top up / contact).

## Data flow summary

| Step | Redis | PostgreSQL | Object storage | Provider |
| --- | --- | --- | --- | --- |
| Submit API | enqueue submit (admission) | insert design_jobs (pending) + token reserve + snapshot | — | — |
| Submit worker | enqueue poll (poll) | design_job_submissions row + status running | reads input URLs | submit normalized request |
| Poll worker | re-enqueue poll | settle tokens, status completed | writes result image | query until done |
| Client poll | — | reads status | presigned result URL | — |

## Where tokens go

1. `INITIAL_TOKEN_GRANT` — on registration (campaign or `INITIAL_USER_TOKENS`).
2. `RESERVE` — at submit (held on the token account).
3. `SETTLE` — exact cost at completion (releases reservation).
4. refund — on failure.

## Related call chains

- [Asset Upload Flow](/reference/flows/asset-upload-flow) — Part 0 step 6.
- [WeChat Login Flow](/reference/flows/wechat-login-flow) — the login gate before submit.
- [Report Viewing Flow](/reference/flows/report-view-flow) — what happens after a
  `html_report` job completes.
- [Payment Flow](/reference/flows/payment-flow) — where tokens come from.
