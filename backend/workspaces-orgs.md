# Workspaces & Organizations

Every design job belongs to a **workspace**. Workspaces come in two flavors —
**personal** and **enterprise** — and the system's sharing model is built on
them.

## The workspace model

| Kind | Created when | Owner | Members | Purpose |
| --- | --- | --- | --- | --- |
| **Personal** | On user registration (auto) | The user | — | Private design jobs |
| **Enterprise** (企业空间) | User creates it | The creator (owner) | Invited members | Shared plans for a team/company |

- A user can belong to **one personal** workspace and **any number of
  enterprise** workspaces.
- Design jobs are always created inside a workspace (`workspace_id` on the
  job).
- Role model is intentionally simple: **owner** and **member** only. There is
  **no member-role adjustment** — only the owner manages the enterprise.

## Enterprise workspace rules

- **Owner-only** operations: rename the enterprise, manage **seats** (席位),
  send/revoke **invitations**, manage **members**, view/delete **all plans** in
  the workspace.
- **Members** see and work on shared plans (depending on seat entitlement).
- Owner can remove a member; members can leave
  (`DELETE /workspaces/{id}/membership`).
- Owner can remove another member
  (`DELETE /workspaces/{id}/members/{member_user_id}`).

## Invitations & sharing

Invitations have two forms:

1. **Internal invitations** (`POST /workspaces/{id}/invitations`) — invite a
   known user by identity; they accept via
   `POST /workspace/invitations/{id}/accept` (also `decline` / `delete`).
2. **Share invitations** (`share_invitations.py`) — link-based invitations
   (`POST /workspaces/{id}/share-invitations`, `preview`, `accept`), with rate
   limits on preview/accept to prevent abuse. Invitations expire after
   `ENTERPRISE_INVITATION_HOURS`.

The mini program has an invitation page
(`pkg-account/pages/invitation`) for accepting and an organization page
(`pkg-account/pages/organization`) for owner management.

## Seats & billing

- Seats are the billing unit for enterprise membership (the owner allocates
  seats).
- Seat/entitlement logic is in `entitlements.py` +
  `subscription_entitlements.py`, and is exposed to the mini program through
  the Billing/Organization repositories.
- Workspace limits: `INITIAL_USER_ALLOWED_WORKSPACES` bounds how many
  **owned** workspaces a new user may have (personal + enterprises they own).

## Access control in the backend

`workspaces.py` provides `accessible_workspace` / `active_membership` helpers
used by every job/workspace endpoint:

- A user can only create jobs in workspaces where they are an **active member**
  (personal always qualifies).
- Listing jobs within a workspace (`/workspace/design-jobs`) requires
  **owner** access.
- Invitation accept/preview endpoints enforce membership/seat limits and rate
  limits.

## Full call chain

See [Workspace Membership Flow](/reference/flows/workspace-membership-flow).

## Next steps

- [Billing & Tokens](/backend/billing-tokens) — seats & subscriptions.
- [Design Jobs](/backend/design-jobs) — how jobs bind to workspaces.
