# Design Jobs

The **design job** is the core abstraction of the backend. Every product feature
(interior design, local renovation, kitchen, bathroom, furniture try-on, report)
is implemented as a design job: an asynchronous unit of work that consumes input
assets + prompt selections, calls an AI provider, and produces result images
(+ optionally a report).

## Job states

A design job moves through a status machine:

```
                reserve ──► pending ──► running ──► completed
                (at submit)   │           │            │
                              │           └──► failed  │
                              └──► cancelled / deleted (by user)
```

Concretely the statuses are: `pending` (created, awaiting worker),
`running` (provider job submitted/in progress), `completed`, `failed`
(with `error_code`), plus a user-visible `cancelled`/deleted state.

## Submission — `POST /api/v1/design-jobs`

The mini program submits a job with:

```json
{
  "workspace_id": "...",
  "type": "interior_design",
  "name": "My living room",
  "prompts": { "template_key": "...", "fields": {...} },
  "assets": [{ "role": "image", "asset_id": "..." }],
  "client_info": { "last_name": "...", "salutation": "...", "project_name": "..." }
}
```

(`html_report` jobs additionally send `report_items`.)

The API handler (`api.py:create_design_job`) does:

1. **Authenticate** the user (`get_current_user`).
2. **Admission control**:
   - Verify the workspace is accessible.
   - Verify the job type is available and the prompt selection is valid.
   - Enforce the per-user active-job limit (`MAX_ACTIVE_DESIGN_JOBS_PER_USER`)
     and the per-user hourly design rate limit.
3. **Reserve tokens** (`billing.reserve_design_tokens`): atomically check and
   debit an estimated token cost from the user's ledger, creating a
   `token_ledger_entries` reservation row. Insufficient balance →
   `402/403` error (the frontend shows a top-up prompt).
4. **Create the `design_jobs` row** in `pending` status (with the input asset
   keys, prompt snapshot, cost, client info).
5. **Reserve the design-job assets** (protect them from cleanup) and bind the
   job id.
6. **Enqueue** `submit_design_job` on the ARQ **admission queue**.
7. Return a `DesignJobResponse` with `status_url` and `poll_after_seconds`.

Because the request is **idempotent** (the frontend sends an
`Idempotency-Key`), retries after network failure return the same job instead
of creating duplicates.

## Worker phase 1 — submit (`app/design_job.submit_design_job`)

The submit worker (`ADMISSION_QUEUE`) processes the job:

1. **Re-check under lock** the job is still `pending` (skip if already
   superseded).
2. **Build the provider request**: compose the prompt from the stored prompt
   template + field selection, and gather the input image keys (plus
   mask/reference images if the job type requires them).
3. **Call the AI provider** (`providers/`): creates a provider job and returns a
   `provider_job_id`.
   - Provider unreachable/errors → mark job `failed` with an error code
     (`PROVIDER_UNAVAILABLE`, etc.).
4. **Persist** `provider_job_id` and move the job to `running`.
5. **Enqueue a poll task** (`poll_design_job`) on the **poll queue**.

The whole submission is bounded by `provider_max_wait_seconds` and the worker
job timeout.

## Worker phase 2 — poll (`app/design_job.poll_design_job`)

The poll worker (`POLL_QUEUE`) drives the job to completion:

1. **Query the provider** for the job status by `provider_job_id`.
   - Still running → re-enqueue the poll task with a backoff delay
     (`poll_after_seconds`), bounded retries.
2. **On success**:
   - **Fetch the result image** from the provider (bytes or a provider URL)
     and **store it in object storage**.
   - **Finalize job assets**: attach the result asset key, width/height, and
     finalize the design-job asset relation.
   - **Settle tokens** (`billing.settle_design_tokens`): debit the *exact*
     final cost and release the reservation, appending to the token ledger.
   - Mark the job `completed` with `completed_at`, `average_duration_seconds`.
   - If the job type is a report, trigger report generation/completion.
3. **On failure**:
   - Mark the job `failed` with an `error_code`.
   - **Refund the reservation** (release tokens) back to the ledger.
4. **Reconciliation** (cron `reconcile_stale_design_jobs`): re-enqueues jobs
   that were left in an inconsistent state (e.g. worker crashed between steps).

## Polling from the client — `GET /api/v1/design-jobs/{id}`

While the job runs, the mini program polls this endpoint:

- Returns the durable job state (`status`, `progress`, `result`,
  `poll_after_seconds`).
- Sets an HTTP `Retry-After` header so the client knows when to poll next.
- `pending`/`running` → client keeps polling.
- `completed` → response includes the **result image** (a short-lived
  presigned URL with `url_expires_at`) and, for report jobs, the report view
  token.
- `failed` → response includes `error_code` so the UI can show the right
  message.

## Job listing & management

- `GET /api/v1/design-jobs` — the current user's paginated history with
  `q` / `status` / `workspace_id` filters.
- `GET /api/v1/workspace/design-jobs?workspace_id=...` — one workspace's jobs
  (owner).
- `DELETE /api/v1/design-jobs/{id}` — user deletes a job (cancels active work).

## Token accounting (why reserve-then-settle)

Design costs are estimated at submit and settled at completion because:

- The **exact cost** can depend on the final provider result (e.g. report
  items generated).
- Reservations make concurrent submissions safe (a user can't overspend
  between check and debit).
- On failure, the reservation is refunded, so users only pay for completed
  work.

## Concurrency & safety

- **Admission slots**: a user's concurrent active jobs are capped.
- **Per-user + per-IP rate limits** on submission.
- **Idempotency keys** make retries safe.
- **Job TTL** (`JOB_TTL_SECONDS`) bounds how long results/queue entries live.
- **Progress metrics**: the backend tracks moving-average durations
  (`DESIGN_PROGRESS_*`) so the client can show an honest "about N seconds".

## Full call chain

See [Design Job Lifecycle](/reference/flows/design-job-lifecycle) for the
complete frontend → API → Redis → workers → provider → storage trace,
including the exact database writes at each step.

## Next steps

- [Billing & Tokens](/backend/billing-tokens) — reservations/settlements.
- [Assets & Object Storage](/backend/assets-storage) — how inputs/results are
  stored.
- [Reports](/backend/reports) — how report jobs complete.
