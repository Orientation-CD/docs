# User operations and account boundaries

`/admin/users` searches and paginates account identity/status, personal balances and owned-workspace allowance. All writes require an active admin session and CSRF. Administrator authority is distinct from a customer's enterprise owner membership.

## Money, capacity and allowance are different controls

| Control | Where to change | Effect |
| --- | --- | --- |
| Personal Token adjustment | User administration | Audited signed wallet delta; cannot consume active holds |
| Enterprise funding | Workspace administration | Separate enterprise wallet ledger |
| Owned-workspace allowance | Eligible user account | Permanent personal workspace plus active owned enterprises, range1..100 |
| Enterprise member monthly cap | Current owner quota APIs | Limits new reservations; no balance transfer or financial event |

Joined enterprises do not consume owned-workspace allowance. Reducing allowance must respect current ownership; it does not delete an enterprise. Funding an owner's personal account cannot cover an enterprise shortage. Global member quota save clears individual overrides; see [quota chain](/reference/flows/member-quota-flow) rather than inventing an admin control absent from this screen.

## Lifecycle actions

| Action | Meaning |
| --- | --- |
| Suspend | Administrative restriction, including owned-enterprise/member consequences |
| Reactivate | Restore an eligible suspended/deactivated account; retired memberships do not reappear |
| Assist voluntary deactivation | User-requested lifecycle path, including active-owned-enterprise and grace/recovery rules |
| Archive | Irreversible identity anonymization for an eligible deactivated account, retaining required audit/financial facts |

The server rechecks current state, ownership, active work and self-action restrictions. Read the confirmation's affected scope and existing recovery rules before an authorized action. Changes do not cancel an uncertain provider-side action or erase immutable accounting attribution. A quota pause affects new member reservations while previously accepted work can still settle/release.

The authenticated customer account lifecycle is documented in [authentication](/backend/authentication). Current enterprise owner read-only task detail and quota configuration are separate [workspace](/backend/workspaces-orgs) contracts.

---

Source evidence · backend `e59716c8`: [app/admin/users.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/users.py) · [app/identity/account_lifecycle_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/identity/account_lifecycle_api.py) · [app/billing/member_token_quotas.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/member_token_quotas.py) · [app/templates/admin/users.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/users.html).
