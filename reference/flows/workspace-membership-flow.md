# Workspace Membership Flow (End-to-End)

This is the full call chain for **enterprise workspace membership** — creating
a workspace, inviting a member, accepting an invitation, and the access checks
that happen when a member works inside the workspace.

## Part 0 — Frontend

The account subpackage exposes:

- **Organization page** (`pkg-account/pages/organization`) — owner manages the
  enterprise: rename, seats, invitations, members.
- **Invitation page** (`pkg-account/pages/invitation`) — accept/decline
  invitations.
- Every design feature page shows a **workspace switcher** (personal vs
  enterprise).

## Part 1 — Create an enterprise workspace

```
Owner taps 创建企业空间
        │
        ▼
Frontend POST /api/v1/workspaces
  body: { name, ... }
        │
        ▼
FastAPI → workspace_api.py
  1. authenticate
  2. check owned-workspace allowance (INITIAL_USER_ALLOWED_WORKSPACES)
  3. create Enterprise row + EnterpriseMembership(owner)
  4. return WorkspaceDetail
```

## Part 2 — Invite a member

```
Owner taps 邀请成员
        │
        ▼
Frontend POST /api/v1/workspaces/{id}/invitations   (owner only)
        │
        ▼
FastAPI → workspace_api.py
  1. authenticate + verify owner membership
  2. create EnterpriseInvitation (expires ENTERPRISE_INVITATION_HOURS)
  3. return invitation summary
```

There is also a **share-invitation** path (link-based):

```
POST /api/v1/workspaces/{id}/share-invitations    → create link
POST /api/v1/share-invitations/preview            → preview (rate-limited)
POST /api/v1/share-invitations/accept             → accept (rate-limited)
```

## Part 3 — Accept an invitation

```
Member opens the invitation (or the share link)
        │
        ▼
Frontend POST /api/v1/workspace/invitations/{id}/accept
        │
        ▼
FastAPI → billing_api.py / workspace_api.py
  1. authenticate
  2. load the invitation (must not be expired / revoked)
  3. idempotency guard (ShareInvitationIdempotency)
  4. create EnterpriseMembership(member)
  5. mark invitation accepted
  6. return the updated workspace
```

Decline / delete: `POST .../decline`, `DELETE .../{id}`.

## Part 4 — Working inside the workspace

Every subsequent operation inside the workspace runs membership checks
(`workspaces.py:accessible_workspace` / `active_membership`):

| Operation | Who is allowed |
| --- | --- |
| Create a design job in the workspace | any active member |
| List `GET /api/v1/workspace/design-jobs?workspace_id=` | owner |
| Rename workspace / manage invitations / manage members | owner |
| Leave (`DELETE /workspaces/{id}/membership`) | member |
| Remove a member (`DELETE /workspaces/{id}/members/{user_id}`) | owner |

## Part 5 — Owner management

The owner can:

- rename the enterprise (`PATCH /api/v1/workspaces/{id}`),
- manage **seats** (billing: `GET /api/v1/workspace`, invitations via
  `/api/v1/workspace/invitations`),
- view token detail (`GET /api/v1/workspaces/{id}/token-detail`),
- view/delete all plans in the workspace.

## Data written during this flow

| Table | What |
| --- | --- |
| `enterprises` / `workspaces` | the enterprise row |
| `enterprise_memberships` | owner row (create), member row (accept) |
| `enterprise_invitations` / `workspace_share_invitations` | invitations |
| `share_invitation_idempotency` | dedupe guard |

## Related call chains

- [Design Job Lifecycle](/reference/flows/design-job-lifecycle) — jobs bind to
  a workspace via `workspace_id`.
- [Billing & Tokens](/backend/billing-tokens) — seats & entitlements.
- [Workspaces & Organizations](/backend/workspaces-orgs) — the model.
