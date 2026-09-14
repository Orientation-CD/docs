# 计费与积分

计费分区位于 `GET /admin/billing`（模板 `app/templates/admin/billing.html`），控制商业定价：每种任务类型的价格、订阅套餐包含的权益、积分套餐的售价，以及订单历史和对账。所有金额以**分**存储（1 分 = 0.01 元）。

## 全局积分 KPI

头部显示 `global_tokens_consumed`——全局计费的提供商侧积分消耗——作为快速的供需合理性检查。

## 1. 任务类型

每种设计任务类型对应一个价格（以积分计）和一个已审批的模型目录。通过 `POST /admin/billing/job-types` 编辑；通过 `POST /admin/billing/job-types/{key}/remove` 移除（软归档）。

| 字段 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| Key | text（只读） | 是 | 稳定标识，例如 `interior_redesign`。 | — |
| Display name | text | 是 | 面向客户的名称。 | — |
| Token cost | number | 是 | 每个任务收取的积分数。范围 10 … 1,000,000。 | — |
| Masked image required | checkbox | 否 | 任务是否需要蒙版/笔刷输入。 | off |
| Reference image required | checkbox | 否 | 是否需要参考图。 | off |
| Is active | checkbox | 否 | 关闭时该任务类型对客户隐藏。 | on |
| Approved models | select | 否 | 哪些模型配置服务于此目录键（多选）。 | — |
| Expected version | number | 是 | 乐观锁版本；过期编辑返回 `409`。 | 当前值 |

"Approved models" 即 `ProviderModelCatalog` 分配——参见 [providers](/admin/providers) 了解模型如何挂载到目录。

## 2. 订阅套餐

套餐按**周期**（`monthly`、`quarterly`、`yearly`）分组。通过自动提交选择器切换周期。

通过 `POST /admin/billing/plans` 创建/编辑；通过 `POST /admin/billing/plans/{id}/remove` 移除（软归档）。

| 字段 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| Code | text | 是 | 唯一套餐代码。 | — |
| Name | text | 是 | 显示名称。 | — |
| Interval | select | 是 | monthly / quarterly / yearly。 | — |
| List price (fen) | number | 是 | 原价/划线价。 | — |
| Price (fen) | number | 是 | 实际收取价格。 | — |
| Token grant | number | 是 | 每个周期发放的积分数。 | — |
| Job discount % | number | 是 | 订阅者任务费用折扣百分比。 | 0 |
| Is active | checkbox | 否 | 关闭时该套餐不可购买。 | on |

### 套餐权限（允许的目录）

`POST /admin/billing/plan-permissions/{interval}` 设置该周期的套餐可以使用哪些任务类型目录。这是任务类型键的多选——套餐用户只能运行允许目录中的任务。

## 3. 积分套餐

一次性充值包。通过 `POST /admin/billing/token-packages` 创建；通过 `POST /admin/billing/token-packages/{id}/remove` 移除（软归档）。

| 字段 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| Code | text | 是 | 唯一套餐代码。 | — |
| Name | text | 是 | 显示名称。 | — |
| List price (fen) | number | 是 | 划线价。 | — |
| Price (fen) | number | 是 | 实际收取价格。 | — |
| Token amount | number | 是 | 发放的积分数。 | — |
| Bonus token amount | number | 否 | 额外赠送积分数。 | 0 |
| Is active | checkbox | 否 | 关闭 = 不可购买。 | on |

## 4. 支付历史

表格列出 `PaymentOrder` 行，支持实时搜索和状态/类型筛选。

| 列 | 显示内容 |
| --- | --- |
| Order | 商户订单号（`out_trade_no`）+ 微信交易号。 |
| User | 购买者显示名称。 |
| Type | `subscription` 或 `token_purchase`。 |
| Amount | 金额，单位为分（已支付/已退款）。 |
| Tokens | 发放的积分数。 |
| Status | pending / paid / closed / refunded。 |
| Created / Paid | 时间戳。 |

### 支付对账（异步）

`POST /admin/billing/payments/reconcile` 启动一个异步扫描，对照微信核实过期/待支付订单的真实状态。由于可能耗时较长，它返回一个 `progress_id`，页面轮询 `GET /admin/billing/payments/reconcile/{progress_id}`（`no-store`）直到报告完成。UI 显示步骤列表（开始 → 查询 → 完成）和最终处理/更新计数。"对账过期支付"按钮在运行期间禁用。

> 切勿手动将过期的待支付订单翻转为已支付/已关闭——对账仅使用微信确认的证据。

## 企业积分调整

工作区积分池在[工作区](/admin/workspaces)页面管理；单个用户个人余额在[用户](/admin/users)页面。每次调整都会写入可审计的 `TokenLedgerEntry`（`TOKEN_ADJUSTMENT_CREDIT` / `..._DEDUCTION`）。

## 操作顺序清单

1. 设置任务类型积分成本和已审批模型。
2. 创建订阅套餐和积分套餐。
3. 按周期限制套餐权限。
4. 在此处监控支付，在待支付订单过期时运行对账。
