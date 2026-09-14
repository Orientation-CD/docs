# Workspace & Membership Flow (End-to-End)

This is the full chain for **workspaces** — how a user's personal workspace is created
on first login, how they join an enterprise workspace via an invite link, and how
access/roles are enforced on every design job.

## Workspace model

Every user has exactly one **personal workspace**, created automatically on first login:

```
User (users) ───1:1──► Workspace (workspaces) ───1:1──► PersonalWorkspace (personal_workspaces)
                          │
                          ├──1:N──► WorkspaceMembership (workspace_memberships)
                          │
                          └──► Enterprise (enterprises)  (workspace_kind = enterprise)
                                  ├──1:N──► EnterpriseMembership (enterprise_memberships)
                                  └──1:N──► EnterpriseInvitation (enterprise_invitations)
```

- `workspaces` is the polymorphic root (kind: `personal` | `enterprise`).
- Personal workspace tokens are held on the `users` row (`remaining_tokens`).
- Enterprise tokens are held on the `enterprises` row; memberships carry roles
  (`owner` / `member`) and entitlements.

## Part 0 — Personal workspace on first login

```
WeChat login (new user)
  → create_personal_workspace(db, user)
      • INSERT workspaces (kind=personal, owner_id=user.id)
      • INSERT personal_workspaces (workspace_id)
      • INSERT workspace_membership (user_id, role=owner, is_primary=true)
```

This runs inside the same transaction as user creation, so a new user always has a
usable workspace before the token pair is returned.

## Part 1 — List / switch workspaces

```
GET  /v1/workspaces
  workspace_api.py → list_workspace_summaries(...)
    personal_workspace_summary(user) + enterprise_workspace_summary(ent)
    → [WorkspaceSummary]  (id, name, kind, role, token balance, active)

GET  /v1/workspaces/{workspace_id}
  workspace_api.py → workspace_detail(...)
    • accessible_workspace(db, user, id) enforces membership
    • roles, member count, entitlements, plan

PATCH /v1/workspaces/{workspace_id}
  workspace_api.py → update
    • require_workspace_owner(user, workspace)  (app/workspaces.py)
    • update name / settings
```

Every design-job / billing / asset request resolves its workspace through
`accessible_workspace(db, user, workspace_id)` (or `lock_accessible_workspace` for
writes): membership checked, workspace active, then business rules.

## Part 2 — Create an enterprise workspace

```
POST /v1/workspaces
  body: { name }
        │
        ▼
workspace_api.py → create_workspace
  1. get_current_user; owned_workspace_count(user)
  2. INITIAL_USER_ALLOWED_WORKSPACES limits how many enterprises a user can own
  3. INSERT workspaces (kind=enterprise)
       + enterprises row (name, token pool, capacity)
       + enterprise_memberships (user_id, role=owner)
  4. return WorkspaceDetailResponse
```

## Part 3 — Owner invites a member

```
POST /v1/workspaces/{workspace_id}/invitations
  body: { phone_e164?, role? }          (direct invitation)
        │
        ▼
billing_api.py / workspace_api.py
  create_enterprise_invitation(...)
    • require_workspace_owner
    • ensure_enterprise_member_capacity(...)
    • INSERT enterprise_invitations
        (workspace_id, phone_e164?, role, status=PENDING, token)
```

Or via a shareable link:

```
POST /v1/workspaces/{workspace_id}/share-invitations
  → workspace_share_invitations row (token, expires_at, role)
  → returns a link the owner copies into WeChat
```

## Part 4 — Invitee previews and accepts

```
Invitee opens the link in the mini program (must already be logged in)
        │
        ▼
POST /v1/share-invitations/preview
  body: { token }
  → { workspace_name, inviter_name, role, expires_at }
    (does NOT consume the invitation)
        │
        ▼
User taps "加入"
        ▼
POST /v1/share-invitations/accept
  body: { token }
        │
        ▼
app/billing.py: accept_enterprise_invitation_by_id(...)
  1. load invitation (row lock, enterprise lock)
  2. validate status=PENDING, not expired, not already a member
  3. _validate_pending_invitation(user, invitation)
  4. INSERT enterprise_memberships (user_id, enterprise_id, role)
  5. mark invitation ACCEPTED
  6. return membership summary
```

Direct (non-link) invites are accepted through
`POST /v1/workspace/invitations/{invitation_id}/accept`; decline via
`POST /v1/workspace/invitations/{invitation_id}/decline`, revoke via
`DELETE /v1/workspace/invitations/{invitation_id}`.

## Part 5 — Roles and permissions

| Action | Required role |
| --- | --- |
| Submit design jobs, spend tokens | member or owner (of the workspace) |
| View workspace detail, list members | any member |
| Rename workspace, edit settings | owner |
| Invite / revoke invitations | owner |
| Remove another member | owner |
| Leave a workspace (self) | member (`DELETE /v1/workspaces/{id}/membership`) |
| Dissolve enterprise | owner |

Enforcement points:

- `accessible_workspace(...)` — read path: membership exists, workspace active.
- `lock_accessible_workspace(...)` — write path: same, under a lock.
- `require_workspace_owner(...)` — owner-only mutations.
- Token spending on an enterprise draws from the **enterprise** pool (not the personal
  balance); `_locked_token_account(db, design_job)` selects `User` or `Enterprise`.

## Part 6 — Cleanup

- `remove_enterprise_member(...)` — owner evicts a member; their membership row is
  retired.
- `DELETE /v1/workspaces/{id}/members/{member_user_id}` — same.
- `dissolve_enterprise(...)` — owner dissolves; `_retire_user_relationships` retires
  memberships and leaves the workspace in a safe state.

## Data written

| Table | What |
| --- | --- |
| `workspaces` + `personal_workspaces` | one per user on first login |
| `workspace_memberships` | personal workspace membership |
| `enterprises` + `enterprise_memberships` | enterprise + owner/member rows |
| `enterprise_invitations` / `workspace_share_invitations` | pending/accepted invites |

## Related call chains

- [WeChat Login Flow](/reference/flows/wechat-login-flow) — creates the personal
  workspace.
- [Design Job Lifecycle](/reference/flows/design-job-lifecycle) — every job carries a
  `workspace_id` resolved through `accessible_workspace`.
- [Payment Flow](/reference/flows/payment-flow) — enterprise vs personal token pools.
