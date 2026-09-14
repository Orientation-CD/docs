# 计费与积分

后端以一种内部货币——**积分**——对 AI 工作收费。本页解释积分如何被挂起、花费、购买、授予，以及订阅和微信支付如何在钱包之间移动积分。路由在
`app/billing_api.py`；事务核心在 `app/billing.py`；表文档在
[数据模型](/reference/data-model)页。

## 两个钱包

每个积分余额都存在 `User` 或 `Enterprise` 行上。两者都暴露相同的两列：

| 列 | 含义 |
| --- | --- |
| `remaining_tokens` | 可花费余额 |
| `reserved_tokens` | 在途设计作业临时挂起的积分 |

**个人工作区**从其 `User` 钱包花费。**企业工作区**从其
`Enterprise` 钱包花费，所有成员共享。你不能花费尚未授予的积分：API 在入队作业前检查 `remaining_tokens`。

## 积分台账

每个改变余额的事件都是 `token_ledger_entries`（`app/db_models.py`）中的追加行。一行记录：

| 列 | 含义 |
| --- | --- |
| 哪个钱包（`user_id` 或 `enterprise_id`） | |
| 带符号的 `amount`（正数 = 入账，负数 = 出账） | |
| 运行原因（如设计作业预留/结算/释放、购买、推荐奖励授予、管理员调整） | |
| 幂等 / 关联引用（如设计作业 ID 或支付订单 ID） | |

台账是审计追踪；`remaining_tokens` / `reserved_tokens` 列是从它派生的缓存余额。这使得每次扣费可重建，每次对账可审计。

### 设计作业积分握手

如[设计作业](/backend/design-jobs)所介绍：

| 阶段 | 函数 | 效果 |
| --- | --- | --- |
| 创建作业 | `reserve_design_tokens` | `remaining → reserved`，台账行 `reserve` |
| 作业完成 | `settle_design_tokens` | `reserved → 已花费`（台账行 `settle`），`reserved` 减少 |
| 作业失败 | `release_design_tokens` | `reserved → remaining`（台账行 `release`） |

这种两阶段提交意味着用户不能重复花费同一批积分，失败的作业也不会让他们付费。

### 管理员调整

`adjust_user_tokens` 和 `adjust_enterprise_tokens`（`app/billing.py`）让运营人员从管理 UI 授予或更正余额，始终写入带运营人员引用的台账行。

## 订阅

订阅是个人的。相关表：

- `subscription_plans` —— 套餐目录（代码、名称、周期、价格、赠送积分数、作业折扣百分比、权益项）。
- `user_subscriptions` —— 每个用户一条活跃记录，含
  `current_period_start` / `current_period_end`、`status`，以及 `plan_code`、`plan_name` 和 `benefit_items` 的反规范化快照。
- `subscription_entitlements.py:load_current_personal_subscription` 只返回当前周期活跃的付费订阅。

`SubscriptionStatus` 在 active / past_due / canceled 之间移动；
`expire_user_subscriptions` 和 `expire_locked_user_subscriptions`（worker 函数）翻转过期订阅。`add_subscription_interval` 在续费时按
`SubscriptionInterval`（月付/年付）推进周期。

**个人订阅执行 + 实时目录权限**（#201）：活跃个人订阅的权益项决定用户可选择哪些高级提供商目录条目（参见
[设计作业](/backend/design-jobs)），`entitlements.py:personal_benefit_items` 构建客户端展示的有序显示元数据（`INCLUDED_TOKENS`、`PERSONAL_JOB_DISCOUNT_PERCENT`）。

## 积分包与购买

一次性充值位于 `token_packages`（目录），购买时记录到
`purchased_token_batches`。购买积分包：

1. 创建 `payment_orders` 行（含来自 `new_out_trade_no` 的商户
   `out_trade_no`）。
2. 调用微信支付 JSAPI 获取小程序预支付参数。
3. 等待微信支付**通知回调**到达
   `/api/v1/billing/wechat/notify`（`wechat_pay.py` 验证签名）。
4. 成功时 `complete_payment_order` 入账钱包并写一行
   `wechat_payment_events`；关闭/超时时 `close_payment_orders`
   取消订单（`WECHAT_PAYMENT_EXPIRE_SECONDS`、
   `WECHAT_PAYMENT_CLOSE_GRACE_SECONDS`）。

待处理购买按用户有界，上限为
`WECHAT_TOKEN_PURCHASE_PENDING_LIMIT`（默认 3）。退款创建
`refund_orders` 行，真实提供商/订单成本记录在
`finance_cost_entries` 中用于利润报告。

### 微信支付模式

