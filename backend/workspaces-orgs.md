# Workspaces and enterprise access

Every standard account receives one permanent personal workspace. Enterprise workspaces are separate shared wallets with owner/member memberships. Every submission names its workspace explicitly; the saved `current_workspace_id` is a UI preference, not permission to choose a different payer.

## Membership and ownership

Personal resources belong to their user. Enterprise access requires current membership in an active enterprise. Owners manage name, seats, invitations and members; ordinary members cannot use owner management routes. Membership does not automatically grant every member access to another person's private Project or Workflow input.

The owned-workspace allowance counts the permanent personal workspace plus active enterprises the account owns. Joined enterprises do not consume it. The runtime default for `INITIAL_USER_ALLOWED_WORKSPACES` is **1**; development examples may choose another value. Administrators can adjust a user's allowance up to 100.

Enterprise `member_limit` includes the owner. Pending invitations do not reserve seats; invitation creation and acceptance both enforce current capacity. Phone-targeted invitation routes remain compatibility options for existing registered accounts.

## Share-card invitations

An owner creates a seven-day bearer share invitation. Public preview exposes display-safe metadata only. Acceptance requires an authenticated account and atomically rechecks membership, invitation state and seats. Store bearer invitation links carefully; previewing one is not joining the workspace. Owners can list/revoke their invitations.

## Leaving and historical access

Leaving/removal retires live membership. The departed-workspace history endpoint and removal notices preserve the explicit history experience without restoring management/submission access. Former members may retain permitted reads/deletion of their own historical tasks while the enterprise is active; workspace removal disables new access to retained Projects/deliverables. Already issued short-lived URLs expire normally.

Project lists/edits are creator-private. The enterprise overview returns shared balances to members and additional current/former-member consumption and project detail **only to the current owner**. See [Projects and activity](/backend/projects) for these response boundaries.

Enterprise billing never falls back to the member's personal balance. Refer to [Tokens](/backend/billing-tokens), [admin workspace operations](/admin/workspaces) and [REST API](/reference/rest-api) for exact owner/member errors and lifecycle rules.

---

Source evidence · backend `b13cc566`: [app/workspaces/workspace_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/workspace_api.py) · [app/workspaces/share_invitations.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/share_invitations.py) · [app/workspaces/workspaces.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/workspaces.py).
