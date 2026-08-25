# Report Viewing Flow (End-to-End)

This is the full call chain for **viewing a design report** — from the user
tapping "查看汇报" to the HTML report rendering inside a `web-view` in the mini
program.

## Part 0 — A report job completes

Reports are created as **design jobs** of type `html_report`. Before that
job can complete, the report items must be resolved:

1. The user picks a style, fills **client info** and optional content sections.
2. The frontend submits `POST /api/v1/design-jobs` with `type: "html_report"`
   and `report_items`.
3. The job flows through the normal pipeline (see
   [Design Job Lifecycle](/reference/flows/design-job-lifecycle)): submit
   worker → provider → poll worker.
4. On completion, the job's `DesignReport` row is populated and the result
   includes a **report view token**.

## Part 1 — Frontend opens the report

```
User taps 查看汇报 on a completed report job
        │
        ▼
Frontend (reportCapability / reportViewer)
  1. from the job, get the report view session:
       { viewerUrl, token, allowedOrigin, expiresAt }
  2. validateReportViewer(session, VITE_REPORT_WEB_ORIGIN):
       • viewerUrl origin must equal configured origin
       • both HTTPS (or dev loopback/LAN exception)
       • allowedOrigin matches
       • not expired
  3. open <web-view src="GET /api/v1/design-jobs/{id}/report?token=...">
```

## Part 2 — Backend renders the HTML

```
GET /api/v1/design-jobs/{design_job_id}/report?token=<view-token>
        │
        ▼
FastAPI → api.py:view_design_report → report_view.py
  1. decode_report_view_token(token):
       • verify signature, expiry (REPORT_VIEW_TOKEN_SECONDS)
       • claims.design_job_id must equal the path id
       • invalid / mismatched → REPORT_UNAVAILABLE
  2. load the design job + report (with load options)
  3. claims.validate_job(job) — job completed, report exists
  4. build_report_context(design_job, storage, settings):
       • report items + their assets/objects
       • asset URLs (presigned)
       • client info, style, etc.
  5. render_report_html(report, context, storage, redis, settings, csp_nonce):
       • render the ACTIVE validated Jinja2 template
       • in a sandboxed environment
       • embed a per-render CSP nonce
  6. return HTMLResponse with hardened headers:
       Content-Security-Policy (nonce-based)
       X-Frame-Options: DENY
       Referrer-Policy: no-referrer
       X-Content-Type-Options: nosniff
       Cache-Control: no-store
```

## Part 3 — The report displays

```
web-view loads the HTML in the mini program.
  • images load from object storage (presigned URLs)
  • no cookies / no public access — the view token is the capability
  • the CSP blocks injected scripts/styles; only the nonce'd inline content
    and allow-listed origins run
```

## Security model

| Property | Enforcement |
| --- | --- |
| No public access | reports require a short-lived signed view token |
| Origin binding | token bound to the exact design_job_id |
| Origin allow-list | frontend validates `VITE_REPORT_WEB_ORIGIN` before opening |
| XSS resistance | sandboxed Jinja2 + per-render CSP nonce + `nosniff` |
| Clickjacking | `X-Frame-Options: DENY` |
| Cache leakage | `Cache-Control: no-store` |

## Data written during this flow

- `design_reports` / `design_report_items` / `design_report_item_assets` —
  populated when the report job completes.
- `report view token` — a signed JWT-like token (not persisted; stateless).

## Related call chains

- [Design Job Lifecycle](/reference/flows/design-job-lifecycle) — how the
  report job runs.
- [Assets & Object Storage](/backend/assets-storage) — report asset handling.
- [Reports](/backend/reports) — the report system deep dive.
