# 用户运营

`/admin/users` 支持搜索与分页，展示身份/状态、个人余额与可拥有工作空间额度。操作要求活动管理员会话和 CSRF token。

## 余额与额度

带符号整数 Token 调整会写入可审计账本。负调整不能使余额低于活动预留。表单响应不确定时，重试前先核对实际账本。

额度范围 1–100，计入永久个人空间及本人拥有的活动企业；加入的企业不占额度。降低额度须满足当前所有权约束，不能借此移除企业。参见[工作空间](/zh/admin/workspaces)。

## 不同账号操作

| 操作 | 含义 |
| --- | --- |
| 停用 | 管理员限制访问，并影响其名下企业/成员 |
| 重新启用 | 恢复符合条件的停用账号；不重建已退役成员关系 |
| 协助自愿停用 | 要求用户提出请求并移除活动自有企业；使用普通宽限/恢复规则 |
| 归档 | 对符合条件的已停用账号进行不可逆身份匿名化 |

UI 只展示适用操作，服务端仍核查状态、自有企业、活动任务及管理员自操作限制。归档删除身份与恢复数据，保留必要财务/审计记录，不等于可逆停用。

计划停用/移除可能切断其名下企业成员访问。授权操作前应协调下载期及受影响成员。活动任务仍可能继续执行/结算，账号状态变化不是服务商取消操作。

客户凭据验证恢复 API 见[认证](/zh/backend/authentication)。企业余额在工作空间页面调整，给所有者增加个人 Tokens 不会给企业充值。

---

代码依据 · backend `b13cc566`: [app/admin/users.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/users.py) · [app/identity/account_lifecycle_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/identity/account_lifecycle_api.py) · [app/templates/admin/users.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/users.html).
