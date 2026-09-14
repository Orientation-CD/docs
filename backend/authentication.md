# Authentication

The backend has **two completely separate authentication systems**:

1. **Mobile API auth** — bearer JWTs for the WeChat Mini Program user, issued by
   `app/auth.py` and `app/wechat_auth.py`.
2. **Admin web auth** — a signed browser session + CSRF token for the
   server-rendered `/admin` site, owned by `app/admin.py` and
   `app/admin_sessions.py`.

They do not share tokens or cookies. A Mini Program user cannot log into the
admin site, and an admin password does not work as a Mini Program credential.

## Mobile auth overview

Mobile users are created on first WeChat login. There are two ways a user ends
up authenticated:

- **WeChat login** (primary, Mini Program): exchange a temporary `wx.login`
  code for an `openid`, then optionally verify a phone number.
- **Password login** (secondary): for accounts that set an E.164 phone +
  Argon2id password, used for reactivation and (in local/dev) testing.

Both flows ultimately return the same two-token pair: a short-lived **access
token** and a longer-lived **refresh token**.

## WeChat login flow (`app/wechat_auth.py`)

The Mini Program obtains a one-time code from `wx.login()` and sends it to the
backend. The server calls WeChat's `jscode2session` endpoint:

```
POST /api/v1/auth/wechat/login
{ "code": "<wx.login code>" }
```

`wechat_auth.exchange_login_code(settings, code)` performs a server-to-server
call to:

```
GET https://api.weixin.qq.com/sns/jscode2session
    ?appid=<WECHAT_APP_ID>
    &secret=<WECHAT_MINI_PROGRAM_APP_SECRET>
    &js_code=<code>
    &grant_type=authorization_code
```

The response's `openid` identifies the WeChat user. The backend upserts a
`User` row by `wechat_openid` (creating a personal workspace on first login;
see [Workspaces & Organizations](/backend/workspaces-orgs)), then issues JWTs.

Two exception types separate failure causes:

- `WeChatAuthenticationRejected` — WeChat said the code was invalid/expired
  (maps to `401 WECHAT_LOGIN_CODE_INVALID`).
- `WeChatAuthenticationUnavailable` — WeChat is unreachable or misconfigured
  (maps to `503 WECHAT_AUTH_UNAVAILABLE`).

### Phone-number binding

To bind/verify a phone, the Mini Program gets a `getPhoneNumber` code and the
server calls `exchange_phone_code`. This is a **two-step** call:

1. `POST https://api.weixin.qq.com/cgi-bin/stable_token` to obtain an
   `access_token` (cached client credential).
2. `POST https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=...`
   with `{ "code": <code> }` to receive `phone_info.countryCode` and
   `phone_info.purePhoneNumber`.

All three WeChat URLs are configurable
(`WECHAT_CODE_TO_SESSION_URL`, `WECHAT_STABLE_ACCESS_TOKEN_URL`,
`WECHAT_PHONE_NUMBER_URL`) so local development can point at the bundled mock
WeChat identity provider instead of `api.weixin.qq.com`.

## JWT design (`app/auth.py`)

Tokens are signed with PyJWT using `JWT_SECRET` and algorithm `JWT_ALGORITHM`
(default `HS256`).

### Access token

`create_access_token(user, settings)` produces:

```json
{
  "sub": "<user UUID>",
  "typ": "access",
  "iat": 1700000000,
  "exp": 1700000900
}
```

Lifetime: `ACCESS_TOKEN_SECONDS` (default **900** = 15 minutes). It carries
no session id; it is a stateless bearer.

### Refresh token

`create_refresh_token(user, session_id, settings)` produces:

```json
{
  "sub": "<user UUID>",
  "sid": "<auth_sessions row UUID>",
  "jti": "<urlsafe random>",
  "typ": "refresh",
  "iat": 1700000000,
  "exp": 1702592000
}
```

Lifetime: `REFRESH_TOKEN_SECONDS` (default **2,592,000** = 30 days). It is
bound to a durable `auth_sessions` row, so a session can be revoked server-side.

### Decoding & the `get_current_user` dependency

`decode_token(token, expected_type, settings)` verifies the signature and
**enforces the token type**: an access token cannot be used where a refresh is
required and vice versa (`401 AUTH_TOKEN_TYPE_INCORRECT`).

`get_current_user` (the FastAPI dependency used on every protected route):

1. Requires `Authorization: Bearer <token>` (else `401 BEARER_TOKEN_REQUIRED`).
2. Decodes an **access** token.
3. Loads the `User` by `sub`; rejects missing or inactive users
   (`401 ACCOUNT_UNAVAILABLE`).
4. **Commits and closes the read transaction immediately** so the endpoint
   does not pin a DB connection while doing slow work (uploads, Redis, storage).

## Password hashing

