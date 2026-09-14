# Getting Started

This page walks you through reaching Studio Control for the first time: where to find it, how to log in, how sessions behave, and how to create an administrator account.

## Access the console

### Local development

Start the application server the way you normally run it (see the backend [getting-started](/backend/getting-started) guide), then open:

```
http://localhost:8000/admin
```

If you are not signed in, you are redirected to `GET /admin/login`. There is no separate dev port — the admin panel is served by the same FastAPI process.

### Production

Use the application's public origin:

```
https://<your-prod-host>/admin
```

Because admin routes share the production service, they are protected by the same network/HTTPS posture as the customer API. Do not expose `/admin` to the public internet without network-level protection in addition to login.

## First login

The login screen (`app/templates/admin/login.html`) has two fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| Phone number | text | Yes | The E.164-normalized phone of an administrator account. |
| Password | password | Yes | The account password. |

- Submit via `POST /admin/login`.
- There is **no "forgot password" or self-registration** on this screen.
- Failed logins are rate-limited per IP and per account (bounded by `auth_rate_limit_attempts` over `auth_rate_limit_window_seconds`). After repeated failures you must wait for the window to clear.
- On success you land on the dashboard at `/admin`.

## Creating an administrator account

Admin accounts are ordinary `User` rows with `user_type = "admin"`. There is no admin self-registration UI. Create one directly against the database (or through a seed/migration) with:

| Column | Required | Notes |
| --- | --- | --- |
| `phone_e164` | Yes | Unique phone used to log in. |
| `password_hash` | Yes | A salted password hash produced by the same hashing function the app uses (do not store plaintext). |
| `display_name` | Yes | Shown in the sidebar footer. |
| `user_type` | Yes | Must be `ADMIN`. Any other value is rejected at login. |
| `is_active` | Yes | Must be `true` to log in. |
| `account_status` | Yes | Must be `active`. |

> Never commit a real password or hash to documentation. Use a generated, strong password and rotate it through the normal account process.

After the row exists, go to `/admin/login` and sign in with that phone and password.

## Session lifecycle

Once logged in:

- A **signed browser session cookie** is set, containing your `admin_user_id`, a fresh `admin_session_id`, and a `csrf_token`.
- A matching entry is stored in **Redis** under `admin-session:v1:active:<your-admin-id>`. This is the "active session" registry.
- Sessions live for **8 hours** (`ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60`). After that you must log in again.
- **Only one session per admin at a time.** If you log in from a second browser/device, the first session is invalidated and its owner is bounced to the login page.
- Every form POST you submit includes the CSRF token; expired or mismatched tokens return `403 CSRF_TOKEN_INVALID`.

## Language

The sidebar top-right has a language selector (`Simplified Chinese` / `English`). Choosing one writes the `admin_language` cookie and reloads the page. This preference is stored only in your browser — it does not affect other admins.

## Logging out

Click the **Logout** button in the sidebar footer (a `POST /admin/logout` form). This:
- Revokes your active Redis session (via a compare-and-delete so it only logs out the session that still owns the account),
- Clears the signed session cookie,
- Redirects you back to `/admin/login`.

You must log in again to use the console.

## Where to go next

- Land on the dashboard and start monitoring: [dashboard](/admin/dashboard)
- Start managing accounts: [users](/admin/users)
- Set up billing and pricing: [billing](/admin/billing)
- Wire up models: [providers](/admin/providers)
