# 微信登录流程（端到端）

这是**微信登录 / 注册**的完整调用链——从用户在小程序里点击"登录/提交"，
到拿到令牌对（token pair）为止，包括后端与微信（或本地 Mock）之间的每次交换。

## 第 0 部分——前端准备（accountGate）

```
User reaches a submission/login gate
        │
        ▼
Frontend src/services/accountGate.ts
  ensureRegisteredForAction()
    └─ registrationFlow (reactive) drives the login UI
```

对于**老用户**，请求体只有 `{ code }`。对于**新用户**则是
`{ code, phone_code, accepted_document_ids }`。

```
Frontend src/services/wechatAuth.ts
  requestFreshWechatLoginCode()          → wx.login()          (login code)
  buildReturningWechatLoginRequest()      → { code }
  buildRegistrationWechatLoginRequest(phoneCode, documents)
       • getPhoneNumber()                  (phone code)
       • fetch current required legal docs (accepted_document_ids)
```

如果本地已存有令牌对，请求层（`src/services/request.ts`）会先静默试用它；
除非 access token 被拒绝，否则不会发生微信往返。

## 第 1 部分——后端接收登录

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

## 第 2 部分——新用户注册路径

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

## 第 3 部分——同意书 + 签发令牌（两条路径汇合）

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

## 第 4 部分——前端持久化并继续

```
Frontend src/stores/session.ts
  sessionTokenStore.applyTokenPair(response)
  1. persist under key "yuanzhu.session.tokens.v1" (SESSION_TOKEN_STORAGE_KEY)
  2. the interrupted action (e.g. design submission) continues
```

## 令牌刷新（自动）

收到任何 `401 AUTH_TOKEN_EXPIRED_OR_INVALID` 时：

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

并发的多个 401 共享同一个在途刷新 promise——只发生一次刷新调用。
终态会话错误会调用 `sessionTokenStore.clear()`。

## 登出（服务端）

```
POST /v1/auth/logout
  app/api.py: logout_user   → 204 No Content
    • revoke/delete the auth_sessions row (invalidates the refresh token)
  Frontend sessionTokenStore.clear()
```

## 本流程写入的数据

| 表 | 内容 |
| --- | --- |
| `users` | 新行（注册）/ `last_login_at` / `wechat_openid` 绑定 |
| `token_ledger_entries` | `INITIAL_TOKEN_GRANT`（新用户，若积分 > 0） |
| `workspaces` + `workspace_memberships`（+ `personal_workspaces`） | 个人工作区（新用户） |
| `legal_document_acceptances` | 同意书记录 |
| `auth_sessions` | 每个令牌对一行 |

## 本地 vs 生产

- **本地 / 云测：** `WECHAT_CODE_TO_SESSION_URL` 和
  `WECHAT_PHONE_NUMBER_URL` 指向 `mock-wechat-identity-provider:8083`，
  因此登录和手机号交换完全是假的、确定性的。
- **生产：** 使用三个 `api.weixin.qq.com` URL；`MOCK_WECHAT_IDENTITY_ENDPOINTS_ENABLED=false`。

## 相关调用链

- [设计作业生命周期](/reference/flows/design-job-lifecycle)——登录关卡就出现在提交前。
- [支付流程](/reference/flows/payment-flow)——同一个 JWT 保护支付。
