# Design Job Operations

The Jobs section at `GET /admin/design-jobs` (template `app/templates/admin/design_jobs.html`) is where you triage the asynchronous design jobs customers submit. It is the operational front door when the dashboard raises a "jobs need attention" alert.

## Job states

A design job moves through `DesignJobStatus` (`app/db_models.py`):

| State | Meaning |
| --- | --- |
| `pending` | Accepted, waiting to be dispatched. |
| `running` | Dispatched to a provider, awaiting result. |
| `completed` | Finished successfully (terminal). |
| `failed` | Failed permanently (terminal). |

Only `completed` and `failed` are terminal. A job that exceeds the configured slow threshold while still `pending`/`running` is considered "stuck" and surfaces in alerts.

## Listing & filtering

The list supports live search and a status filter, paginated at 50 per page.

**Search matches:** user name, job type, provider job id, error message, and job id.
**Status filter:** all / pending / running / completed / failed.

| Column | What it shows |
| --- | --- |
| Job | Job id + created time. |
| User | Owner display name. |
| Type / Tokens | Job type and tokens reserved/consumed. |
| Status | State chip. |
| Provider ID | The provider's own job id (if dispatched). |
| Created | Submission time. |

## Job detail (`GET /admin/design-jobs/{id}`)

Click a row to open `app/templates/admin/design_job_detail.html`. It shows:
- The job's inputs, prompt, and parameters.
- All child **submissions** (`DesignJobSubmission`) and their provider lifecycle.
- Outputs and related **assets** (input images, result images, masks, recordings).
- The current status, provider id, and any safe (sanitized) error message.

## Operations on a job

### Remove terminal jobs (`POST /admin/design-jobs/{id}/remove`)

Removes a job **only if it is terminal** (`completed` or `failed`), via `delete_terminal_design_job`. This is a cleanup action for old/noise jobs. It is refused for still-running jobs so you never delete work in flight.

### Mark as failed (`POST /admin/design-jobs/{id}/mark-failed`)

Calls `admin_mark_design_job_failed(...)`. Use this when a job has been stuck `pending`/`running` past the slow threshold and the provider is unrecoverable. It transitions the job to `failed`, settles/releases reserved tokens, and records a safe failure reason so the customer's balance is corrected.

> Prefer "mark failed" over leaving a job pending indefinitely: it frees reserved tokens and clears the stuck-jobs alert.

## Typical triage flow

1. Open the dashboard alert → links to `/admin/design-jobs` (or `?status=failed`).
2. Filter `running`/`pending`, sort by age.
3. Open detail, inspect provider id and error.
4. If unrecoverable → **mark as failed**. If old/terminal clutter → **remove**.
5. If failures cluster, check [providers](/admin/providers) and [performance](/admin/performance).
