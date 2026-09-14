# Studio Control — Admin Console Overview

**Studio Control** is the internal operations console for the YuanZhu AI platform. It is the web interface that administrators and operations staff use to run the product: manage users, price the service, observe revenue and performance, inspect design jobs, configure model providers, and publish legal and report content.

Internally the product is called **Studio Control** (the brand mark in the sidebar is `SC`, with the tagline *Design operations*). It is mounted on the same FastAPI service as the public API, at the URL prefix `/admin`.

> This documentation set is for two audiences:
> - **Administrators / operators** — every usage page except [tech-stack](/admin/tech-stack). Explains what each screen shows and what every button and field does.
> - **Developers** — [tech-stack](/admin/tech-stack), which describes the code architecture, files, and extension points.

## Who uses it

Studio Control is restricted to accounts whose `User.user_type` is `ADMIN` and whose account is active. It is **not** a customer-facing or partner-facing console. There is no self-service signup: administrator accounts are provisioned directly in the database (see [getting-started](/admin/getting-started)).

Typical users:
- **Platform operators** who watch the Overview and Performance dashboards, triage failed or stuck jobs, and reconcile stale payments.
- **Finance / growth staff** who set subscription prices, token packages, campaign grants, and record monthly cloud/model costs.
- **Production engineers** who wire up model providers, approve models to job catalogs, edit prompt templates, and adjust report layouts.

## Access URL pattern

The console is served by the application itself, under one prefix:

| Surface | Path |
| --- | --- |
| Login page | `GET /admin/login` |
| Authenticated dashboard | `GET /admin` |
| Every section | `GET /admin/<section>` (e.g. `/admin/users`, `/admin/billing`) |

In local development this is usually `http://localhost:8000/admin`. In production it shares the application's public origin. All admin routes are declared with `include_in_schema=False`, so they do not appear in the public OpenAPI schema.

## High-level feature map

The left sidebar has **14 sections**. Click any section name to jump to its dedicated page.

| Section (sidebar label) | Route | What it does |
| --- | --- | --- |
| Overview | `/admin` | Decision-focused KPIs, charts, action-center alerts, jobs needing attention. See [dashboard](/admin/dashboard). |
| Users | `/admin/users` | Search accounts, adjust tokens, set workspace allowance, suspend/archive. See [users](/admin/users). |
| Workspaces | `/admin/workspaces` | Enterprise workspaces: create, member limits, token pools, report config. See [workspaces](/admin/workspaces). |
| Billing & Tokens | `/admin/billing` | Job-type prices, subscription plans, token packages, payment history, reconciliation. See [billing](/admin/billing). |
| Campaigns | `/admin/campaigns` | Registration and referral token grant amounts. See [campaigns](/admin/campaigns). |
| Marketing data | `/admin/marketing` | Read-only acquisition, activation, payment, retention evidence. See [marketing](/admin/marketing). |
| Finance | `/admin/finance` | Revenue/cost/profit reports and monthly cost entry. See [finance](/admin/finance). |
| Performance | `/admin/performance` | HTTP and job throughput, latency, queues, live snapshot. See [performance](/admin/performance). |
| Jobs | `/admin/design-jobs` | List, filter, inspect, and clean up design jobs. See [design-jobs](/admin/design-jobs). |
| Assets | `/admin/assets` | Search/upload images and other stored objects, generate URLs. See [assets](/admin/assets). |
| Legal Documents | `/admin/legal-documents` | Publish terms/privacy versions and track acceptance. See [legal-documents](/admin/legal-documents). |
| Prompts | `/admin/prompts` | Prompt templates with configurable fields, import/export. See [prompts](/admin/prompts). |
| Report Templates | `/admin/report-templates` | Raw HTML/Jinja report layout editor with preview. See [report-templates](/admin/report-templates). |
| Model Providers | `/admin/provider` | Provider connections, model configs, and catalog assignment. See [providers](/admin/providers). |

## How it relates to the API service

Studio Control is **not** a separate application. It is one `APIRouter` (`prefix="/admin"`) attached to the same FastAPI app that serves the mobile/frontend API. This means:

- It reuses the same database engine (`AsyncSession` via `get_db`), the same Redis connection, the same object storage, and the same background job queue.
- It reads and writes the **same production tables** the mobile app reads from (users, payments, design jobs, provider configs). Changes made in Studio Control take effect for customers immediately — there is no separate "admin database."
- It uses **server-rendered HTML** (Jinja2 templates) rather than a JSON API consumed by a separate SPA. Most mutations are ordinary HTML form POSTs; a small layer of progressive-enhancement JavaScript (`admin.js`) swaps updated fragments in place so the page does not fully reload.
- It has its **own** authentication (admin session), CSRF protection, caching, and bilingual i18n that are independent of the customer-facing auth and the public docs website.

## Design principles

- **Server-authoritative.** Prices, token costs, provider routing, and report layouts are all stored in the database and enforced by the server. The admin UI never trusts client-side calculations.
- **Audited mutations.** Token adjustments, cost entries, and provider changes record the acting administrator and are versioned/optimistically locked where concurrent edits matter.
- **Soft archives, not hard deletes.** Payment orders, plans, packages, job types, provider connections, and legal versions are archived (soft-deleted) so billing and finance history remain intact. Only truly unused objects can be physically removed.
- **Read-only where it matters.** The Marketing dashboard and several reports are deliberately read-only evidence surfaces; they do not change business state.
- **Bilingual by default.** Every admin screen renders in Simplified Chinese or English based on the `admin_language` cookie, via the admin's own i18n layer.

Ready to log in? Continue to [getting-started](/admin/getting-started).
