# Design reports and editable PowerPoint

Current report products are `design_report_9`, `design_report_13` and `design_report_17`. Each uses the shared `design_report` Workflow: generate a report, then convert it to an editable presentation. Discover live prices and availability through `/v1/billing/features`; initial seed prices are not a client price table.

## Blueprint input

The client submits `/v1/workflows` with the chosen Feature and a strict Blueprint. The Feature fixes the exact total page count and allowed template multiset. `cover` stays first and `closing` last; middle pages can be reordered within that product's contract.

Inputs bind verified Assets to semantic aliases: the customer-summary Document (`customer_insight.md`), original/colored floor plans and interior images. The cover repeats one complete interior binding. Each page binds at most three Assets; there is no separate report-wide image-count ceiling. MIME, byte/pixel budgets and the closed alias/template matrix still apply. Follow the full Blueprint example in [REST API](/reference/rest-api), rather than constructing it from old report-item settings.

An ordinary [Project](/backend/projects) can prefill editable customer/project/area values. This is a report input snapshot; editing it does not edit the Project. Omitted `project_id` places the task in scratch.

## Outputs and publication

The Workflow produces an HTML preview and editable PPTX. HTML and image references are verified and published with retained exact-version inputs. The report is complete after its required export succeeds; intermediate child success is not a separate complete customer deliverable or additional purchase.

Returned preview/download URLs carry short-lived signed capabilities. The report and presentation routes validate the token and pinned publication identity; refresh the owned task to obtain a new URL after expiry. Do not log or persist capability URLs as permanent public share links. HTML has a restrictive rendering/security policy, and presentation download returns an attachment.

## Optional customer PowerPoint

A customer PPTX can be uploaded as private `DOCUMENT`, `DESIGN_JOB_INPUT`, role `attachment`, up to 100 MiB. The report accepts it through its defined append input and preserves the source version through conversion. Export uses bounded local conversion resources; retained input/output cleanup follows Workflow lifecycle.

## Configuration and migration

Configure report node models in [Workflows](/admin/workflows), editable generation templates in [Prompts](/admin/prompts), and Feature prices/access in [Billing](/admin/billing). Workspace/default Logos and private gallery objects have separate storage rules described in the deployment runbook.

The old `html_report`, `/v1/report-items`, quote-based assembly, report-section configuration and `/admin/report-templates` editor are retired. Historical compatible outputs remain readable, but new admissions use the Blueprint products. See [compatibility](/reference/compatibility) and [deployment](/deploy/sae-deployment).

## Append-input durability

A directly owned appended PPTX is archived before admission and activated with the accepted Job and its physical input pins. It is not safe to rely on the temporary upload path for a later conversion. Inputs already pinned to executed operations are not rewritten by archival or a repair. [Asset archival](/reference/flows/asset-upload-flow) and [targeted recovery](/deploy/production#input-recovery) describe the distinction. Whole-report completion still waits for the required export; a completed archive is neither a finished report nor another purchase.

---

Source evidence · backend `e59716c8`: [app/workflows/operations/design_report/design_report_products.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/operations/design_report/design_report_products.py) · [app/workflows/operations/design_report/workflow_report_publication.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/operations/design_report/workflow_report_publication.py) · [documents/REST_API_INTERFACE.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/REST_API_INTERFACE.md).
