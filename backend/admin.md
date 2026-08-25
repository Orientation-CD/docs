# Admin Site

The backend ships a self-contained **admin website** (`app/admin.py`) — a
server-rendered FastAPI app (Jinja2 templates, session-based) used by operators
to manage the product without touching the database directly.

## What the admin can do

The admin app covers the day-to-day operational surface:

- **Users** — browse users, view accounts, **suspend / reactivate** accounts.
- **Design jobs** — inspect jobs, statuses, and results; intervene when a job
  is stuck.
- **Billing & tokens** — manage the store catalog (token packages,
  subscription plans), review payment orders/refunds, adjust token ledgers,
  record provider purchases.
- **Prompt templates** — manage the prompt templates used for AI requests.
- **Provider configuration** — configure AI providers / job types.
- **Report configuration** — manage **report items** and report **HTML
  templates** (validated and promoted through the template lifecycle).
- **Legal documents** — manage the required legal documents (privacy policy,
  user agreement) that the mini program must present.
- **Configuration sync** — export/snapshot/sync configuration between
  environments (`config_export.py`, `config_snapshot.py`, `config_sync.py`).

## Authentication

- The admin app uses its own **session-based** authentication
  (`admin_sessions.py`), separate from the mobile JWT auth.
- Credentials come from configuration (`ADMIN_PHONE` / `ADMIN_PASSWORD`, and
  related settings); the admin login page issues a session cookie.
- Certain actions (e.g. production account operations) are protected and the
  session model supports per-page authorization checks.

## How it's served

- Mounted at `/admin` on the same FastAPI app (in `main.py`).
- Uses `Jinja2Templates` for server-rendered HTML; forms post back to admin
  routes.
- **Caching**: `admin_cache.py` provides a short-lived admin report cache
  (`ADMIN_REPORT_CACHE_SECONDS`) so heavy dashboard queries don't hammer the DB.
- The admin app is **not** exposed to the public in production configurations
  that don't allow it — it is intended for operators behind appropriate access
  control.

## Report template workflow (admin-specific)

Report templates go through a controlled lifecycle managed by the admin:

1. An operator uploads a candidate template.
2. It is **validated** (syntax + contract) and stored as a candidate.
3. A **promotion** job (`promote_report_template`) activates the validated
   candidate (with idempotency + reconciliation crons).
4. The active template is what renders live reports.

This keeps report HTML rendering safe (sandboxed Jinja2, CSP) while letting
non-engineers update report designs.

## Next steps

- [Reports](/backend/reports) — the report template lifecycle in detail.
- [Observability & Safety](/backend/observability) — rate limits and
  administrative safety.
