# 认证与法律同意

服务支持手机号/密码、微信及抖音登录，统一签发应用自己的 access/refresh token。平台 OpenID 与凭据留在服务端。

## 客户会话

| 操作 | 公开接口 |
| --- | --- |
| 注册 / 密码登录 | `/v1/auth/register`、`/v1/auth/login` |
| 微信 / 抖音登录 | `/v1/auth/wechat-login`、`/v1/auth/douyin-login` |
| 轮换 / 撤销会话 | `/v1/auth/refresh`、`/v1/auth/logout` |
| 个人资料 | `/v1/me` |

注册和登录在需要时携带当前法律文档同意。先读取 `/v1/legal-documents/current`，展示两份不可变文档，再按照 [REST API](/zh/reference/rest-api)提交文档 ID 与同意字段。法律元数据不可用会阻止流程，不能当成无需同意。

Access token 放在 `Authorization: Bearer <access_token>` 中。刷新和退出使用**请求体内的 refresh token**。数据库 `auth_sessions` 支持撤销，因此 JWT 尚未过期不等于仍有权限。轮换、重试与身份合并应遵循规范合同，不能信任客户端传入的用户 ID 或手机号。

Settings 中 access token 默认 15 分钟，refresh token 默认 30 天。客户端根据 `detail.code` 分支并遵守 `Retry-After`；无效凭据不应反复重试，也不能因平台短暂不可用创建第二个账号。

## 账号生命周期

用户可调用 `/v1/me/deactivate` 请求停用，普通宽限期默认为七天。服务提供经密码、微信或抖音身份验证的恢复接口；到期后 worker 匿名化符合条件的账号。管理员停用是不同操作，恢复账号不会重建已退役的企业成员关系。参见[用户运营](/zh/admin/users)。

## 管理员会话

Studio Control 使用签名的 `floorplan_admin` 浏览器 cookie 及 Redis 活跃会话登记，不使用客户 Bearer token。会话有效期八小时；同一管理员后续登录会使之前会话失效。表单必须携带匹配的 CSRF token，Redis 会话存储故障时拒绝操作。

配置 `ADMIN_PHONE` 和 `ADMIN_PASSWORD` 可在启动时初始化管理员。生产使用 HTTPS/Secure cookie，并保持签名及加密密钥稳定。参见[后台启动](/zh/admin/getting-started)与[配置参考](/zh/reference/configuration)。

---

代码依据 · backend `b13cc566`: [app/identity/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/identity/api.py) · [app/identity/admin_sessions.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/identity/admin_sessions.py) · [documents/REST_API_INTERFACE.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md).
