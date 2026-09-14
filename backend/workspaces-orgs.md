# Workspaces, Enterprises & Memberships

Every authenticated user operates inside a **workspace**. Workspaces come in two
flavors — **personal** and **enterprise** — and they govern which assets,
design jobs, reports, and token balance a request can touch. This page explains
the workspace model, enterprise memberships and roles, invitations, and how the
referral system attaches to accounts. Code lives in `app/workspaces.py` and
`app/workspace_api.py`; tables are on the [Data Model](/reference/data-model)
page.

## The `Workspace` hierarchy

`Workspace` is the shared base table. Two kinds exist (`WorkspaceKind`):

| Kind | Row | Owned by | Token wallet |
| --- | --- | --- | --- |
| `PERSONAL` | `personal_workspaces` | exactly one `User` | the user's personal `User` wallet |
| `ENTERPRISE` | `enterprises` | a group of members | a shared `Enterprise` wallet |

A personal workspace is created **automatically** when a user first logs in
(`workspaces.create_personal_workspace`, named `个人空间`) and is set as the
user's `current_workspace_id`. It can never be removed.

## Access rules

`workspaces.accessible_workspace(db, user, workspace_id)` is the single gate
every workspace-scoped endpoint calls:

- If the id resolves to a `personal_workspaces` row owned by `user`, access is
  granted (no membership needed).
- Otherwise it looks up the user's `enterprise_memberships` row for that
  enterprise; no membership → `403 WORKSPACE_ACCESS_DENIED`.
- If the enterprise is inactive or soft-deleted (`removed_at` set) →
  `409 WORKSPACE_INACTIVE`.

For writes, `lock_accessible_workspace` takes row locks in a fixed order
(Enterprise → Membership) to avoid deadlocks.

## Roles

Enterprise memberships carry an `EnterpriseRole`:

| Role | Can do |
| --- | --- |
| `OWNER` | manage members, invite/remove members, dissolve the enterprise, top up the enterprise wallet, edit report config |
| `MEMBER` | use the enterprise's tokens, create jobs, read shared assets/reports |

`require_workspace_owner(membership)` enforces owner-only mutations
(`403 WORKSPACE_OWNER_REQUIRED`).

## Current workspace & owned-workspace allowance

`User.current_workspace_id` points at the active workspace.
`ensure_current_workspace` repairs stale pointers: if the saved id is no longer
accessible, it falls back to the user's personal workspace.

A user may own a limited number of workspaces. `owned_workspace_count` counts
the personal workspace plus active enterprises where the user is `OWNER`; the
cap is `INITIAL_USER_ALLOWED_WORKSPACES` (default **2**, i.e. personal + one
owned enterprise). Joined memberships do **not** count against this allowance.

## Listing & detail

`list_workspace_summaries` returns the personal workspace first, then all active
enterprises the user belongs to (ordered by `joined_at`). Each summary reports
`remaining_tokens`, `reserved_tokens`, member count/limit, and (for personal
workspaces) the current subscription entitlement. `workspace_detail` returns
the member list for an enterprise.

## Invitations

Two invitation systems exist:

### Enterprise invitations

`enterprise_invitations` rows bind an email/phone to an enterprise + role with a
token and an expiry (`ENTERPRISE_INVITATION_HOURS`, default 72). The owner
creates one (`create_enterprise_invitation`), and a recipient accepts it
(`accept_enterprise_invitation_by_id`), which is bounded by
`ensure_enterprise_member_capacity` against `Enterprise.member_limit`. Owners
can revoke (`revoke_enterprise_invitation`) or decline/remove members
(`decline_enterprise_invitation`, `remove_enterprise_member`).

### Workspace share invitations

`workspace_share_invitations` (plus `share_invitation_idempotency`) support
share links with their own preview/accept rate limits
(`SHARE_INVITATION_PREVIEW_RATE_LIMIT_ATTEMPTS`,
`SHARE_INVITATION_ACCEPT_RATE_LIMIT_ATTEMPTS`, window 300s).

