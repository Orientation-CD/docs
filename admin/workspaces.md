# Workspaces (Enterprises)

The Workspaces section at `GET /admin/workspaces` (template `app/templates/admin/enterprises.html`, the "enterprises" naming in code maps to the "Workspaces" sidebar label) manages enterprise token workspaces — shared token pools owned by one user and used by a team.

## Create a workspace

The top form creates a new enterprise:

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Name | text | Yes | Workspace display name (≤120 chars). | — |
| Owner phone | text | Yes | E.164 phone of the user who will own the workspace. Must already exist. | — |
| Initial tokens | number | Yes | Token balance seeded into the workspace. | 0 |
| Member limit | number | Yes | Max members; integer 1 … 1,000,000. | 50 |

Submitted via `POST /admin/workspaces`. The owner becomes an `owner` membership and receives the seeded token pool.

## The workspaces table

| Column | What it shows |
| --- | --- |
| Workspace | Name + internal ID. |
| Token balance | Current workspace token pool (remaining). |
| Owner | Display name of the owner. |
| Members | Current member count vs. the configured member limit. |
| Actions | Per-row controls: adjust tokens, report config, member limit, remove. |

## Per-workspace actions

### Adjust tokens (`POST /admin/workspaces/{id}/tokens`)

Top up or deduct the workspace's **shared** token pool.

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Adjustment | number | Yes | Signed delta, range −1,000,000,000 … +1,000,000,000, must not be `0`. | — |
| Reason | text | No | Ledger note. | — |

### Member limit (`POST /admin/workspaces/{id}/member-limit`)

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Member limit | number | Yes | Integer 1 … 1,000,000. Cannot be set below the current number of members. | current |

When a workspace reaches its limit, its owners cannot invite new members and the dashboard raises an "enterprise is full" alert.

### Report config (`POST /admin/workspaces/{id}/report-config`)

Sets the per-workspace report layout override. This is a free-form JSON blob (max **64 KiB**) that tells the report system which template/sections to use for this workspace. Use the row's "report config" control to edit the JSON; it is applied atomically and the row refreshes in place.

### Report default (`POST /admin/workspaces/{id}/report-default`)

Promotes this workspace's report layout to the **default** for personal reports across the product. Cleared with `POST /admin/workspaces/report-default/clear` (no path id). Only one workspace can hold the global report default at a time.

### Remove (`POST /admin/workspaces/{id}/remove`)

Dissolves the enterprise via `dissolve_enterprise`. Memberships are removed and the workspace is soft-archived; billing history is retained. Confirm before acting — owners lose access to the shared pool.

## How workspaces relate to users

- A user's "allowed workspaces" (set on the [Users](/admin/users) page) bounds how many enterprises they can join/own.
- Member vs. owner roles are shown on the Users page workspace badges.
- Enterprise token consumption appears as `scope = "enterprise"` in the token ledger, separate from personal usage.
