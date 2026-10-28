# 企业工作区后台

`/admin/workspaces`管理共享企业；永久个人工作区不能在这里移除。客户owner设置与额度API使用另一套基于当前成员关系的权限。

## 创建与容量

创建要求已注册且合格的owner、企业名、初始企业积分与成员上限，owner也占一个席位。搜索匹配企业/成员身份、手机号或ID，容量筛选帮助寻找满员企业。席位不能调到当前成员数以下，待接受邀请不预占席位。

| 控制 | 改变什么 | 不表示什么 |
| --- | --- | --- |
| Member limit | 当前席位容量 | 积分预算或成员月上限 |
| 正负Token delta | 企业钱包及审计流水 | owner个人钱包 |
| 移除企业 | 退休访问权/成员关系，保留必要记录 | 取消供应商工作或立刻吊销已发短期能力 |

可用余额是`remaining_tokens - reserved_tokens`，负向调整不能消耗活跃预留。表单响应不确定时，先查持久审计/流水，再决定能否重复。

## 成员月上限与owner详情

当前owner的`member-token-limit`和单成员`token-limit` API独立限制新预留，不是管理员余额调整。每次全局保存都会清空全部override，单人0为持续暂停。当前UI集成和仅API边界见[联调状态](/zh/reference/integration-status)。

owner总览仅向当前owner提供额度配置及当前成员quota。owner只读Workflow详情可检查可见企业Job，包括离职成员任务，但隐藏私有输入，不授予创建者写权限。管理员Job诊断又是独立认证的运维界面。精确角色/错误见[工作区访问](/zh/backend/workspaces-orgs)与[额度链路](/zh/reference/flows/member-quota-flow)。

## 移除与保留归属

移除阻止当前和已退出成员取得对保留Project/交付物的新访问，已经发出的短期URL自然到期。计划移除应遵循确认中的已授权协调/下载窗口，不能承诺取消供应商工作。Job归属、冻结输入pin及账务归因仍是清理/恢复证据，不能把企业费用改到owner个人账户，也不能改保留输入行绕过清理冲突。

---

源码依据 · backend `e59716c8`: [app/admin/users.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/users.py) · [app/workspaces/workspace_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workspaces/workspace_api.py) · [app/billing/member_token_quotas.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/member_token_quotas.py) · [app/templates/admin/enterprises.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/enterprises.html).
