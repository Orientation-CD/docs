# Design Job Lifecycle (End-to-End)

This is the **full call chain** for a design job — the most important flow in
the system. It traces what happens from the moment a user taps **submit** in
the mini program to the moment the result appears on screen, including every
hop through the API, Redis, workers, the AI provider, object storage and the
database.

> Every feature (interior, local, kitchen, bathroom, furniture, report) funnels
> into this same pipeline. Understand this page and you understand most of the
> backend.

## Part 0 — User taps submit (frontend)

```
User taps "提交" on a feature page
        │
        ▼
Frontend (e.g. pkg-features/services/standardDesignSubmit.ts)
  1. reads the image metadata (getFileInfo)
  2. loads profile + job-type catalog + prompt catalog (parallel)
  3. validates the job type is "available"
  4. builds the prompt selection
  5. token preflight (assertPersonalTokenBalance)
  6. STAGES the images (see Asset Upload Flow)
  7. submits POST /api/v1/design-jobs with an Idempotency-Key
```

## Part 1 — The API receives the submission

```
POST /api/v1/design-jobs
  Authorization: Bearer <access_token>
  Idempotency-Key: <client-generated>
  body: { workspace_id, type, name, prompts, assets, client_info? }
        │
        ▼
FastAPI → api.py:create_design_job
  1. get_current_user → decode JWT, load user (auth.py)
  2. accessible_workspace(db, user, workspace_id) → membership check
  3. validate job type available + prompt selection valid
  4. DESIGN rate limit (per user, hourly) + active-job slot check
        │
        ▼
  5. billing.reserve_design_tokens(user, estimated_cost)
        │   ● check remaining_tokens >= cost (row lock)
        │   ● debit reservation, append TokenLedgerEntry(reason=RESERVE)
        ▼
  6. insert DesignJob row:
        status = pending, workspace_id, user_id, type, name,
        prompt snapshot, input asset keys, token_cost, client_info
        ▼
  7. reserve design-job assets (bind + protect from cleanup)
        ▼
  8. enqueue ARQ task submit_design_job(design_job_id) → ADMISSION_QUEUE (Redis)
        ▼
  9. return 200/201 DesignJobResponse
        { id, status: "pending", status_url, poll_after_seconds,
          input_image_url (presigned), ... }
```

**At this moment**: one DB row exists (`pending`), tokens are reserved, and a
message sits in Redis. The frontend receives the job id and begins polling.

## Part 2 — Submit worker talks to the AI provider

```
Redis ADMISSION_QUEUE ──► Submit worker (arq, app.worker.submit_design_job)
        │
        ▼
design_job.submit_design_job(ctx, design_job_id)
  1. re-check job still "pending" (skip if superseded)
  2. build provider request:
       prompt (from stored template + field selection)
       input images (from DesignJobAsset → Asset.object_key)
       mask / reference images if the job type requires them
  3. call the provider (providers/seedream.py or generic adapter):
       POST {provider}/v1/renders
       body: { model, image_size, input images, prompt, ... }
       ──► returns { id: <provider_job_id> }
  4. persist: DesignJobSubmission(provider_job_id, state=running)
     DesignJob.status = running, started_at = now
  5. enqueue ARQ task poll_design_job(job_id) → POLL_QUEUE
```

Provider failures at this stage mark the job `failed` (e.g.
`PROVIDER_UNAVAILABLE`), refund the reservation, and the poll response tells
the client.

## Part 3 — Poll worker drives completion

```
Redis POLL_QUEUE ──► Poll worker (arq, app.worker.poll_design_job)
        │
        ▼
loop {
  GET {provider}/v1/renders/{provider_job_id}
  if still running  ──► wait poll_interval (bounded by MAX_WAIT),
                        re-enqueue poll task
  if done:
       fetch result image bytes
       upload to object storage (ObjectStorage.put) → new Asset
       attach result asset to DesignJobAsset (role=result)
       update width/height
       billing.settle_design_tokens: final exact cost,
            append TokenLedgerEntry(reason=SETTLE), release reservation
       DesignJob.status = completed, completed_at, average_duration_seconds
       if job type is html_report → report becomes viewable
  if failed:
       DesignJob.status = failed, error_code
       billing.refund_design_tokens: credit back reservation
}
```

### Reconciliation safety net

If a worker dies between steps, the cron
`reconcile_stale_design_jobs` (every 15 s) finds jobs stuck in a non-terminal
state and **re-enqueues** the right step. A lost job never stalls forever.

## Part 4 — The client polls and gets the result

```
Frontend pollScheduler ──► GET /api/v1/design-jobs/{id}  (every poll_after_seconds)
        │
        ▼
api.py:get_design_job
  1. get_current_user
  2. load the owned job (get_owned_design_job) + related data
  3. build DesignJobResponse:
       status: pending | running | completed | failed
       progress fields
       poll_after_seconds  (also set as Retry-After header)
       result: { url (presigned, expires_at) }   when completed
       error_code                                   when failed
        │
        ▼
  4. return JSON to the mini program
```

The frontend stops polling when `status.terminal` is true:

- **completed** → show the result image (presigned URL), offer "生成汇报".
- **failed** → map `error_code` to a friendly message and show actions
  (retry / top up / contact).

## Data flow summary

| Step | Redis | PostgreSQL | Object storage | Provider |
| --- | --- | --- | --- | --- |
| Submit API | enqueue submit | insert DesignJob (pending) + token reserve | — | — |
| Submit worker | enqueue poll | submission row + status running | reads input images | creates provider job |
| Poll worker | (poll queue) | settle tokens, status completed | writes result image | polls until done |
| Client poll | — | reads status | presigned result URL | — |

## Where tokens go

1. `INITIAL_TOKEN_GRANT` — on registration (configurable).
2. `RESERVE` — at submit.
3. `SETTLE` — exact cost at completion.
4. `REFUND` — on failure.

## Related call chains

- [Asset Upload Flow](/reference/flows/asset-upload-flow) — Part 0 step 6.
- [WeChat Login Flow](/reference/flows/wechat-login-flow) — the login gate
  before submit.
- [Report Viewing Flow](/reference/flows/report-view-flow) — what happens after
  an `html_report` job completes.
- [Payment Flow](/reference/flows/payment-flow) — where tokens come from.
