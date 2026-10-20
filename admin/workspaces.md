# Enterprise workspace operations

`/admin/workspaces` manages shared enterprise workspaces. Personal workspaces are permanent and are not deleted through this screen.

## Create and find a workspace

Creation accepts name, a registered owner's phone, initial Tokens and member limit. The limit includes the owner. The server checks owner eligibility and owned-workspace allowance; an administrator account is not a customer enterprise member.

Search matches enterprise/member identity, phone or ID. The capacity filter and paginated results help find full workspaces. A capacity change cannot reduce seats below current membership. Pending invitations do not reserve seats; invitation acceptance checks live capacity again.

## Audited changes

| Control | Effect |
| --- | --- |
| Member limit | Adjust current capacity, including owner |
| Signed Token delta | Change the enterprise wallet with ledger evidence |
| Remove workspace | Retire enterprise access and membership while retaining required records |

Enterprise spendable Tokens equal `remaining_tokens - reserved_tokens`. A negative adjustment cannot consume funds already held by work. Funding the owner's personal wallet is a separate action.

Removal prevents current and former members from obtaining new access to retained Projects/deliverables. Already issued short-lived links and copied temporary inputs expire through their normal lifetimes. Planned removal should follow the authorized download/coordination period shown in the confirmation; it is not a mechanism to cancel provider-side work.

Customer owner/member management, share-card invitations and historical reads have different permissions from administrator operations. See [workspace access](/backend/workspaces-orgs) and [Projects](/backend/projects). The former report-config/default-enterprise controls are not part of the current product.

---

Source evidence · backend `b13cc566`: [app/admin/users.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/users.py) · [app/templates/admin/enterprises.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/enterprises.html) · [app/workspaces/workspaces.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/workspaces.py).
