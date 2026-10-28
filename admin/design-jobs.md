# Jobs, task families and diagnostics

`/admin/design-jobs` retains its administration URL while customer APIs use [Workflows](/backend/workflows). It searches parent/standalone task cards and shows included child tasks beneath their parent.

## Find the execution

Search by task, user, phone, provider identity or error and filter by status. Pagination totals refer to parent/standalone cards, not all child rows. Each card shows type, Token cost/state, timestamps, status, detail and diagnostic links. Expand included tasks to identify which dependency failed; a child's completion alone does not make the parent report complete.

Detail/diagnostics expose the durable Workflow/Operation/Submission identity and attempt evidence. Downloads require admin authorization and stored diagnostic availability. A diagnostic outage is not evidence that a provider never received the request.

## Bounded intervention

Terminal tasks can be removed where retained references and current lifecycle allow. Removal uses the shared durable cleanup path; an unavailable storage cleanup can require retry. Do not bypass reference checks by deleting bucket objects or database rows manually.

The detail view can offer a generation-bound **mark failed** action for eligible work. This is a local execution override, not provider cancellation or proof that an external paid call failed. The handler rechecks the current generation, state and provider evidence and lets normal reconciliation/finalization maintain parent accounting. Ambiguous provider acceptance remains non-repeatable unless the persisted contract permits retry.

Before intervention, preserve the current error, generation, diagnostics and affected IDs. Use [Performance](/admin/performance) to distinguish a live backlog from a stuck attempt. Configuration fixes belong in [Workflows](/admin/workflows) or [Models](/admin/providers), and do not rewrite an accepted run's frozen inputs.

---

Source evidence · backend `e59716c8`: [app/admin/workflows.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/workflows.py) · [app/admin/workflow_diagnostics.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/workflow_diagnostics.py) · [app/templates/admin/design_jobs.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/design_jobs.html).
