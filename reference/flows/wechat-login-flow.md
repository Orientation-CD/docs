# WeChat Login Flow (End-to-End)

This is the full call chain for **WeChat login / registration** — what happens
from the user tapping "登录/提交" in the mini program to receiving a token pair,
including the backend's exchanges with WeChat.

## Part 0 — Frontend prepares (accountGate)

```
User reaches a submission/login gate
        │
        ▼
Frontend src/services/accountGate.ts → hasRegisteredSession()
  1. If tokens exist → try silent login with stored tokens
       (a normal authenticated API call; no WeChat round trip)
  2. If not → request WeChat login:
       • buildRegistrationWechatLoginRequest(phoneCode, documents)
         - calls wx.login()            → login code
         - calls getPhoneNumber()      → phone code
         - fetches current legal docs  → required document ids
```

For a **returning user** the request body is just `{ code }`. For a **new
user** it is `{ code, phone_code, accepted_document_ids }`.

## Part 1 — Backend receives the login

```
POST /api/v1/auth/wechat-login
  body: { code, phone_code?, accepted_document_ids? }
        │
        ▼
FastAPI → api.py:wechat_login
  1. enforce rate limit (per IP, AUTH_RATE_LIMIT_ATTEMPTS / window)
  2. exchange_login_code(settings, code)
       POST https://api.weixin.qq.com/sns/jscode2session
       (or the mock endpoint locally)
       ──► { openid, session_key }
       • code rejected    → 401 WECHAT_LOGIN_CODE_INVALID
       • WeChat down      → 503 WECHAT_AUTH_UNAVAILABLE
  3. SELECT user WHERE wechat_openid = openid
```

## Part 2 — New user registration path

```
If no user exists for this openid:
  1. if phone_code missing → 428 PHONE_AUTH_REQUIRED
  2. exchange_phone_code(settings, phone_code)
       POST https://api.weixin.qq.com/wxa/business/getuserphonenumber
       ──► { countryCode, phoneNumber }
       • invalid  → 401 WECHAT_PHONE_CODE_INVALID
  3. re-check openid under row lock (prevent duplicate accounts)
  4. SELECT user WHERE phone_e164 = normalized phone
     • phone bound to a DIFFERENT openid → 409 WECHAT_IDENTITY_MISMATCH
     • no phone user → CREATE user:
         remaining_tokens = INITIAL_USER_TOKENS
         allowed_workspaces = INITIAL_USER_ALLOWED_WORKSPACES
         + TokenLedgerEntry(reason=INITIAL_TOKEN_GRANT)  if tokens > 0
         + create_personal_workspace(db, user)
     • existing phone user → link wechat_openid to this user
```

## Part 3 — Consent + tokens (both paths)

```
  5. verify user.is_active (else 403 ACCOUNT_REMOVED)
  6. record_required_acceptances(user, required_docs, accepted_document_ids)
       → persists LegalDocumentAcceptance rows
  7. update last_login_at
  8. issue_token_pair(db, user, settings)
       • create AuthSession row (sid)
       • sign access JWT (sub, sid, exp = ACCESS_TOKEN_SECONDS)
       • sign refresh JWT (sub, sid, exp = REFRESH_TOKEN_SECONDS)
  9. return
     {
       access_token, refresh_token,
       access_expires_at, refresh_expires_at, token_type: "bearer",
       is_new_user: true|false
     }
```

## Part 4 — Frontend persists and continues

```
Frontend sessionTokenStore.applyTokenPair(response)
  1. persist under key "yuanzhu.session.tokens.v1"
  2. the interrupted action continues (e.g. the design submission)
```

## Token refresh (automatic)

On any `401 AUTH_TOKEN_EXPIRED_OR_INVALID`:

```
request.ts → rotateTokens()
  POST /api/v1/auth/refresh  { refresh_token }
  api.py:refresh_user_token
    1. decode refresh JWT (sid, sub) → 401 REFRESH_TOKEN_INVALID if bad
    2. load AuthSession (row lock)
    3. rotate/replace session, sign new pair
  → applyTokenPair; replay the original request with the new access token
```

Concurrent 401s share one refresh promise — only one refresh call happens.

## Logout (server-side)

```
POST /api/v1/auth/logout
  api.py:logout_user
    • revoke/delete the AuthSession (invalidates the refresh token)
  Frontend clears local tokens too (sessionTokenStore.clear)
```

## Data written during this flow

| Table | What |
| --- | --- |
| `users` | new row (registration) / `last_login_at` / `wechat_openid` link |
| `token_ledger_entries` | `INITIAL_TOKEN_GRANT` (new user, if tokens > 0) |
| `workspaces` + `workspace_memberships` | personal workspace (new user) |
| `legal_document_acceptances` | consent rows |
| `auth_sessions` | session row per token pair |

## Related call chains

- [Design Job Lifecycle](/reference/flows/design-job-lifecycle) — the gate
  appears right before submit.
- [Payment Flow](/reference/flows/payment-flow) — same JWT protects payments.