Passwords (only used for password login and reactivation) are hashed with
**Argon2id** via `argon2-cffi`:

```python
_password_hasher = PasswordHasher(time_cost=2, memory_cost=19_456, parallelism=1)
```

Hashing/verification run on a bounded worker thread
(`hash_password_async` / `verify_password_async`) behind an
`anyio.CapacityLimiter(2)` so a burst of logins cannot block the event loop.
Phone numbers are normalized to E.164 via `normalize_phone`
(`^\+[1-9]\d{7,14}$`).

## Rate limiting & brute-force protection

Auth endpoints are double-limited by `app/rate_limit.py` against Redis:

- per **client IP** (`request_client_host`), and
- per **account identifier** (phone or openid).

Both use `AUTH_RATE_LIMIT_ATTEMPTS` (default 10) over
`AUTH_RATE_LIMIT_WINDOW_SECONDS` (default 300). Reactivation endpoints reuse
the same limits under their own Redis namespaces.

## Account lifecycle endpoints

These live in `app/account_lifecycle_api.py`:

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/v1/me/deactivate` | bearer | start the grace period before anonymization |
| `POST /api/v1/auth/reactivate` | public, rate-limited | restore a deactivated account with phone+password |
| `POST /api/v1/auth/wechat-reactivate` | public, rate-limited | restore a deactivated account via WeChat `wx.login` code |

Deactivation sets a `deactivated_at` timestamp; after
`ACCOUNT_DEACTIVATION_GRACE_DAYS` (default 7) a worker anonymizes the account
(irreversible). Reactivation before the grace deadline restores access. See
[Workspaces & Organizations](/backend/workspaces-orgs) for the data model.

## Admin sessions and CSRF

The admin site (`/admin`) is a **server-rendered** website, not a JSON API.
It does not use the mobile JWTs.

### Login

`POST /admin/login` authenticates against `ADMIN_PHONE` + `ADMIN_PASSWORD`
(config env vars). On success it:

- creates a **signed browser session cookie** (signed with
  `ADMIN_SESSION_SECRET`; `ADMIN_SESSION_HTTPS_ONLY` enforces `Secure` in
  production),
- writes `request.session["admin_user_id"]`, `request.session["admin_session_id"]`,
  and a fresh `request.session["csrf_token"] = secrets.token_urlsafe(32)`.

### Single active session per admin

`app/admin_sessions.py` keeps **one active browser session per admin account**
in Redis under `admin-session:v1:active:<admin_user_id>` with a TTL of
`ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60` (8 hours). Logging in on a second
device replaces the first session. `require_admin(request, db)` re-checks that
the signed cookie's session id still matches the active one.

### CSRF on state-changing admin forms

Every admin POST form must include a `csrf_token` field
(`Form(min_length=20, max_length=256)`). `ensure_csrf(request, submitted_token)`
compares it with `secrets.compare_digest` against the session's stored token; a
mismatch returns `403 CSRF_TOKEN_INVALID`. This protects the HTML forms
(login, logout, suspend/reactivate/archive user, upload intents, etc.) from
cross-site request forgery.

### Admin user-state actions

The admin-only user actions are `include_in_schema=False` redirects:

| Endpoint | Purpose |
| --- | --- |
| `POST /admin/users/{user_id}/suspend` | suspend an account, retain billing/audit history |
| `POST /admin/users/{user_id}/reactivate` | restore a suspended account |
| `POST /admin/users/{user_id}/archive` | irreversibly anonymize an already-deactivated account |

All three require `require_admin` + `ensure_csrf` and redirect back to
`/admin/users` with `303 See Other`.

## Error codes cheat sheet

| HTTP | `detail.code` | Meaning |
| --- | --- | --- |
| 401 | `BEARER_TOKEN_REQUIRED` | no `Authorization: Bearer` header |
| 401 | `AUTH_TOKEN_EXPIRED_OR_INVALID` | JWT signature/expiry failure |
| 401 | `AUTH_TOKEN_TYPE_INCORRECT` | wrong token `typ` for this endpoint |
| 401 | `INVALID_ACCESS_TOKEN` | bad `sub` claim |
| 401 | `ACCOUNT_UNAVAILABLE` | user missing or inactive |
| 401 | `WECHAT_LOGIN_CODE_INVALID` | WeChat rejected the login code |
| 403 | `ADMIN_LOGIN_REQUIRED` | admin route without a valid admin session |
| 403 | `CSRF_TOKEN_INVALID` | admin form missing/mismatched CSRF |
| 503 | `WECHAT_AUTH_UNAVAILABLE` | WeChat endpoint unreachable/misconfigured |

## Read next

- [Workspaces & Organizations](/backend/workspaces-orgs) — what an authenticated user can see.
- [REST API](/reference/rest-api) — which endpoints require bearer auth vs admin.
