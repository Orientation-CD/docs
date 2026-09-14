# User Management

The Users section at `GET /admin/users` (template `app/templates/admin/users.html`) lets you search registered customer accounts and adjust their entitlements. You cannot create customer accounts here — they self-register through the mobile app.

## Searching

Use the search bar (`_search.html`, `data-live-search`). It matches, live as you type:
- Display name
- Phone number (E.164)
- User ID
- Enterprise / workspace name

Results paginate at 50 per page (`_pagination.html`). There is no status filter on this page; suspended/deactivated accounts are flagged in the table.

## The users table

| Column | What it shows |
| --- | --- |
| User | Display name + user type badge (personal / enterprise / admin). |
| Phone | The account's E.164 phone. |
| Jobs | Number of design jobs belonging to this user. |
| Personal tokens | Current remaining balance, plus a "reserved" amount held by in-flight jobs. |
| Type | Account type badge. |
| Workspaces | Enterprise memberships this user holds (owner/member), plus the personal "allowed workspaces" allowance. |
| Status | Active / suspended / deactivated badge. |

Each row expands to expose the account actions described below.

## Actions

### Adjust tokens (`POST /admin/users/{id}/tokens`)

Top up or deduct a user's **personal** token balance.

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Adjustment | number | Yes | Signed delta in tokens. Range −1,000,000,000 … +1,000,000,000. Must not be `0`. | — |
| Reason | text | No | Free-text note recorded on the ledger entry. | — |

- Positive values credit the account (`TOKEN_ADJUSTMENT_CREDIT`); negative values debit it (`TOKEN_ADJUSTMENT_DEDUCTION`). A zero adjustment is rejected.
- The change writes a durable `TokenLedgerEntry` so finance and token-detail screens stay consistent.

### Allowed workspaces (`POST /admin/users/{id}/allowed-workspaces`)

How many enterprise workspaces a user may belong to.

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Allowed workspaces | number | Yes | Integer between **1 and 100**. | current value |

- You cannot lower this below the number of workspaces the user already owns — the server rejects it so owners are not stranded.

### Suspend / reactivate

Toggles the account between active and suspended (`account_status` / `is_active`). A suspended user cannot sign in or run jobs but their data is retained. Use the row's suspend/reactivate control.

### Archive deactivated users (soft remove)

Per the archive policy, deactivated users are archived immediately. The remove action (`POST /admin/users/{id}/remove`) performs a **soft archive** via `remove_user_account`: it marks the user removed/anonymized rather than deleting rows, preserving billing and job history.

> Removing/archiving a user is irreversible from the UI and keeps ledger records for finance. Prefer suspend when you may restore access later.

## Account lifecycle summary

| State | Meaning |
| --- | --- |
| Active | Can sign in and run jobs. |
| Suspended | Sign-in blocked; data retained. |
| Deactivated / anonymized | Soft-archived; appears removed from customer-facing surfaces, history preserved. |

## Tips

- Adjust tokens sparingly and always record a reason; every adjustment is auditable in the token ledger.
- Use [Workspaces](/admin/workspaces) to manage enterprise token pools and membership; this page only touches the user's *personal* balance.
