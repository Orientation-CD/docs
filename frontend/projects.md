# Projects, member management and shared read-only results

The project experience is compiled with `VITE_ENABLE_PRIVATE_PROJECTS=true`. Server membership, returned permissions and current responsibility remain authoritative. Start from the [project chain](/reference/flows/project-flow), then follow [assignment](/reference/flows/project-assignment-flow), [sales stages](/reference/flows/project-stages-flow) and [member quotas](/reference/flows/member-quota-flow).

## Workspace → selection → accepted binding

`projectContextRepository` scopes device current selection to account/workspace. Server default is a separate saved preference; scratch is a permanent fallback. `designProjectBinding.ts` resolves accepted project/customer snapshot before submission. A later picker change must not retarget an accepted or uncertain request. Task writes and assignment events invalidate affected project lists/counts; known `assignmentVersion` prevents a delayed response from restoring previous responsibility.

The ordinary list now contains projects assigned to the current account, not all projects it originally created. Each response can carry creator, assignee, last assignment and permissions. Project editor supports owner creation for a current member, or an own **assign later** project. Detail offers Assign/Reassign and owner takeover. The assignment page refreshes profile/overview/detail before writing but retains the version the user actually confirmed. A timeout leads to refresh/reconciliation, not automatic repeated handoff.

## Follow the permission returned for each action

| Context | Current behavior |
| --- | --- |
| Current project assignee | Edit eligible fields, submit new own tasks and use returned project actions |
| Current enterprise owner | Inspect ordinary member projects, assign/handoff, manage quotas; in sales mode change stage/outcome |
| New assignee reading predecessor content | Read results and supported save/copy-link/download; cannot mutate or reuse predecessor inputs |
| Previous author | Own visible historical tasks remain attributable; current-project navigation and mutations require fresh authority |
| Mixed-author project deletion | Only owner may authorize whole-project cleanup |

`assignmentReadAccess` rechecks responsibility for protected reads/downloads. `memberProjectRead` fences owner views with session generation, workspace, current membership and scoped evidence. Results retain the true submitter. Authorized detail can carry typed source inputs and read-only playback/display follows its validated projection; nonauthor lists remain redacted. None of these projections grants source-copy permission. Always use server/client operation permissions rather than one URL query marker.

## Sales stage controls and dashboard

The server catalog selects base/outcomes/sales mode. Sales mode uses independently lit `stageFacts`, effective dates, source kinds and cancellation permissions. `ProjectSalesStages` opens the date/confirmation flow; `writeSalesStage` uses dedicated PUT/DELETE and `readSalesEvents` loads the event timeline. WON requires measurement or store evidence; reopening preserves evidence. The legacy mode still uses its own status semantics. The 20-project limit applies per current assignee/workspace and excludes closed outcomes when enabled.

The owner dashboard shows current members, attention and stage distribution from validated catalog/evidence. Missing capability is unavailable rather than zero. Sales conversion uses the dedicated server metric endpoint, selected month or all periods, current members and current assignees. `loadSalesMetrics` checks period, timezone and member set; zero-denominator ratios display a dash. It must not infer conversion by counting status labels from the visible filtered page. Activity/stagnation uses Beijing dates and server evidence, not a second write per project.

## Member management and quota UI

The owner opens Members from the enterprise dashboard and switches from the default Reports tab to Members and quota. The quota editor and write service live in the Projects subpackage. `MemberManagement` uses overview quota metadata and current member details; missing/error/previous-month data remains unavailable. `MemberQuotaSheet` allows global default or one member override, and explicitly explains that a global save clears all personal overrides. An individual zero pauses new work; null is unlimited. A same-value global save still reaches the server.

[saveMemberTokenLimit](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/pkg-projects/services/saveMemberTokenLimit.ts#L11) checks active account/workspace/current owner before and after the request, invalidates self/overview quota even if a save result becomes uncertain and never automatically replays a global overwrite. Self display uses `MyMemberQuota` and [readMyMemberTokenQuota](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/repositories/memberTokenQuota.ts#L29), keyed by account/workspace/Beijing month. Only exact missing-route 404 can hide the optional capability; stale month, invalid responses or scope loss are distinct errors. API rejection `MEMBER_MONTHLY_TOKEN_LIMIT_REACHED` preserves inputs and explains owner pause versus exhausted quota.

## Source map and learning sequence

| Read | Main entry | Question |
| --- | --- | --- |
| Selection and cache | [projectContextRepository](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/repositories/projectContext.ts#L203) | Which account, workspace and assignment version own this response? |
| Transfer | [assignProject](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/pkg-projects/services/projectAssignment.ts#L40) | What happens after uncertain commit or stale version? |
| Sales evidence | [writeSalesStage](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/pkg-projects/services/projectSalesStages.ts#L27) | Is this source manual, automatic or migrated? |
| Sales ratio | [loadSalesMetrics](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/repositories/projectSalesMetrics.ts#L35) | Which cohort and current member set are counted? |
| Quota | [saveMemberTokenLimit](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/pkg-projects/services/saveMemberTokenLimit.ts#L11) | Is this a global reset or one-member override? |
| Read-only content | [verifyAssignmentRead](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/services/assignmentReadAccess.ts#L7) | Does current authority still allow the result read? |

## How Projects opens daily reports

The Projects page shows current enterprise members a report action and a separate unseen-comment reminder. When the overview returns today’s summary, the owner’s Members entry shows required, submitted, missing and support counts. The dashboard flags three or more consecutive missed days. Members defaults to Reports, where the owner can select a date, open a submitted report and save a comment. Follow the editing, late submission and acknowledgement steps in [Daily reports](/reference/flows/daily-report-flow). [memberAttention](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/services/memberProjectDashboard.ts#L12)
