# Workspace Membership and Project Access

A workspace is an access/billing boundary. Projects inside it remain creator-private. Invitation acceptance, owner views, removal history and financial identity must stay consistent across navigation and delayed responses.

## Phone invitation versus share invitation

An owner can invite a specific phone identity, or create a transferable share-card invitation. These are distinct protocols with separate records. A referral invitation records marketing attribution and does not grant enterprise access.

For a share invitation:

1. Owner calls `POST /v1/workspaces/{workspace_id}/share-invitations` with its required action key and the JSON body `{}` (`Content-Type: application/json`), receiving the one-time plaintext bearer and invitation identity/expiry. Omitting the body entirely is invalid.
2. The recipient submits the bearer in the body to public `POST /v1/share-invitations/preview`. Display safe workspace/inviter/availability metadata; do not grant access based on preview.
3. After authentication/consent, call `POST /v1/share-invitations/accept` under the recipient's account with the required idempotency key. The transaction rechecks token state/expiry, active enterprise, seat limit and membership rules.
4. Refresh profile/workspaces and select the resulting accessible workspace. Replayed accepted actions must not add another member/seat.

The owner can list invitations without retrieving bearer plaintext, or revoke a pending invitation through the DELETE endpoint. Used, expired, revoked, full or inactive invitations have different stable states; update the UI instead of retrying the same unavailable bearer forever.

## Roles and selected workspace

Workspace routes verify current membership and required owner role on every request. A cached workspace name or prior successful preview is not authority. Owner-wide Job/overview access is explicit; it does not let an owner edit another creator's private Project. Project creation/default/detail/move operations also check creator and original-workspace identity.

The frontend binds pending actions and caches to user/workspace/session generation. If someone switches account/workspace while a submit is pending, keep the original action identity and reconcile its result; do not silently submit its data into the newly selected workspace.

## Leave and removal history

A member leaves using `DELETE /v1/workspaces/{workspace_id}/membership`; owner removal targets a selected member. Refresh access immediately, then use removal notices/departed-history surfaces where the API permits them. Historical Jobs keep their original workspace/project association and financial source; leaving does not transfer enterprise-funded history into the personal wallet.

The singular `/v1/workspace*` invitation/inbox/owner routes remain compatibility surfaces. Prefer explicit plural selected-workspace interfaces for new integrations. Account deactivation and enterprise dissolution have their own guarded lifecycle and are not equivalent to deleting membership rows manually.

## Project lifecycle after joining

Read `/v1/project-statuses` and the caller's project list/default for the selected workspace. Scratch is a system Project; ordinary Projects require current fields and count/quota rules. A Job move sends expected source and target Project identities to detect races. Outcome-enabled WON/LOST status and loss data are versioned backend capabilities, not client-created enum extensions.

Verify preview-before-login, last-seat races, duplicate accept, revoked/expired bearer, role changes, removal during active UI, account/workspace switches, departed history and private Project boundaries. See [workspace backend](/backend/workspaces-orgs) and [data model](/reference/data-model).

## Source evidence

Verified against the [documented source revisions](/reference/source-revisions).

- [Share invitation state and locking](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/share_invitations.py)
- [Selected workspace routes](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/workspace_api.py)
- [Private Project API](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/project_api.py)
- [Workspace access repository](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/repositories/workspaces.ts)
- [Normative invitation and history contract](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md)