## Access walk-through

Take a request for `workspace_id = <X>`. `accessible_workspace` runs the
following checks in order:

1. Is `<X>` a `personal_workspaces` row owned by the current user? If yes,
   grant (the user owns it).
2. Otherwise, look up `enterprise_memberships` for
   `(user_id, enterprise_id = X)`. If none, return `403 WORKSPACE_ACCESS_DENIED`.
3. Load the joined `Enterprise`. If `is_active = false` or `removed_at` is set,
   return `409 WORKSPACE_INACTIVE`.
4. Otherwise grant and return `(enterprise, membership)`, exposing the caller's
   `role` so the endpoint can decide whether the action is owner-only.

This same gate backs asset reads, design-job creation, report reads, and token
spending — there is no separate per-resource ACL table; membership plus the
workspace row is the authorization.

## Create, switch, and leave

- A user creates an enterprise with `POST /v1/workspaces`. They become its
  first `OWNER`; this consumes one slot of `INITIAL_USER_ALLOWED_WORKSPACES`.
- `GET /v1/me/workspaces` returns the personal workspace first, then every
  active enterprise membership ordered by `joined_at`, plus the persisted
  `current_workspace_id`.
- A member leaves with `DELETE /v1/workspaces/{id}/membership`; an owner
  removes another member with `DELETE /v1/workspaces/{id}/members/{user_id}`.
- The owner dissolves the enterprise with `dissolve_enterprise`, which retires
  memberships without destroying billing/audit history.

## Dissolve & account lifecycle

An owner can dissolve an enterprise (`dissolve_enterprise`), which retires its
memberships and relationships without deleting the workspace row. On the user
side, deactivation flows are described in
[Authentication](/backend/authentication#account-lifecycle-endpoints):
`/me/deactivate` starts the grace period (`ACCOUNT_DEACTIVATION_GRACE_DAYS`,
default 7), after which a worker anonymizes the account. Admin actions can
suspend, reactivate, or archive a user.

## Referral system

Referrals attach an inviter → invitee relationship at registration time. The
relevant tables:

| Table | Purpose |
| --- | --- |
| `referral_invitations` | a user-created single-use invitation bearer (digest stored, token never returned after creation) |
| `referral_attributions` | immutable **first-wins** inviter→invitee attribution |
| `referral_identity_claims` | IP/device identity evidence for abuse review |
| `reward_grants` / `reward_grant_items` | promised token rewards |
| `reward_claims` / `reward_fulfillments` | explicit claim → fulfillment of tokens |
| `referral_reward_sources` | which purchase triggered a reward |
| `reward_outbox_events` | transactional outbox for downstream reward side-effects |
| `reward_operation_idempotency` | idempotency for reward mutations |

Flows (`app/referral_api.py`):

- `POST /v1/referral-invitations` — create a bearer (idempotent).
- `POST /v1/referral-invitations/preview` — public preview (IP-limited).
- `POST /v1/referral-invitations/accept` — a newly registered invitee binds the
  attribution (idempotent, first-wins).
- `GET /v1/rewards` — list the user's rewards.
- `POST /v1/rewards/claim` — claim reward tokens into the personal wallet.

The default campaign (`REFERRAL_CAMPAIGN_CODE=REFERRAL_FIRST_PURCHASE`) rewards
the inviter only after the invitee's first non-refundable purchase of at least
`REFERRAL_MINIMUM_PURCHASE_FEN` (990 fen). Runtime reward amounts are stored in
`campaign_configurations` with optimistic version control. See
[Billing & Tokens](/backend/billing-tokens#referral--campaign-token-grants).

## Read next

- [Authentication](/backend/authentication) — login and admin sessions.
- [Billing & Tokens](/backend/billing-tokens) — enterprise wallet top-ups.
- [Data Model](/reference/data-model) — all workspace/enterprise tables.
