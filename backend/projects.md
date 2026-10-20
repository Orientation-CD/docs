# Projects, outcomes and enterprise activity

Projects group one creator's Workflows within an explicit workspace. They are private management records even inside an enterprise; the current owner's enterprise overview exposes a separately defined subset.

## Project lifecycle

Each user/workspace has scratch plus ordinary Projects, and a durable default selection. A device's current selection stays on that device. Project fields include name, customer, address, description, floor area and home layout. Scratch is not editable like an ordinary customer Project.

Use `/v1/workspaces/{workspace_id}/projects` for list/create, its Project detail/PATCH routes for updates, and `/default` to set the durable default. Deletion explicitly chooses `delete_jobs` or `move_to_scratch` and may complete asynchronously. Active work or retained dependencies can block the operation. Workflow moves keep their original request identity and billing provenance.

## Status catalog and outcomes

Authenticated `GET /v1/project-statuses` supplies ordered labels, stable codes and stale thresholds. Base stages are `NEW`, `REQUIREMENTS_CAPTURED` and `REPORT_PRODUCED`. A completed voice summary/report can advance the main stage through the existing stage rules.

`PROJECT_OUTCOMES_ENABLED` defaults to false. When enabled, the catalog adds `WON`, `LOST` and loss reasons; closing preserves the previous main stage and reopening starts a new cycle at the selected main stage. Only published selectable codes can be PATCHed. With the flag off there are at most 20 ordinary Projects plus scratch; enabled mode counts only in-progress ordinary Projects against that limit, so visible closed Projects may make the list longer.

Outcome activation requires the documented frontend adoption and protected API outage. Do not serve mixed flag states or disable the flag after outcome data exists. See [release controls](/deploy/sae-deployment).

## Progress and activity are different

`furthest_status` / `furthest_reached_at` form the current-cycle main-stage maximum. Moving backward preserves that maximum; reopening resets the cycle. An unknown/untrusted pair projects as two nulls.

Accepted Project changes and root Workflow operations stamp activity. Root final success/failure counts as Project activity, not as a human member operation. Reads, default selection, idempotent replay, automatic retry and child work do not create extra human activity. Clock-only updates do not change Project `updated_at`.

## Enterprise overview

Members receive shared balances/consumption; only owners receive member arrays, private project summaries, `last_active_at`, project `last_activity_at`, `plan_count` and thumbnail. `plan_count` is the root-history total for the current Project, not completed plans or images. Presence of the field, including zero, is the capability signal.

Activity trust is deployment-owned. Missing/malformed state returns `503 PROJECT_ACTIVITY_STATE_UNAVAILABLE` on affected operations; never interpret null as inactivity or seed/reset trust to bypass the error. Staleness uses Beijing calendar dates and the catalog threshold, with a hint only **after** the threshold is exceeded. See the full [REST contract](/reference/rest-api) for thumbnail selection, former-member privacy and recovery behavior.

---

Source evidence · backend `b13cc566`: [app/workspaces/project_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/project_api.py) · [app/workspaces/project_statuses.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/project_statuses.py) · [app/admin/enterprise_overview.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/enterprise_overview.py).
