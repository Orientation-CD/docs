# Workspaces, membership and owner visibility

Every ordinary account has one permanent personal workspace. An enterprise is a separate shared wallet with owner/member relationships. `current_workspace_id` is a saved UI selection; each create request still names its payer and rechecks membership.

## Permission map

| Actor | Read | Write |
| --- | --- | --- |
| Creator | Own visible task/history and authorized private inputs/results | Own eligible task/Project actions, subject to current access and lifecycle |
| Current enterprise member | Shared balances, own quota and own permitted resources | Own eligible resources and submissions within enterprise capacity |
| Current enterprise owner | Shared balances, member/Project overview and visible enterprise task details | Enterprise settings, invitations, members and member quotas; own resource writes |
| Former member | Narrow permitted creator history while enterprise remains available | No new enterprise submission or Project management; only explicitly permitted historical actions |

The owner detail exception is **read-only**, including departed members' visible Jobs. `GET /v1/workflows/{id}` rechecks current ownership, enterprise and Project visibility; `submitted_by` names the real creator and another creator's `inputs` is always `[]`. It does not grant delete/move/retry/submit authority. Inaccessible, hidden and missing IDs share404. The selected workspace never grants access by itself.

## Enterprise capacity and invitation

Owned-workspace allowance counts the permanent personal workspace plus active enterprises owned, not joined memberships. Runtime `INITIAL_USER_ALLOWED_WORKSPACES` defaults to1; examples may choose another value. Administrators can adjust eligible accounts up to100. Enterprise `member_limit` includes the owner; pending invitations do not reserve seats, so creation and acceptance recheck capacity.

Current share-card invitations are seven-day bearer capabilities. Public preview shows safe display metadata; authenticated acceptance atomically rechecks enterprise, seats, existing membership and invitation state. Preview does not join. List/revoke does not expose recoverable invitation bearer secrets. Follow the [membership chain](/reference/flows/workspace-membership-flow); historical phone-bound protocols are isolated in [compatibility](/reference/compatibility).

## Owner overview and quotas

Members receive shared available/reserved balances and consumption; private member/history sections remain null. Only the current owner receives member arrays, Project details, quota configuration state and member `token_quota`. Former member overview rows omit current quota. The three [quota APIs](/reference/flows/member-quota-flow) affect new reservation capacity, not wallet balances or creator ownership.

A global member limit save clears every custom override, including departed members. Individual overrides survive leaving/rejoining unless cleared globally. Never model member quota as another purse to transfer; enterprise billing always draws the common pool.

## Departure and removal

Leaving/removal ends live membership while preserving creator provenance, ledger attribution and explicit historical access. Removing the enterprise prevents new access to retained Projects/deliverables; short-lived capabilities already issued expire normally. Account/workspace changes are not provider cancellation. See [Projects](/backend/projects), [admin workspaces](/admin/workspaces) and [integration status](/reference/integration-status) for the current UI and authority boundaries.

---

Source evidence · backend `e59716c8`: [app/workspaces/workspace_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workspaces/workspace_api.py) · [app/workspaces/workspaces.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workspaces/workspaces.py) · [app/billing/member_token_quotas.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/member_token_quotas.py) · [app/workflows/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/api.py).
