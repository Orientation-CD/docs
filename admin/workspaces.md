# Enterprise workspace administration

`/admin/workspaces` manages shared enterprises. Personal workspaces are permanent and are not removed here. Customer owner settings and quota APIs have a separate membership-based authority.

## Creation and capacity

Creation requires a registered eligible owner, workspace name, initial enterprise Tokens and member limit. The owner counts toward that limit. Search can find enterprise/member identity, phone or ID; capacity filters help find full enterprises. Seat changes cannot reduce capacity below current membership, and pending invitations do not reserve seats.

| Control | State changed | State not implied |
| --- | --- | --- |
| Member limit | Current seat capacity | Token budget or a monthly member cap |
| Signed Token delta | Enterprise wallet and audit ledger | Owner's personal wallet |
| Remove enterprise | Retired access/membership with retained required records | Supplier cancellation or immediate revocation of already-issued short-lived capabilities |

Spendable balance is `remaining_tokens - reserved_tokens`; a negative adjustment cannot consume active holds. Check durable audit/ledger evidence before repeating an uncertain form submission.

## Member monthly caps and owner detail

The current owner's `member-token-limit` and per-member `token-limit` APIs control new reservations separately from funding. They are not administrator wallet adjustments. Every global save clears all custom overrides; individual0 is persistent pause. Current UI integration and API-only boundaries are listed in [integration status](/reference/integration-status).

Owner overview adds quota configuration and current-member quota only for the current owner. Owner read-only Workflow detail permits inspection of visible enterprise Jobs, including former members' Jobs, but hides private inputs and never grants creator writes. Admin Job diagnostics are yet another authenticated operational surface. Use [workspace access](/backend/workspaces-orgs) and [quota chain](/reference/flows/member-quota-flow) for exact role/errors.

## Removal and retained ownership

Removal blocks current and former members from obtaining new access to retained Projects/deliverables. Already-issued short-lived URLs expire normally. Planned removal follows the authorized coordination/download period in confirmation; it cannot promise provider-side cancellation. Job ownership, frozen input pins and financial attribution remain evidence for cleanup/recovery. Do not move enterprise charges into the owner's personal account or edit retained input rows to bypass a cleanup conflict.

---

Source evidence · backend `e59716c8`: [app/admin/users.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/users.py) · [app/workspaces/workspace_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workspaces/workspace_api.py) · [app/billing/member_token_quotas.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/member_token_quotas.py) · [app/templates/admin/enterprises.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/enterprises.html).
