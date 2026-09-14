# 认证

后端有**两套完全独立的认证系统**：

1. **移动端 API 认证** —— 面向微信小程序用户的 bearer JWT，由
   `app/auth.py` 和 `app/wechat_auth.py` 签发。
2. **管理网站认证** —— 面向服务端渲染 `/admin` 站点的签名浏览器会话 + CSRF 令牌，由 `app/admin.py` 和
   `app/admin_sessions.py` 维护。

它们不共享令牌或 Cookie。小程序用户无法登录管理网站，管理密码也不能用作小程序凭证。

## 移动端认证概览

移动端用户在首次微信登录时创建。用户完成认证有两种方式：

- **微信登录**（主要方式，小程序）：用临时 `wx.login` code 换取 `openid`，然后可选地验证手机号。
- **密码登录**（次要方式）：面向设置了 E.164 手机号 + Argon2id 密码的账号，用于恢复账号和（本地/开发环境）测试。

两种流程最终都返回相同的双令牌对：短期的**访问令牌**和较长期的**刷新令牌**。

## 微信登录流程（`app/wechat_auth.py`）

小程序从 `wx.login()` 获取一次性 code 并发送给后端。服务器调用微信的 `jscode2session` 端点：

```
POST /api/v1/auth/wechat/login
{ "code": "<wx.login code>" }
```

`wechat_auth.exchange_login_code(settings, code)` 执行服务器到服务器的调用，访问：

```
GET https://api.weixin.qq.com/sns/jscode2session
    ?appid=<WECHAT_APP_ID>
    &secret=<WECHAT_MINI_PROGRAM_APP_SECRET>
    &js_code=<code>
    &grant_type=authorization_code
```

响应中的 `openid` 标识微信用户。后端按 `wechat_openid` upsert 一行
`User`（首次登录时创建个人工作区；参见
[工作区与组织](/backend/workspaces-orgs)），然后签发 JWT。

两种异常类型区分失败原因：

- `WeChatAuthenticationRejected` —— 微信称 code 无效/过期（映射到 `401 WECHAT_LOGIN_CODE_INVALID`）。
- `WeChatAuthenticationUnavailable` —— 微信不可达或配置错误（映射到 `503 WECHAT_AUTH_UNAVAILABLE`）。

### 手机号绑定

要绑定/验证手机号，小程序获取 `getPhoneNumber` code，服务器调用 `exchange_phone_code`。这是一个**两步**调用：

1. `POST https://api.weixin.qq.com/cgi-bin/stable_token` 获取
   `access_token`（缓存的客户端凭证）。
2. `POST https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=...`
   带 `{ "code": <code> }`，接收 `phone_info.countryCode` 和
   `phone_info.purePhoneNumber`。

三个微信 URL 均可配置（`WECHAT_CODE_TO_SESSION_URL`、`WECHAT_STABLE_ACCESS_TOKEN_URL`、
`WECHAT_PHONE_NUMBER_URL`），因此本地开发可以指向内置的 mock 微信身份提供方，而非
`api.weixin.qq.com`。

## JWT 设计（`app/auth.py`）

令牌使用 PyJWT 以 `JWT_SECRET` 和算法 `JWT_ALGORITHM`（默认 `HS256`）签名。

### 访问令牌

`create_access_token(user, settings)` 生成：

```json
{
  "sub": "<user UUID>",
  "typ": "access",
  "iat": 1700000000,
  "exp": 1700000900
}
```

生命周期：`ACCESS_TOKEN_SECONDS`（默认 **900** = 15 分钟）。它不携带会话 ID；是无状态 bearer。

### 刷新令牌

`create_refresh_token(user, session_id, settings)` 生成：

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

生命周期：`REFRESH_TOKEN_SECONDS`（默认 **2,592,000** = 30 天）。它绑定到持久的 `auth_sessions` 行，因此会话可在服务端吊销。

### 解码与 `get_current_user` 依赖

`decode_token(token, expected_type, settings)` 验证签名并**强制令牌类型**：访问令牌不能用于需要刷新令牌的地方，反之亦然（`401 AUTH_TOKEN_TYPE_INCORRECT`）。

`get_current_user`（每个受保护路由使用的 FastAPI 依赖）：

1. 要求 `Authorization: Bearer <token>`（否则 `401 BEARER_TOKEN_REQUIRED`）。
2. 解码**访问**令牌。
3. 按 `sub` 加载 `User`；拒绝缺失或不活跃用户（`401 ACCOUNT_UNAVAILABLE`）。
4. **立即提交并关闭读事务**，使端点在做慢工作（上传、Redis、存储）时不钉住数据库连接。

## 密码哈希

密码（仅用于密码登录和恢复）通过 `argon2-cffi` 以
**Argon2id** 哈希：

```python
_password_hasher = PasswordHasher(time_cost=2, memory_cost=19_456, parallelism=1)
```

