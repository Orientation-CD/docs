# Studio Control administration

Studio Control is the server-rendered administration website at the API origin's `/admin`. It manages customer operations, commercial configuration and execution models. Its browser session and CSRF controls are separate from customer bearer authentication.

## Current navigation

| Menu | Use it for |
| --- | --- |
| [Overview](/admin/dashboard) | Business summary, action center and Jobs needing attention |
| [Users](/admin/users) / [Workspaces](/admin/workspaces) | Account lifecycle, owned-space allowances, seats and audited balances |
| [Billing & Tokens](/admin/billing) / [Campaigns](/admin/campaigns) | Feature prices/access, subscription/packages, payments and future rewards |
| [Marketing data](/admin/marketing) / [Finance](/admin/finance) | Customer funnel evidence and monthly costs/results |
| [Performance](/admin/performance) / [Jobs](/admin/design-jobs) | Runtime pressure, task families, diagnostics and bounded interventions |
| [Assets](/admin/assets) / [Legal Documents](/admin/legal-documents) | Authorized file discovery and immutable legal publication |
| [Prompts](/admin/prompts) | Editable instructions, variables and complete-library import/export |
| [Model Providers](/admin/providers) / [Workflows](/admin/workflows) | Protocol connections, model modalities and per-Workflow node selection |

## Bring a product online

Configure its provider connection and model, declare compatible input/output types, select the model on the Workflow node, then configure the Feature and subscription permissions. Confirm current legal documents and storage delivery before customer acceptance. Product activation is distinct from creating a provider row.

Most forms update the affected portion of the page and report success/conflict without losing the current list context. Reload on a configuration-version conflict before reapplying a change. Do not repeatedly submit a non-idempotent adjustment after an uncertain response without inspecting the resulting balance/ledger.

English/Chinese selection uses the `admin_language` browser cookie. There is no current Report Templates editor; see the [migration note](/admin/report-templates). Start with [administrator setup](/admin/getting-started).

---

Source evidence · backend `b13cc566`: [app/templates/admin/base.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/base.html) · [app/admin/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/__init__.py).
