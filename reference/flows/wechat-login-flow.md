# WeChat Login Flow (End-to-End)

This is the full call chain for **WeChat login / registration** — what happens from the
user tapping "登录/提交" in the mini program to receiving a token pair, including the
backend's exchanges with WeChat (or its local mock).

## Part 0 — Frontend prepares (accountGate)

```
User reaches a submission/login gate
        │
        ▼
Frontend src/services/accountGate.ts
  ensureRegisteredForAction()
    └─ registrationFlow (reactive) drives the login UI
```

For a **returning user**, the request body is just `{ code }`. For a **new user** it is
`{ code, phone_code, accepted_document_ids }`.

```
Frontend src/services/wechatAuth.ts
  requestFreshWechatLoginCode()          → wx.login()          (login code)
  buildReturningWechatLoginRequest()      → { code }
  buildRegistrationWechatLoginRequest(phoneCode, documents)
       • getPhoneNumber()                  (phone code)
       • fetch current required legal docs (accepted_document_ids)
```

If a stored token pair already exists, the request layer
(`src/services/request.ts`) first tries it silently; no WeChat round trip happens
unless the access token is rejected.

## Part 1 — Backend receives the login

```
POST /v1/auth/wechat-login
  body: { code, phone_code?, accepted_document_ids? }
        │
        ▼
FastAPI → app/api.py: wechat_login  (auth_router, prefix /v1/auth)
  1. enforce_rate_limit(namespace="wechat-login-ip", subject=client host,
       limit=AUTH_RATE_LIMIT_ATTEMPTS, window=AUTH_RATE_LIMIT_WINDOW_SECONDS)
  2. exchange_login_code(settings, code)
       POST WECHAT_CODE_TO_SESSION_URL  (https://api.weixin.qq.com/sns/jscode2session
                                          or the mock identity server locally)
       ──► { openid, session_key }
       • code rejected    → 401 WECHAT_LOGIN_CODE_INVALID
       • WeChat down      → 503 WECHAT_AUTH_UNAVAILABLE
  3. SELECT user WHERE wechat_openid = openid  (row lock, key_share)
```

## Part 2 — New user registration path

```
If no user exists for this openid:
  1. if phone_code missing → 428 PHONE_AUTH_REQUIRED
  2. commit the read transaction, then exchange_phone_code(settings, phone_code)
       POST WECHAT_PHONE_NUMBER_URL  (…/wxa/business/getuserphonenumber)
       ──► { countryCode, phoneNumber }
       • invalid  → 401 WECHAT_PHONE_CODE_INVALID
       • malformed→ 502 WECHAT_PHONE_INVALID
  3. normalize phone → phone_e164
  4. re-check openid under row lock (prevents concurrent duplicate accounts)
  5. SELECT user WHERE phone_e164 = phone
     • phone bound to a DIFFERENT openid → 409 WECHAT_IDENTITY_MISMATCH
     • no phone user → CREATE user:
           remaining_tokens = effective_campaign_token_amount(
               CampaignCode.NEW_USER_REGISTRATION, fallback=INITIAL_USER_TOKENS)
           allowed_workspaces = INITIAL_USER_ALLOWED_WORKSPACES
           + TokenLedgerEntry(reason=INITIAL_TOKEN_GRANT)  if tokens > 0
           + create_personal_workspace(db, user)
     • existing phone user → link wechat_openid to this user (is_new_user=false)
```

## Part 3 — Consent + tokens (both paths)

```
  6. verify user.is_active (else 403 ACCOUNT_REMOVED)
  7. current_required_documents(db, settings, locale)
     record_required_acceptances(user, documents, accepted_document_ids)
       → persists legal_document_acceptances rows
  8. user.last_login_at = now
  9. issue_token_pair(db, user, settings)
       • create auth_sessions row (sid)
       • sign access JWT (sub, sid, exp = ACCESS_TOKEN_SECONDS)
       • sign refresh JWT (sub, sid, exp = REFRESH_TOKEN_SECONDS)
 10. return WeChatLoginResponse
       { access_token, refresh_token,
         access_expires_at, refresh_expires_at, token_type: "bearer",
         is_new_user: true|false }
```

## Part 4 — Frontend persists and continues

```
Frontend src/stores/session.ts
  sessionTokenStore.applyTokenPair(response)
  1. persist under key "yuanzhu.session.tokens.v1" (SESSION_TOKEN_STORAGE_KEY)
  2. the interrupted action (e.g. design submission) continues
```

## Token refresh (automatic)

On any `401 AUTH_TOKEN_EXPIRED_OR_INVALID`:

```
request.ts → rotateTokens()
  POST /v1/auth/refresh  { refresh_token }
  app/api.py: refresh_user_token
    1. decode refresh JWT (sid, sub) → 401 REFRESH_TOKEN_INVALID if bad
    2. load auth_sessions (row lock)
    3. rotate/replace the session, sign a new pair
  → sessionTokenStore.applyTokenPair(response);
    replay the original request with the new access token
```

Concurrent 401s share one in-flight refresh promise — only one refresh call happens. A
terminal session error calls `sessionTokenStore.clear()`.

## Logout (server-side)

```
POST /v1/auth/logout
  app/api.py: logout_user   → 204 No Content
    • revoke/delete the auth_sessions row (invalidates the refresh token)
  Frontend sessionTokenStore.clear()
```

## Data written during this flow

| Table | What |
| --- | --- |
| `users` | new row (registration) / `last_login_at` / `wechat_openid` link |
| `token_ledger_entries` | `INITIAL_TOKEN_GRANT` (new user, if tokens > 0) |
| `workspaces` + `workspace_memberships` (+ `personal_workspaces`) | personal workspace (new user) |
| `legal_document_acceptances` | consent rows |
| `auth_sessions` | one row per token pair |

## Local vs production

- **Local / cloud-test:** `WECHAT_CODE_TO_SESSION_URL` and
  `WECHAT_PHONE_NUMBER_URL` point at `mock-wechat-identity-provider:8083`, so login and
  phone exchange are fully fake and deterministic.
- **Production:** the three `api.weixin.qq.com` URLs are used; `MOCK_WECHAT_IDENTITY_ENDPOINTS_ENABLED=false`.

## Related call chains

- [Design Job Lifecycle](/reference/flows/design-job-lifecycle) — the login gate appears
  right before submit.
- [Payment Flow](/reference/flows/payment-flow) — the same JWT protects payments.
