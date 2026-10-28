# 工作区、成员关系与owner可见范围

每个普通账号有一个永久个人工作区。企业是独立的共享钱包，带owner/member关系。`current_workspace_id`只是保存的UI选择；每次创建仍显式指定扣费工作区并重新校验成员关系。

## 权限地图

| 身份 | 读 | 写 |
| --- | --- | --- |
| 创建者 | 自己可见的任务/历史及获授权的私有输入/结果 | 在当前访问权和生命周期允许下操作自己的任务/Project |
| 当前企业成员 | 共享余额、自己的额度及允许访问的自身资源 | 在企业容量内提交并操作自身合格资源 |
| 当前企业owner | 共享余额、成员/Project总览、可见企业任务详情 | 企业设置、邀请、成员、成员额度；写自己的资源 |
| 已退出成员 | 企业仍可用时的窄范围创建者历史 | 无新企业提交/Project管理权；仅明确允许的历史操作 |

owner详情例外是**只读**，可包含已退出成员的可见Job。`GET /v1/workflows/{id}`每次重新检查当前owner身份、企业和Project可见性；`submitted_by`是真实创建者，读取他人任务时`inputs`恒为`[]`。这不授予删除、移动、重试或提交权。无权、隐藏、不存在的ID统一404。只切换当前工作区不会获得访问权。

## 企业容量与邀请

可拥有工作区数包含永久个人空间加活跃自有企业，不计加入别人的企业。`INITIAL_USER_ALLOWED_WORKSPACES`运行时默认1，开发示例可选其他值；管理员可对合格账号调整至100。企业`member_limit`包含owner；待接受邀请不预占席位，因此创建和接受都检查实时容量。

当前分享卡邀请是七天有效的bearer能力。公开预览只返回安全展示元数据；登录后接受时原子重查企业、席位、已有成员关系和邀请状态。预览不会加入。列表/撤销不能恢复邀请bearer秘密。详见[成员链路](/zh/reference/flows/workspace-membership-flow)，历史手机定向协议集中在[兼容边界](/zh/reference/compatibility)。

## owner总览与额度

普通成员收到共享可用/预留余额及消耗，私有成员/历史段保持null。只有当前owner收到成员数组、Project详情、额度配置状态及成员`token_quota`。已退出成员的总览行不带当前额度。三个[额度接口](/zh/reference/flows/member-quota-flow)限制新增预留容量，不改变钱包余额或创建者归属。

全局成员额度每次保存都会清空全部专属override，包括离职成员。单人override在退出/重新加入后保留，除非已被全局保存清空。成员额度不是可以转账的第二个钱包，企业工作始终扣共享池。

## 离开与移除

离开或被移除会结束实时成员关系，同时保留创建者来源、账务归因及明确的历史读取。移除企业会阻断对保留Project/交付物的新访问，已发出的短期能力URL按原期限失效。账号/企业变化不等于取消供应商工作。当前UI和权限边界见[Project](/zh/backend/projects)、[后台工作区](/zh/admin/workspaces)与[联调状态](/zh/reference/integration-status)。

---

源码依据 · backend `e59716c8`: [app/workspaces/workspace_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workspaces/workspace_api.py) · [app/workspaces/workspaces.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workspaces/workspaces.py) · [app/billing/member_token_quotas.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/member_token_quotas.py) · [app/workflows/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/api.py).
