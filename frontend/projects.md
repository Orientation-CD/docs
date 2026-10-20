# Projects and Enterprise Collaboration

Projects organize a user's customer information and plans inside a workspace. The client compiles this experience only with `VITE_ENABLE_PRIVATE_PROJECTS=true`; the server remains the authority for ownership, membership, capacity and permitted transitions.

## Workspace, current project and default project

Each account has a personal workspace and may own/join enterprises. Switching workspace changes the available project list, balance and permissions. The temporary (`scratch`) project provides a stable fallback; ordinary projects carry editable customer/project fields.

The **current project** is the active UI selection. The **default project** is a saved preference. Neither is a lifecycle stage. Entering/re-entering a workspace, selecting a project and explicitly changing the default are separate actions; stale responses cannot overwrite a newer choice.

Home, project pages and submission flows use shared scoped selection. Project switches and plan counts are keyed by account/workspace. Count caches load without blocking the picker and are invalidated by submissions, retries, deletion and movement. The temporary entry stays available independently of ordinary-project filters.

## Stages and outcomes

Authenticated `GET /v1/project-statuses` provides the versioned phases, statuses, ordering, selectable flags, outcome types, lost reasons and stale-day rules. The client keeps a five-minute scoped cache and a minimal three-stage fallback; new status codes come from the server rather than a hardcoded TypeScript enum.

The UI separates the main progress stages from terminal outcomes such as won/lost when the server advertises them. Reverting a stage does not erase historical furthest progress. Outcomes retain their originating stage and closure metadata. A lost outcome can require a reason and an OTHER note of at most 100 Unicode characters; server validation remains authoritative.

The ordinary-project limit counts **20 in-progress projects**, excluding the temporary project and closed outcomes. Closed projects remain eligible for selection/default/binding under the current contract. Restoring follow-up can consume an in-progress slot and may be rejected at capacity; the UI uses the server response.

The backend's `PROJECT_OUTCOMES_ENABLED` is a deployment/migration concern. This frontend flag does not enable it. Follow the backend rollout procedure before turning on outcomes; do not mix incompatible reads across instances or treat a build as proof that outcome writes are enabled.

## Plans and deletion

Submission binds its accepted project and client-information snapshot. Changing the current project while a prepared/uncertain request exists must not silently retarget it. Plans can filter by project and move through the authorized action, invalidating both source and target counts.

Ordinary-project deletion offers the supported server modes: move its jobs to the temporary project or delete its jobs. A `202` deletion response is acceptance; refresh authoritative state rather than claiming immediate completion. The temporary project itself is not an ordinary deletable project.

## Enterprise owner overview

Owners can inspect current members, their projects, plan counts and activity when the backend supplies those fields. Activity sorting is gated on capability presence, not guessed from null values. Project cards distinguish stage progress, historical reach and independent outcomes.

Selecting a member project enters **read-only** detail/results and activity. The scope includes owner session, workspace and project; entry/resume reconfirms membership. Result polling still verifies current owner/workspace access. Read-only viewers cover image, text, video and reports without exposing submit, retry, move or delete controls.

Permission loss, account/workspace changes or a removed project invalidate the old view and return to a safe project entry. Full activity lists use a bounded native scroll container and provide back-to-top. Time labels use Beijing day boundaries and refresh while visible without fetching each project repeatedly.

## Enterprise membership

Roles are **owner** and **member**. Owners manage enterprise name, seats, invitations and member removal; there is no member-role editor. Members can leave using their supported self-leave action. Seat capacity includes the owner, and pending invitations do not reserve seats.

Invitation shares use the platform's native sharing surface with a single-use invite in the path. Acceptance rechecks membership and seats on the server. Removed or departed members' historical results are handled through the supported history views; their old membership does not grant current write access.

Use [Platforms](/frontend/platforms) for invitation clipboard/privacy setup and [Workspace flow](/reference/flows/workspace-membership-flow) for server-side details.

## Source evidence

Frontend `eca0a5f`, backend `b13cc56` (2026-10-20): [Context and deletion](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/repositories/projectContext.ts) · [Status catalog](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/repositories/projectStatusCatalog.ts) · [Member access](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/memberProjectRead.ts) · [Activity timeline](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-projects/services/projectActivityTimeline.ts).