哈希/验证在有界 worker 线程（`hash_password_async` / `verify_password_async`）上运行，背后有一个
`anyio.CapacityLimiter(2)`，因此登录突发不会阻塞事件循环。
手机号通过 `normalize_phone` 归一化为 E.164
（`^\+[1-9]\d{7,14}$`）。

## 限流与暴力破解防护

认证端点由 `app/rate_limit.py` 对 Redis 做双重限制：

- 按**客户端 IP**（`request_client_host`），以及
- 按**账号标识**（手机号或 openid）。

两者都使用 `AUTH_RATE_LIMIT_ATTEMPTS`（默认 10），窗口为
`AUTH_RATE_LIMIT_WINDOW_SECONDS`（默认 300）。恢复端点在各自的 Redis 命名空间下复用相同限制。

## 账号生命周期端点

这些位于 `app/account_lifecycle_api.py`：

| 端点 | 认证 | 用途 |
| --- | --- | --- |
| `POST /api/v1/me/deactivate` | bearer | 开启匿名化前的宽限期 |
| `POST /api/v1/auth/reactivate` | 公开，限流 | 用手机号+密码恢复已停用账号 |
| `POST /api/v1/auth/wechat-reactivate` | 公开，限流 | 通过微信 `wx.login` code 恢复已停用账号 |

停用设置 `deactivated_at` 时间戳；在
`ACCOUNT_DEACTIVATION_GRACE_DAYS`（默认 7）之后，worker 匿名化账号（不可逆）。在宽限期截止前恢复可恢复访问。数据模型参见
[工作区与组织](/backend/workspaces-orgs)。

## 管理后台会话与 CSRF

管理网站（`/admin`）是**服务端渲染**的网站，不是 JSON API。
它不使用移动端 JWT。

### 登录

`POST /admin/login` 对 `ADMIN_PHONE` + `ADMIN_PASSWORD`（配置环境变量）认证。成功时它会：

- 创建**签名浏览器会话 Cookie**（用 `ADMIN_SESSION_SECRET` 签名；`ADMIN_SESSION_HTTPS_ONLY` 在生产环境强制 `Secure`），
- 写入 `request.session["admin_user_id"]`、`request.session["admin_session_id"]`，以及一个新的 `request.session["csrf_token"] = secrets.token_urlsafe(32)`。

### 每个管理员一个活跃会话

`app/admin_sessions.py` 在 Redis 中为每个管理员账号保持**一个活跃浏览器会话**，键为 `admin-session:v1:active:<admin_user_id>`，TTL 为
`ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60`（8 小时）。在第二个设备登录会替换第一个会话。`require_admin(request, db)` 重新检查签名 Cookie 的会话 ID 仍与活跃会话匹配。

### 状态变更管理表单的 CSRF

每个管理 POST 表单必须包含 `csrf_token` 字段（`Form(min_length=20, max_length=256)`）。`ensure_csrf(request, submitted_token)` 用
`secrets.compare_digest` 将其与会话存储的令牌比较；不匹配返回
`403 CSRF_TOKEN_INVALID`。这保护 HTML 表单（登录、登出、暂停/恢复/归档用户、上传意向等）免受跨站请求伪造。

### 管理员用户状态操作

仅管理员可用的用户操作是 `include_in_schema=False` 的重定向：

| 端点 | 用途 |
| --- | --- |
| `POST /admin/users/{user_id}/suspend` | 暂停账号，保留计费/审计历史 |
| `POST /admin/users/{user_id}/reactivate` | 恢复被暂停账号 |
| `POST /admin/users/{user_id}/archive` | 不可逆地匿名化已停用账号 |

三者都需要 `require_admin` + `ensure_csrf`，并以 `303 See Other` 重定向回
`/admin/users`。

## 错误代码速查表

| HTTP | `detail.code` | 含义 |
| --- | --- | --- |
| 401 | `BEARER_TOKEN_REQUIRED` | 缺少 `Authorization: Bearer` 头 |
| 401 | `AUTH_TOKEN_EXPIRED_OR_INVALID` | JWT 签名/过期失败 |
| 401 | `AUTH_TOKEN_TYPE_INCORRECT` | 该端点令牌 `typ` 错误 |
| 401 | `INVALID_ACCESS_TOKEN` | `sub` 声明无效 |
| 401 | `ACCOUNT_UNAVAILABLE` | 用户缺失或不活跃 |
| 401 | `WECHAT_LOGIN_CODE_INVALID` | 微信拒绝了登录 code |
| 403 | `ADMIN_LOGIN_REQUIRED` | 管理路由无有效管理会话 |
| 403 | `CSRF_TOKEN_INVALID` | 管理表单缺少/不匹配 CSRF |
| 503 | `WECHAT_AUTH_UNAVAILABLE` | 微信端点不可达/配置错误 |

## 延伸阅读

- [工作区与组织](/backend/workspaces-orgs) —— 已认证用户能看到什么。
- [REST API](/reference/rest-api) —— 哪些端点需要 bearer 认证 vs 管理员认证。
