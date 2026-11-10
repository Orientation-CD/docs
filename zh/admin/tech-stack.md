# 管理后台技术实现

Studio Control 属于 Python 后端。FastAPI/Starlette 负责路由、签名会话和表单，Jinja 渲染 HTML，共享 CSS 与原生 JavaScript 提供实时搜索、局部刷新、对话框、图布局和修改反馈。没有独立 React 应用或管理员 JWT API。

## 代码归属

| 后端位置 | 职责 |
| --- | --- |
| `app/admin` | 领域处理器、授权、缓存和视图投影 |
| `app/templates/admin` | 页面/局部模板、导航及双语展示 |
| `app/static/admin.js`、`admin.css` | 浏览器交互与共享布局 |
| `app/static/admin-language.js` | 浏览器语言选择 |
| `app/identity/admin_sessions.py` | 每管理员唯一活动 Redis 会话 |

后台 HTML 路由不进入公开 OpenAPI，是认证浏览器合同。内部营销 JSON 与性能实时 JSON 不是客户 API。表单核查 CSRF 和业务约束，配置修改通过版本/generation 拒绝过期写入。

列表使用有界服务端分页/搜索。局部更新需保留表单、搜索、滚动上下文和无障碍状态消息。修改这些后端交互时遵循其浏览器测试政策；Git push 不会自动更新运行预览。

后端通过 `/admin/configuration/export` 导出授权部署快照。配置导入/导出范围大于提示词归档替换，需保留密钥与兼容边界。工具权威说明留在后端仓库，本站是独立 VitePress 项目。

## SDK 激活具有准备／提交边界

[admin_activate_three_vjia_sdk](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/three_vjia_sdk.py) 先验证管理员和 CSRF，再准备发布契约及账户安装，不在目录／存储／Redis 工作期间持有数据库会话连接。核对页面配置代次与凭据修订后，取得发布／配置锁执行短数据库激活，再次检查管理员并提交。`SDK_CONFIGURATION_CHANGED` 要求刷新核对。提交后的进程通知仅用于预热，通知失败不能把已提交激活报告为保存失败。修改 UI 时必须同时维护浏览器控件和后端代次检查。

---

代码依据 · backend `749e82df`: [app/admin/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/__init__.py) · [app/admin/dependencies.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/dependencies.py) · [app/core/configuration/config_export.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/core/configuration/config_export.py).
