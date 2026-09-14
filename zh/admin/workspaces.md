# 工作区（企业）

工作区分区位于 `GET /admin/workspaces`（模板 `app/templates/admin/enterprises.html`，代码中的 "enterprises" 命名对应侧边栏的 "Workspaces" 标签），用于管理企业积分工作区——由一个用户拥有、供团队使用的共享积分池。

## 创建工作区

顶部表单创建新企业：

| 字段 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| Name | text | 是 | 工作区显示名称（≤120 字符）。 | — |
| Owner phone | text | 是 | 将拥有该工作区的用户的 E.164 手机号。该用户必须已存在。 | — |
| Initial tokens | number | 是 | 初始化到工作区的积分余额。 | 0 |
| Member limit | number | 是 | 最大成员数；整数 1 … 1,000,000。 | 50 |

通过 `POST /admin/workspaces` 提交。所有者成为 `owner` 成员关系并获得初始化的积分池。

## 工作区表格

| 列 | 显示内容 |
| --- | --- |
| Workspace | 名称 + 内部 ID。 |
| Token balance | 当前工作区积分池（剩余）。 |
| Owner | 所有者的显示名称。 |
| Members | 当前成员数与配置的成员上限的对比。 |
| Actions | 每行的控件：调整积分、报告配置、成员上限、移除。 |

## 单个工作区操作

### 调整积分（`POST /admin/workspaces/{id}/tokens`）

充值或扣减工作区的**共享**积分池。

| 字段 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| Adjustment | number | 是 | 带符号增减量，范围 −1,000,000,000 … +1,000,000,000，不能为 `0`。 | — |
| Reason | text | 否 | 台账备注。 | — |

### 成员上限（`POST /admin/workspaces/{id}/member-limit`）

| 字段 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| Member limit | number | 是 | 整数 1 … 1,000,000。不能设为低于当前成员数。 | 当前值 |

当工作区达到上限时，其所有者无法邀请新成员，仪表盘会弹出"企业已满"告警。

### 报告配置（`POST /admin/workspaces/{id}/report-config`）

设置该工作区专属的报告版式覆盖。这是一个自由格式的 JSON blob（最大 **64 KiB**），告诉报告系统对此工作区使用哪个模板/章节。使用该行的"报告配置"控件编辑 JSON；它以原子方式应用，该行原地刷新。

### 报告默认值（`POST /admin/workspaces/{id}/report-default`）

将此工作区的报告版式提升为全产品个人报告的**默认**版式。通过 `POST /admin/workspaces/report-default/clear` 清除（无路径 ID）。同一时间只能有一个工作区持有全局报告默认值。

### 移除（`POST /admin/workspaces/{id}/remove`）

通过 `dissolve_enterprise` 解散企业。成员关系被移除，工作区被软归档；计费历史保留。操作前请确认——所有者将失去对共享积分池的访问。

## 工作区与用户的关系

- 用户的"允许工作区数"（在[用户](/admin/users)页面设置）限制其可以加入/拥有的企业数量。
- 成员 vs. 所有者角色在用户页面的工作区徽章上显示。
- 企业积分消耗在积分台账中显示为 `scope = "enterprise"`，与个人使用分开。
