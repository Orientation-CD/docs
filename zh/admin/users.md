# 用户管理与账号边界

`/admin/users`搜索、分页展示账号身份/状态、个人余额和可拥有工作区数。所有写操作要求活跃管理员session与CSRF。管理员权限不同于客户的企业owner成员身份。

## 钱、容量与配额不是同一个控制

| 控制 | 在哪里变更 | 效果 |
| --- | --- | --- |
| 个人积分调整 | 用户后台 | 有审计的正负钱包delta，不可消耗活跃预留 |
| 企业充值 | 工作区后台 | 独立企业钱包流水 |
| 可拥有工作区数 | 合格用户账号 | 永久个人空间加活跃自有企业，范围1..100 |
| 企业成员月上限 | 当前owner额度API | 限制新增预留，不转余额，不产生财务事件 |

加入别人的企业不计拥有数。降低拥有数应满足当前归属约束，不会删除企业。给owner个人钱包充值不能解决企业余额不足。保存全局成员额度会清空单人override；详见[额度链路](/zh/reference/flows/member-quota-flow)，不能虚构本界面没有的管理员控件。

## 生命周期动作

| 动作 | 含义 |
| --- | --- |
| Suspend | 管理限制，包含自有企业/成员影响 |
| Reactivate | 恢复合格的停用/注销账号，不恢复已退休成员关系 |
| 协助自愿注销 | 用户请求的生命周期路径，包含活跃自有企业及宽限/恢复规则 |
| Archive | 对合格注销账号不可逆匿名化，保留必要审计/财务事实 |

服务端重新检查当前状态、归属、活跃工作和自操作限制。执行已授权动作前阅读确认中的受影响范围与现有恢复规则。状态改变不取消结果不确定的供应商动作，也不擦除不可变账务归因。额度暂停只影响新成员预留，已接受工作仍可结算/释放。

客户认证账号生命周期见[认证](/zh/backend/authentication)。企业当前owner的只读任务详情和额度配置是独立[工作区](/zh/backend/workspaces-orgs)契约。

---

源码依据 · backend `e59716c8`: [app/admin/users.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/users.py) · [app/identity/account_lifecycle_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/identity/account_lifecycle_api.py) · [app/billing/member_token_quotas.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/member_token_quotas.py) · [app/templates/admin/users.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/users.html).
