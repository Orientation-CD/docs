# Projects, responsibility and sales evidence

Project is a workspace grouping with separate immutable creator and current assignee. Workflows and floor-plan Works preserve their own authors when a project is handed off. Current responsibility governs new submission/management; the shared enterprise remains the payer. Follow [Project CRUD and cleanup](/reference/flows/project-flow), [assignment](/reference/flows/project-assignment-flow) and [sales stages](/reference/flows/project-stages-flow) for exact handlers and failure paths.

## Identity, selection and capacity

Each user/workspace has permanent scratch and server default preference. Device current selection is local. Project fields include customer/address/name, floor area and layout. List filters current assignee; owner detail can inspect ordinary enterprise projects. Responses expose creator/assignee, assignment versions and per-action permissions. New owner-delegated projects start with assignment metadata; handoff repairs the previous assignee's default to scratch. Name uniqueness and the 20-project capacity are assignee/workspace scoped; closed outcomes do not occupy capacity when outcomes are enabled, while cleanup can retain a slot.

## Two progress modes

`PROJECT_OUTCOMES_ENABLED` retains the older linear stage/outcome behavior. `PROJECT_SALES_STAGES_ENABLED` selects the newer independent-evidence model and also enables outcomes. Both default off. Read the authenticated catalog rather than inferring production flags from frontend code or schema presence.

In sales mode, `ProjectStageSource` contains manual, automatic and migration sources for seven independently lightable stages; `ProjectStageEvent` is the retained change audit. Current stage is highest lit source unless closed. WON requires measurement or store evidence. Automatic task evidence cannot be manually removed, nor can the last WON qualification. Reopening preserves evidence and rechecks assignee capacity. Dedicated PUT/DELETE stage routes and event feed share Project authority and transaction boundaries with the projected response and activity. The old furthest-stage/cycle explanation applies only to the older mode.

## Authorship, read-only access and accepted execution

[readable_design_job](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/read_access.py#L79) checks original task author, current owner or current project assignee; `readable_project` separately checks navigation. `finalize_workflow_reads` rechecks SQL authority after signing and computes mutation permissions. Viewing predecessor results does not transfer source ownership or task mutation rights. Original-author mutation also needs current responsibility. Already accepted work uses [active_task_project](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/project_jobs.py#L138), so handoff neither cancels it nor changes frozen billing provenance.

Whole-project cleanup locks all content authors and includes zero-job floor-plan Works. Mixed-author content requires owner authority; move-to-scratch routes each author's content to their own scratch. Asynchronous deletion commits durable claims before 202 and recovers delivery/cleanup; it is not complete when the row disappears from the active list.

## Activity, sales metrics and daily reports

Real project operations and eligible root task completion update trusted project activity. Reads, default selection and acknowledgement do not manufacture member activity. Activity trust failures remain errors, not inactive/zero projections.

Owner sales metrics use current membership/current assignee and earliest effective evidence dates for the selected Beijing cohort. Team ratios aggregate raw counts; zero denominators are null. This differs from the overview's filtered stage distribution. [Daily reports](/reference/flows/daily-report-flow) freeze actual creator/actor/author activity by Beijing day and current membership segment when submitted; they do not derive attendance from a project being currently assigned to someone.

Source map: [app/workspaces/project_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/project_api.py) · [app/workspaces/project_jobs.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/project_jobs.py) · [app/workspaces/project_stages.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/project_stages.py) · [app/workspaces/project_deletion.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/project_deletion.py) · [app/admin/enterprise_sales_metrics.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/enterprise_sales_metrics.py) · [app/workspaces/daily_reports.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/daily_reports.py).
