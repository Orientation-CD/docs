# Workspaces, membership and current responsibility

An account has one permanent personal workspace and can own/join enterprises. An enterprise is a separate shared payer, with current owner/member authority. `current_workspace_id` is saved UI selection, not permission; each task still names its workspace/project and rechecks authority.

## Permission map

| Actor | Read boundary | Mutation boundary |
| --- | --- | --- |
| Original task author | Own eligible visible history | Original authorship plus current project responsibility and lifecycle |
| Current assignee | Assigned project and authorized predecessor results | Own new tasks and permitted project fields; cannot mutate predecessor tasks or reuse their inputs |
| Current enterprise owner | Shared pool, bounded member/project/task detail | Enterprise/member/quota settings, assignment; sales mode stage/outcome; specifically authorized mixed-author cleanup |
| Former member | Narrow permitted original-author history while enterprise remains available | No new enterprise submission or live project management |

[readable_design_job](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/read_access.py#L79) and `readable_project` separate task reading from project navigation. Authorized task detail can return typed text/image/audio inputs; nonauthor list projections still return `inputs:[]`. `job_response` and `finalize_workflow_reads` preserve the actual submitter and recheck current SQL authority after signed URLs are obtained. A detail read does not grant new Asset source reuse, continuation, retry, move or delete. Current responsibility and author checks still apply. Ineligible/hidden/missing task IDs share 404.

## Capacity and invitations

Owned-workspace allowance counts permanent personal plus active owned enterprises, not joined memberships. `INITIAL_USER_ALLOWED_WORKSPACES` defaults to 1; administrators can adjust eligible accounts up to 100. `member_limit` includes the owner. Pending invites do not reserve seats: creation and acceptance check current capacity.

Share-card invitations are seven-day bearer capabilities. Safe preview does not join; authenticated acceptance rechecks enterprise, seats, membership and invitation state atomically. Lists/revocation do not recover bearer secrets. See [membership](/reference/flows/workspace-membership-flow); older phone-bound/current-enterprise protocols remain in [compatibility](/reference/compatibility).

## Overview, quotas and dedicated sales metrics

Members receive shared remaining/reserved/available balances and consumption; private member/history arrays remain null. Current owners additionally receive bounded member/project projections and quota metadata. Current members' projects are grouped by current assignee, not historical creator. Overview attachment/signing is followed by a fresh owner authority check, so a demotion during storage work cannot retain an owner projection.

The current mini-program now exposes a separate owner member-management page, global/individual quota editor and member self-quota display. [Quota configuration](/reference/flows/member-quota-flow) limits new member reservations; it does not transfer Tokens or ownership. Global save clears every custom override, even retained departed-member overrides and same-value saves. Individual overrides survive leave/rejoin unless reset globally. Zero pauses one member, null is unlimited, and `reserved` is a subset of `used`. Spendable enterprise wallet is checked before member quota on admission.

Sales conversion is a separate owner-only endpoint in [sales stages](/reference/flows/project-stages-flow#enterprise-sales-metrics). It uses the selected Beijing cohort and current membership/assignee snapshot; do not infer its denominator from a filtered overview page. The overview's daily-report summary does not imply a frontend report editor.

## Daily reports and membership segments

[Daily reports](/reference/flows/daily-report-flow) are backend-implemented authenticated integration APIs in this frontend revision. Current nonowners submit their own day; owners read/comment current members. Persisted `(workspace,user,joined_at,date)` identity prevents an old membership segment from appearing after rejoin. The start date comes from migrated `DailyReportState`, not a client setting. Submission freezes business activity; ordinary reads do not mark content or comments read. Time windows, report-content version and comment version are separate checks.

## Departure, handoff and removal

Leaving/removal ends live membership without rewriting historical authorship or ledger attribution. Owners can reassign a departed assignee's ordinary project to an active member. Already accepted tasks continue under frozen original authority; account/workspace changes are not supplier cancellation. Removing the enterprise prevents new protected reads; issued short-lived URLs retain their own expiry. Follow [assignment](/reference/flows/project-assignment-flow) for current result/cleanup permissions.

Source map: [app/workspaces/workspace_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/workspace_api.py) · [app/workspaces/workspaces.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/workspaces.py) · [app/billing/member_token_quotas.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/billing/member_token_quotas.py) · [app/workspaces/daily_reports.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workspaces/daily_reports.py) · [app/workflows/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/workflows/api.py).