`WECHAT_PAY_MODE` 为 `disabled | mock | live`。本地 Compose 中，
`mock` + `MOCK_PAYMENT_ENDPOINTS_ENABLED=true` 指向内置的
`mock-payment-provider`。生产环境需要 `live` 并配真实商户凭证（`WECHAT_PAY_MERCHANT_ID`、`WECHAT_PAY_API_V3_KEY`、
`WECHAT_PAY_MERCHANT_PRIVATE_KEY_FILE` 等）。**切勿提交真实商户私钥**；将其保存在如
`~/.config/yuanzhuai/wechat-pay/` 下。

## 企业积分

企业有自己的共享 `remaining_tokens` / `reserved_tokens`。
企业所有者为企业钱包（而非个人钱包）充值，所有成员从中支取。成员和邀请规则见
[工作区与组织](/backend/workspaces-orgs)。企业钱包入账来自管理员调整和购买，而非个人订阅。

## 推荐与活动积分授予

推荐系统通过单独的台账路径授予积分：

- `campaign_configurations` 持有每个活动代码的运行期积分数（如 `REFERRAL_FIRST_PURCHASE`），管理员可用乐观版本控制编辑
  （`campaign_configuration.py:save_campaign_token_amount`）。
- `reward_grants` / `reward_grant_items` 记录承诺的奖励；邀请人在新注册被邀请人首次经提供商确认的购买（至少
  `REFERRAL_MINIMUM_PURCHASE_FEN`，即 990 分 = 人民币 9.90）通过购买积分使用变为不可退款后获得奖励。
- 邀请人随后通过 `POST /api/v1/rewards/claim` **认领**奖励，原子地将已认领奖励项转为个人积分。

推荐表参见[工作区与组织](/backend/workspaces-orgs)，此购买所支付的目录参见
[设计作业](/backend/design-jobs)。

### 积分生命周期实例

假设个人余额 1000 积分，作业花费 10：

| 步骤 | `remaining_tokens` | `reserved_tokens` | 台账行 |
| --- | --- | --- | --- |
| 开始 | 1000 | 0 | — |
| 预留作业 | 990 | 10 | `DESIGN_JOB_RESERVE` −10 |
| 作业完成 | 990 | 0 | `DESIGN_JOB_CONSUMED` −10（结算） |
| （备选）作业失败 | 1000 | 0 | `DESIGN_JOB_RELEASE` +10 |

失败时挂起额精确返还；成功时挂起额永久花费。每行携带设计作业关联 ID，因此一个作业的两条台账行始终可配对。

## 启动播种

启动时，`ensure_billing_defaults` 创建基础计费原语。
`seed_demo_billing_catalog`（由 `SEED_DEMO_BILLING_CATALOG=true` 门控，仅本地）播种清晰标注的示例套餐和积分包，使小程序在开发时有价格可显示。新用户首次登录获得
`INITIAL_USER_TOKENS`（默认 **1000**）和
`INITIAL_USER_ALLOWED_WORKSPACES`（默认 **2**）。

## 路由一览

均位于 `/api/v1`，除注明外均需 bearer 认证：

| 路由 | 用途 |
| --- | --- |
| `GET /billing/balance` | 当前钱包余额（个人） |
| `GET /billing/ledger` | 分页积分台账历史 |
| `GET /billing/plans` / `/billing/packages` | 套餐和积分包目录 |
| `GET /billing/subscriptions` | 当前个人订阅 |
| `POST /billing/checkout` | 创建支付订单（JSAPI） |
| `POST /billing/wechat/notify` | **公开**微信支付回调 |
| `POST /billing/refunds` | 申请退款 |
| `GET /billing/enterprise/*` | 企业钱包与成员计费（所有者） |

## 关键设置

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `INITIAL_USER_TOKENS` | 1000 | 首次登录初始赠送 |
| `SEED_DEMO_BILLING_CATALOG` | true | 本地播种演示价格 |
| `WECHAT_PAY_MODE` | mock | `disabled`/`mock`/`live` |
| `WECHAT_PAYMENT_EXPIRE_SECONDS` | 1800 | 订单支付窗口 |
| `WECHAT_TOKEN_PURCHASE_PENDING_LIMIT` | 3 | 每用户最大未支付订单数 |
| `REFERRAL_MINIMUM_PURCHASE_FEN` | 990 | 触发奖励的最小不可退款购买 |
| `REFERRAL_REWARD_TOKENS` | 1000 | 每个合格推荐授予的积分数 |
| `REFERRAL_REWARD_GLOBAL_CAP` | 10000 | 推荐奖励全局上限 |

## 延伸阅读

- [工作区与组织](/backend/workspaces-orgs) —— 谁能花费企业钱包。
- [数据模型](/reference/data-model) —— 台账/订单/订阅表。
