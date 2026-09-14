# Report Templates

The Report Templates page at `GET /admin/report-templates` (template `app/templates/admin/report_templates.html`) is a raw HTML/Jinja editor for the report layout customers receive. It is a powerful, intentionally technical tool: you edit trusted source, preview it, then save one candidate that is promoted to the live copy.

## What a report template is

A report template is the HTML/Jinja wrapper around a generated design report. It defines the overall chrome, section ordering, and styling, while leaving the report's explicit section blocks (data-filled by the report engine) intact. Templates have a **scope**:

| Scope | Meaning |
| --- | --- |
| `global` | The default layout for everyone. |
| `enterprise` | An override for one specific workspace. |

Which scopes exist is fetched live from `GET /admin/report-templates/scopes` (used by the destination search box).

## The editor

The single-page editor is driven by `admin.js` (`data-report-template-editor`).

| Control | Meaning |
| --- | --- |
| Template path (search) | Type **Global**, an enterprise name, or an enterprise ID to choose the destination scope. Matches appear after typing, at most five. |
| HTML and Jinja source | A large textarea holding the exact template source. Jinja text is preserved verbatim on save. |
| Preview | Renders the template using sample data without saving. |
| Save | Validates the source and writes a candidate to the chosen destination. |

## The endpoints behind it

| Endpoint | Method | Role |
| --- | --- | --- |
| `/admin/report-templates/scopes` | GET | Search available destinations (Global + enterprises). |
| `/admin/report-templates/content` | GET | Load the current effective template source for a scope into the editor. |
| `/admin/report-templates/preview` | POST | Validate + render a preview, returning a signed URL to view it. |
| `/admin/report-templates/candidate` | POST | Save the submitted source as a durable candidate, then promote it. |

## Candidate promotion lifecycle

Saving is a two-stage, guarded process shown as a step list in the UI:

1. **Candidate saved** — the submitted source is validated and written as a durable candidate (under the `prompt-management`/report-template advisory lock).
2. **Effective OSS copy** — the candidate is promoted to the live object-storage copy the report engine actually uses.

Rules enforced by the UI:
- Preview and Save are **disabled** until a scope is selected and source is present.
- **A pending candidate must finish promotion before another save** — you cannot start a second save while promotion is in flight (the status panel shows "Saving / In progress").
- The status panel reports the destination, updated time, candidate path, and each step's state.

## How it works with the report system

At report-generation time, the report engine loads the **effective** template for the report's scope (enterprise override if present, else global), renders the data-filled section blocks into it, and serves the result. Editing the template does not re-render already-accepted historical reports — it affects reports generated after promotion.

## Warnings

- You are editing **raw HTML/Jinja**. Broken markup or unclosed blocks will surface as render errors at preview — always preview before saving.
- Preserve the explicit section blocks the report engine injects; reordering/restyling them is fine, deleting them will drop report content.
- Saving promotes to production immediately. Use an enterprise scope to test a new layout against a single workspace before promoting to Global.
