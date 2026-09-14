# Report Viewing Flow (End-to-End)

This is the full chain for viewing an HTML design report in the mini program — from a
completed design job to a rendered, CSP-hardened HTML page. Reports are Jinja2 templates
served by the backend; the mini program never renders them itself.

## The report template system (read this first)

Templates are managed in Studio Control (Admin) and stored with a **scope**
(`ReportTemplateScope`):

```text
ReportTemplateScope = global | workspace:<enterprise-id> | user:<user-id>
```

- Candidates are saved through `save_report_template_candidate(...)`:
  - content is validated by `validate_report_template` inside a sandboxed Jinja2
    environment (`_ReportTemplateEnvironment` extends `SandboxedEnvironment`) — syntax
    and the report-data contract are checked before save;
  - a save lock per scope prevents concurrent candidates; an idempotency cache key stops
    duplicate submissions;
  - a candidate is enqueued for promotion; `resolve_active_report_template` returns the
    active template for the scope (cached in Redis, invalidated on promotion).
- Rendering uses `render_report_template(content_utf8, report, csp_nonce)` with an
  explicit, minimal context — no arbitrary Python reachable in the sandbox.

## Part 0 — The design job finishes (html_report)

```
Design job lifecycle completes
  (result_kind = html_report, e.g. "生成汇报")
        │
        ▼
_design_report.py: create_report_for_design_job(...)
  1. one design_reports row per completed design job
  2. design_report_items rows (images, headings, layout)
  3. design_report_item_assets → result asset_ids
  4. mark design_reports.status = ready_for_view
```

## Part 1 — Frontend requests a report view token

```
User taps "查看汇报"
        │
        ▼
Frontend services/reportCapability.ts
  getFreshReportCapability(designJobId)
  → returns whether a report exists and how to view it
        │
        ▼
GET /v1/design-jobs/{id}/report-view-token
  Authorization: Bearer <access_token>
        │
        ▼
app/api.py → report_view.create_report_view_token(...)
  1. get_current_user; load the design job + report (ownership check)
  2. build_report_context(...)  (report_view.py)
       • assemble report_data: headings, report items,
         image contexts (public/presigned URLs, alt, caption)
  3. resolve_active_report_template(scope)  (report_templates.py)
       workspace/user scope first, fall back to global
  4. create_report_csp_nonce() → one fresh nonce
  5. sign a SHORT-LIVED report view JWT:
       claims = { sub, report_id, design_job_id, nonce,
                   exp = now + REPORT_VIEW_TOKEN_SECONDS }
       (HMAC-signed with REPORT_VIEW_SECRET_KEY; NOT a user access token)
  6. return ReportViewTokenResponse { report_view_token, report_view_url,
                                      expires_at }
```

## Part 2 — Backend renders HTML on demand

```
GET /v1/reports/{report_id}?token=<report_view_token>
        │
        ▼
app/api.py → report_view:
  1. decode_report_view_token(token, settings)  → ReportViewClaims
       • check signature, expiry (REPORT_VIEW_TOKEN_SECONDS, e.g. 30 s local)
       • bind to the report_id in the path
  2. build_report_context(...) again (fresh presigned image URLs)
  3. render_report_html(...)
       render_report_template(active_template.content, report_data, nonce)
  4. report_content_security_policy(nonce)
       • CSP header: default-src 'self';
         img-src  <cdn host> <storage hosts> https: data:;
         script-src 'nonce-<nonce>' 'strict-dynamic';
         object-src 'none'; base-uri 'none'
       • anti-clickjacking frame-ancestors 'none'
  5. return text/html; charset=utf-8
```

## Part 3 — Mini program shows the report

```
Frontend services/reportViewer.ts
  validateReportViewer({ url })   (basic shape/allowlist checks)
  → web-view src = report_view_url
        │
        ▼
WeChat web-view component loads the backend HTML
  • short TTL means the link cannot be shared / replayed later
  • CSP nonce pins inline scripts; no remote script origins
  • images load from the CDN / presigned object URLs
```

## Why a separate short-lived token

| Property | Report view token | User access token |
| --- | --- | --- |
| Lifetime | seconds (`REPORT_VIEW_TOKEN_SECONDS`) | minutes |
| Audience | one report, one render | API user session |
| Purpose | open the web-view once | call protected APIs |
| Storage | not persisted; used inline | `yuanzhu.session.tokens.v1` |
| Replay | expired before a share can happen | rotated on 401 |

## Security properties

- **Sandboxed Jinja2** — `SandboxedEnvironment`; templates cannot reach arbitrary Python.
- **CSP nonce** — inline scripts must carry the per-render nonce.
- **Signed, short-TTL, single-report** token — no session credential in the web-view URL.
- **Presigned image URLs** are regenerated per render, scoped to the report's assets.
- **Access log filter** — `_ReportViewAccessLogFilter` /
  `configure_report_view_access_log_filter()` keep report-view logging scoped.

## Related call chains

- [Design Job Lifecycle](/reference/flows/design-job-lifecycle) — the job that produces
  the report.
- [WeChat Login Flow](/reference/flows/wechat-login-flow) — issues the user JWT used to
  mint the report-view token.
