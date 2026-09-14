# Campaigns

The Campaigns page at `GET /admin/campaigns` (template `app/templates/admin/campaigns.html`) configures the free token grants the product hands out at acquisition milestones. It is intentionally simple — each campaign has exactly one configurable number: the token amount.

## What a campaign is

A **campaign** is a named code that grants a fixed number of tokens when a specific user event happens. Examples wired into the current product:

| Campaign code | Event | Min amount |
| --- | --- | --- |
| `NEW_USER_REGISTRATION` | A new user signs up. | 0 |
| Referral campaign code (from settings) | A referral reward is earned. | 1 |

Campaign codes are enumerated in `CampaignCode` (`app/db_models.py`). The page renders one card per known campaign.

## Editing a campaign

Each card shows the campaign name, description, the currently effective token amount, and an inline form to change it. Submit via `POST /admin/campaigns/{code}`.

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Token amount | number | Yes | Tokens granted per event. Range 0 … **1,000,000,000** (the `MAX_CAMPAIGN_TOKEN_AMOUNT` ceiling in `app/campaign_configuration.py`). | current value |
| Expected version | hidden | Yes | Optimistic-lock version used to detect concurrent edits. | current |

### How the save works

The save uses `save_campaign_token_amount(...)`:
- It takes a Postgres advisory lock on `campaign-configuration:<code>` so two admins cannot interleave writes.
- It compares the submitted `expected_version` to the stored version. If another admin saved in between, you get `409 CAMPAIGN_CONFIGURATION_CHANGED` and must refresh.
- On success the version increments and the acting admin is recorded as `updated_by_user_id`.

### Database vs. environment fallback

If no database row exists yet (bootstrap/migration gap), the effective amount falls back to the environment-configured default for that campaign (`effective_campaign_token_amount(..., fallback=...)`). Once you save on this page, the database value takes over permanently.

## Effects

- New registrations receive the configured number of free tokens immediately.
- Referral rewards credit the configured amount when the referral event triggers.
- Because the value is read at event time, **changing it applies only to future events** — it does not retroactively adjust already-granted balances.

## Tips

- Set the registration grant deliberately: it is your first-use cost. Too high inflates free usage; too low blocks users from trying the product.
- Keep referral amounts ≥ 1 and smaller than the registration grant unless you specifically want to reward invites over signups.
