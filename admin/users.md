# User operations

`/admin/users` searches and paginates accounts, shows identity/status, personal balances and the owned-workspace allowance. User operations require the active admin session and CSRF token.

## Balances and allowance

A signed integer Token adjustment writes an auditable ledger entry. Negative adjustments cannot reduce the balance below active reservations. Check the resulting ledger before retrying an uncertain form response.

The allowance is between 1 and 100 and counts the permanent personal workspace plus active owned enterprises. Joined memberships do not consume it. Reducing an allowance must satisfy current ownership constraints; it is not a way to remove an enterprise. See [Workspaces](/admin/workspaces).

## Distinct account actions

| Action | Meaning |
| --- | --- |
| Suspend | Administrative access restriction, with owned-enterprise/member effects |
| Reactivate | Restore an eligible suspended/deactivated account; retired memberships do not reappear |
| Assist voluntary deactivation | Requires the user's request and removal of active owned enterprises; applies normal grace/recovery rules |
| Archive | Irreversible identity anonymization for an eligible deactivated account |

The UI exposes only applicable lifecycle actions; the server rechecks account state, owned enterprises, active Jobs and self-action restrictions. Archiving removes identity/recovery data while retaining required financial/audit records; it is not ordinary reversible suspension.

Planned suspension/removal can cut off member access to owned enterprises. Coordinate the download period and affected members before the authorized action. Active work may continue or settle; account state changes are not provider cancellation.

Customer credential-verified lifecycle APIs are described in [authentication](/backend/authentication). Enterprise-wide balances are adjusted on the workspace page, not by adding personal Tokens to its owner.

---

Source evidence · backend `b13cc566`: [app/admin/users.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/users.py) · [app/identity/account_lifecycle_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/identity/account_lifecycle_api.py) · [app/templates/admin/users.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/users.html).
