# 企业工作空间运营

`/admin/workspaces` 管理共享企业空间。个人空间永久存在，不能通过此页面删除。

## 创建与查找

创建填写名称、已注册所有者手机号、初始 Tokens 及成员上限。上限包含所有者。服务端检查所有者资格与拥有额度；管理员账号不能作为客户企业成员。

搜索匹配企业/成员身份、手机号或 ID，容量筛选与分页用于查找满员空间。新上限不能低于当前成员数。待接受邀请不预留席位，接受时重新检查实时容量。

## 审计修改

| 控件 | 效果 |
| --- | --- |
| 成员上限 | 调整包含所有者的当前容量 |
| 带符号 Token 调整 | 修改企业钱包并写账本 |
| 移除空间 | 退役企业访问与成员关系，保留必要记录 |

企业可用 Tokens 等于 `remaining_tokens - reserved_tokens`，负调整不能使用活动任务已经预留的资金。给所有者个人钱包入账是另一操作。

移除后，当前及前成员不能再获取保留项目/交付物的新访问。已签发短期链接及复制的临时输入按正常期限过期。计划移除应遵循确认文案中的授权下载/协调期，它不能取消服务商侧任务。

客户所有者/成员管理、分享卡邀请与历史读取的权限不同于管理员操作。参见[工作空间权限](/zh/backend/workspaces-orgs)与[项目](/zh/backend/projects)。旧 report config/default enterprise 控制已不属于当前产品。

---

代码依据 · backend `b13cc566`: [app/admin/users.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/users.py) · [app/templates/admin/enterprises.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/enterprises.html) · [app/workspaces/workspaces.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/workspaces.py).
