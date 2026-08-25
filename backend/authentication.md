# Authentication

This page explains how authentication works end to end: WeChat login,
JWT token pairs, refresh, logout, and the legal-document consent flow.

## Overview

The backend supports one primary authentication path — **WeChat login** — plus
a legacy email/password register/login for testing and admin-adjacent use. All
authenticated REST calls use a **Bearer access token** (JWT).

```
Mini program                 Backend                       WeChat
    │  wx.login()                │                             │
    ├───────────────────────────►│  1. code                    │
    │                            ├───────────────────────────► │  code2session
    │                            │◄────────────────────────────│  { openid, session_key }
    │                            │                             │
    │  (first time) getPhoneNumber()                            │
    │  phone code ─────────────►│  2. phone_code               │
    │                            ├───────────────────────────► │  getuserphonenumber
    │                            │◄────────────────────────────│  { phoneNumber }
    │  ← token pair ────────────┤  3. issue JWT pair           │
    │  (access + refresh)        │                             │
```

## WeChat login (`POST /api/v1/auth/wechat-login`)

### Request

```json
{
  "code": "<wx.login code>",
  "phone_code": "<optional, first registration>",
  "accepted_document_ids": ["<required legal doc ids>"]
}
```

### What the backend does

1. **Rate limit** the caller IP (auth attempts).
2. **Exchange the login code** (`wechat_auth.exchange_login_code`) with WeChat
   `sns/jscode2session` to obtain the **openid**.
   - Rejected code → `401 WECHAT_LOGIN_CODE_INVALID`.
   - WeChat unavailable → `503 WECHAT_AUTH_UNAVAILABLE`.
3. Look up the user by `wechat_openid`.
4. **First login** (no openid user):
   - Requires `phone_code`; otherwise → `428 PHONE_AUTH_REQUIRED`.
   - Exchanges the phone code for the verified phone number.
   - Re-checks the openid under a lock to avoid duplicate accounts on race.
   - Looks up by phone `e164`:
     - Phone already bound to a *different* openid → `409 WECHAT_IDENTITY_MISMATCH`.
     - No phone user → **create** the user (with optional initial token grant
       and a personal workspace).
     - Existing phone user → link the openid to that user.
   - Records `is_new_user`.
5. **Returning user**: verify active status, record legal acceptances (below),
   update `last_login_at`, issue tokens.

### Legal-document consent

The backend maintains a set of **required legal documents** (privacy policy,
user agreement, etc.). Before login completes, `record_required_acceptances`
persists the user's acceptance of the provided `accepted_document_ids`. The
frontend fetches current required docs and always includes them.

### Response

```json
{
  "access_token": "...", "refresh_token": "...",
  "access_expires_at": "...", "refresh_expires_at": "...",
  "token_type": "bearer",
  "is_new_user": true
}
```

## Token pairs

- **Access token** — short-lived JWT (default 900 s ≈ 15 min). Carries
  `sub` (user id) and `sid` (auth session id).
- **Refresh token** — long-lived JWT (default 30 days). Used only to rotate.

`issue_token_pair` (`api.py`) creates an `AuthSession` row (the refresh token's
identity) and signs both tokens. Rotation is enforced: using a refresh token
revokes/replaces the session.

## Refresh (`POST /api/v1/auth/refresh`)

```json
{ "refresh_token": "..." }
```

Validates the refresh JWT, loads the session, and returns a **new token pair**.
The mini program calls this automatically when a request returns
`401 AUTH_TOKEN_EXPIRED_OR_INVALID` (see
[Frontend request client](/frontend/architecture)).

## Logout (`POST /api/v1/auth/logout`)

Revokes the server-side auth session (invalidates the refresh token), so the
user's "session exit" is real on the server, not just local storage.

## Current-user dependency

Protected routes use `get_current_user` (`auth.py`):

1. Read the `Authorization: Bearer <access_token>` header.
2. Decode + verify the JWT signature/expiry → `401 AUTH_TOKEN_EXPIRED_OR_INVALID`
   on failure.
3. Load the user; inactive/removed users → `403 ACCOUNT_REMOVED`.

## Legacy password login

`POST /api/v1/auth/register` and `/api/v1/auth/login` support an email + password
path (with the same legal-acceptance fields). It is primarily for non-WeChat
testing / admin contexts; the product uses WeChat login.

## Security properties

- Passwords are stored as hashes (no plaintext).
- JWT secrets come from config (`JWT_SECRET`) and must be long/random in
  production.
- Rate limiting protects the auth endpoints against brute force.
- Sessions are revocable server-side (logout / refresh rotation).
- Account deactivation/anonymization is handled by the account-lifecycle module
  (`account_lifecycle_api.py` + cron anonymization).

## Full call chain

See [WeChat Login Flow](/reference/flows/wechat-login-flow) for the complete
frontend → backend → WeChat trace.

## Next steps

- [Design Jobs](/backend/design-jobs) — what happens after login.
- [Billing & Tokens](/backend/billing-tokens) — entitlements after login.
