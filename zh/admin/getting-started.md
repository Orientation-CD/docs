# 快速上手

本页引导你第一次访问 Studio Control：在哪里找到它、如何登录、会话如何工作，以及如何创建管理员账号。

## 访问控制台

### 本地开发

按照你平时的方式启动应用服务器（参见后端 [getting-started](/backend/getting-started) 指南），然后打开：

```
http://localhost:8000/admin
```

如果你未登录，会被重定向到 `GET /admin/login`。没有单独的开发端口——管理面板由同一个 FastAPI 进程提供服务。

### 生产环境

使用应用的公共域名：

```
https://<your-prod-host>/admin
```

由于 admin 路由与生产服务共享，它们受与客户 API 相同的网络/HTTPS 保护。不要在没有网络层额外保护的情况下将 `/admin` 暴露到公网——仅有登录认证是不够的。

## 首次登录

登录页（`app/templates/admin/login.html`）有两个字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| Phone number | text | 是 | 管理员账号的 E.164 规范化手机号。 |
| Password | password | 是 | 账号密码。 |

- 通过 `POST /admin/login` 提交。
- 此页面**没有**"忘记密码"或自助注册功能。
- 登录失败按 IP 和按账号分别限流（由 `auth_rate_limit_attempts` 在 `auth_rate_limit_window_seconds` 时间窗口内限制）。多次失败后必须等待时间窗口过期。
- 登录成功后进入 `/admin` 仪表盘。

## 创建管理员账号

管理员账号就是 `user_type = "admin"` 的普通 `User` 行。没有管理员自助注册 UI。直接在数据库中创建（或通过 seed/migration），需要：

| 列 | 必填 | 说明 |
| --- | --- | --- |
| `phone_e164` | 是 | 用于登录的唯一手机号。 |
| `password_hash` | 是 | 使用应用相同哈希函数生成的加盐密码哈希（不要存明文）。 |
| `display_name` | 是 | 显示在侧边栏底部。 |
| `user_type` | 是 | 必须为 `ADMIN`。任何其他值都会在登录时被拒绝。 |
| `is_active` | 是 | 必须为 `true` 才能登录。 |
| `account_status` | 是 | 必须为 `active`。 |

> 切勿将真实密码或哈希提交到文档中。使用生成的强密码，并通过正常的账号流程轮换。

创建该行后，前往 `/admin/login`，使用该手机号和密码登录。

## 会话生命周期

登录后：

- 设置一个**签名浏览器会话 cookie**，包含你的 `admin_user_id`、新生成的 `admin_session_id` 和 `csrf_token`。
- 在 **Redis** 中存储对应条目，键为 `admin-session:v1:active:<你的admin-id>`。这就是"活跃会话"注册表。
- 会话有效期为 **8 小时**（`ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60`）。之后需要重新登录。
- **每个管理员同时只有一个会话。** 如果你从第二个浏览器/设备登录，第一个会话将失效，其所有者会被跳回登录页。
- 你提交的每个表单 POST 都包含 CSRF token；过期或不匹配的 token 返回 `403 CSRF_TOKEN_INVALID`。

## 语言

侧边栏右上角有一个语言选择器（`简体中文` / `English`）。选择后会写入 `admin_language` cookie 并重新加载页面。此偏好仅存储在你的浏览器中——不影响其他管理员。

## 登出

点击侧边栏底部的 **Logout** 按钮（一个 `POST /admin/logout` 表单）。这会：
- 撤销你的活跃 Redis 会话（通过比较并删除，确保只登出仍然拥有该账号的那个会话），
- 清除签名会话 cookie，
- 重定向回 `/admin/login`。

你需要重新登录才能使用控制台。

## 接下来去哪

- 进入仪表盘开始监控：[dashboard](/admin/dashboard)
- 开始管理账户：[users](/admin/users)
- 设置计费和定价：[billing](/admin/billing)
- 接入模型：[providers](/admin/providers)
