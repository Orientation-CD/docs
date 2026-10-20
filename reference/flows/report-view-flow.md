# Design Report and Presentation Flow

Current Design Reports run as versioned Blueprint Workflows. They publish verified HTML and, for the configured pipeline, a presentation output. Historical HTML-only reports remain readable; a deprecated template field or old report body is not the new creation contract.

## 1. Build the source Blueprint

The frontend assembles a structured Design Report Blueprint from selected sources and the configured product. Source identities are verified completed Jobs/Assets, not arbitrary remote URLs. The backend composes named report documents and request-local image aliases after exact-version verification, preserving the required floor-plan and room semantics.

Submit an exact current `type` (`design_report_9`, `design_report_13` or `design_report_17`, producing 9/13/17 total pages) to `/v1/workflows` with exactly one Blueprint input and at most one authorized append-PPTX attachment. Bare `design_report` identifies historical Jobs, not a new request type. The presence of retired `quote_id`, including `null`, requires resubmission; omit the field entirely. Older protocol-zero `options`/`project`/completed-job inventories must not be copied into a current request. The Blueprint schema is the complete specification; do not infer it from a rendered report.

## 2. Execute and publish

The frozen Workflow graph runs its dependent report Operations. The model receives only the validated request shape. The generalized Ark Responses adapter accepts the report JSON/Markdown documents and ordered verified images for staged HTML output. PPTX conversion/local assembly has separate bounded subprocess/resource controls. An appended customer PPTX is private final-assembly input, not model prompt content.

The workers validate/stage outputs, publish typed Assets and settle the aggregate through durable execution. Partial failure, explicit retry and presentation generation follow server eligibility rather than restarting every completed provider node.

## 3. Open a capability URL

Fetch the completed Workflow using authenticated API access. Select its typed report/presentation output and fresh expiry metadata. The server issues a short-lived URL such as `/v1/workflows/{design_job_id}/report?token=...`; the browser/web-view uses that capability without a general API Bearer header. Presentation download has its own capability route and attachment behavior.

The token binds the intended Job/purpose and expiry. Treat it as a secret bearer capability: do not log/share it as permanent identity. After expiry, refetch the authenticated Workflow to obtain current output URLs. A cached URL is not a reason to weaken validation or place a long-lived JWT in a browser query.

## 4. Mini-program rendering

The report viewer checks capability identity/expiry before navigation and handles unavailable/expired results. WeChat/Douyin web-view domain requirements and HTTPS configuration must be satisfied separately. A working desktop URL alone does not prove the mini-program domain is approved.

HTML publication and conversion retain their content/network isolation controls; generated content is untrusted model output. Do not inject it into Admin or a generic unrestricted page. Use the existing report route rather than opening an object-store raw HTML URL directly.

## Compatibility and troubleshooting

- Missing presentation on a historical HTML-only report can be valid; inspect typed outputs and pipeline version.
- A retired Blueprint/quote body requires rebuilding from current discovery/schema, not changing one old template name.
- An expired view token requires an authenticated fresh Job read; a failed Job requires its explicit retry flow.
- Output/Asset verification failures are backend integrity failures; replacing the URL in the client is not a repair.

See [Workflow lifecycle](/reference/flows/design-job-lifecycle) and [reports](/backend/reports) for execution and result selection.

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions).

- [Blueprint composition](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/reportBlueprint.ts)
- [Report submission](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/reportDesignSubmit.ts)
- [Report source Blueprint contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/design_report/design_report_sources.py)
- [Report publication/capabilities](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/design_report/workflow_report_publication.py)
- [Workflow output projection](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/api.py)
