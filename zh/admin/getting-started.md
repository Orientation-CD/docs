# 管理员初始化与会话

打开运行中的 API origin 加 `/admin`。未登录时跳转到 `/admin/login`。后台 HTML 由同一 FastAPI 进程提供，没有独立前端开发端口。

## 初始化管理员

在后端授权环境配置 `ADMIN_PHONE`、`ADMIN_PASSWORD` 及可选 `ADMIN_DISPLAY_NAME`，再通过[本地环境](/zh/deploy/local-stack)或正常部署启动 API。

启动时 `seed_configured_admin` 在账号不存在时创建账号与个人空间；已有账号则提升为管理员并确保个人空间存在。**它不会重置已有账号密码。** 应使用该账号实际密码或授权的账号恢复流程。后台没有管理员自助注册或找回密码页面。

登录接收手机号与密码，核查活动管理员并限制失败尝试。修改显示名称或拥有企业不会授予管理员权限。

## 浏览器会话

登录成功后设置签名 `floorplan_admin` cookie，并在 Redis 激活八小时会话。同一管理员只有当前会话有效，第二次登录替换第一次。每次修改必须携带当前页面 CSRF token。退出撤销匹配的活跃会话并清除 cookie。

活跃会话存储不可用时拒绝认证操作。过期或会话被替换后重新加载/登录，不要跨浏览器复制 CSRF token。生产需配置兼容 HTTPS 的 origin 与 Secure cookie。

语言选择写入 `admin_language` 并刷新页面，仅影响本浏览器。接下来可读[概览](/zh/admin/dashboard)、[模型](/zh/admin/providers)、[Workflows](/zh/admin/workflows)及[计费](/zh/admin/billing)。

---

代码依据 · backend `b13cc566`: [app/main.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/main.py) · [app/admin/auth.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/auth.py) · [app/identity/admin_sessions.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/identity/admin_sessions.py).
