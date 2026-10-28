# Administrator setup and sessions

Open the running API origin plus `/admin`; unauthenticated navigation redirects to `/admin/login`. Admin HTML is served by the same FastAPI process, with no separate frontend development port.

## Bootstrap an administrator

Configure `ADMIN_PHONE`, `ADMIN_PASSWORD` and optional `ADMIN_DISPLAY_NAME` in the backend's authorized environment, then start the API through the [local stack](/deploy/local-stack) or normal deployment process.

At startup, `seed_configured_admin` creates the configured account and its personal workspace when absent, or promotes an existing account to administrator and ensures its personal workspace exists. **It does not reset an existing account's password.** Use that account's actual password or the authorized account recovery process. There is no admin self-registration or forgot-password screen.

Login accepts phone and password, verifies an active administrator and rate-limits failures. Merely setting `display_name` or owning an enterprise does not grant administrator access.

## Browser session

A successful login sets the signed `floorplan_admin` cookie and activates an eight-hour session in Redis. Only the current session per administrator remains valid; a second login replaces the first. Every mutation must carry the page's CSRF token. Logout revokes that matching active session and clears the cookie.

If the active-session store is unavailable, the site refuses authenticated operations. Reload/relogin after expiry or a replaced session; do not copy a CSRF token between browsers. Production configuration requires HTTPS-compatible origins and Secure cookie settings.

The language selector writes `admin_language` and reloads the page. This preference is browser-local. Start with [Overview](/admin/dashboard), then [Models](/admin/providers), [Workflows](/admin/workflows) and [Billing](/admin/billing).

---

Source evidence · backend `e59716c8`: [app/main.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/main.py) · [app/admin/auth.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/auth.py) · [app/identity/admin_sessions.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/identity/admin_sessions.py).
