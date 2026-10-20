# Tokens、订阅与支付

Feature 价格、订阅权益、套餐赠送量和订单金额由服务端决定。客户端通过公开的 `GET /v1/billing/features` 发现当前产品，不提交 Token 成本或权威支付金额。

目录响应支持 ETag/`If-None-Match` 与 `304 Not Modified`。目录请求失败表示可用性未知，不表示全部功能关闭。

## 钱包计算

`remaining_tokens` 包含已预留 Tokens，**可用余额 = remaining − reserved**。个人工作空间使用 User 钱包，企业工作空间使用自己的 Enterprise 钱包，不回退到成员个人余额。

初始余额 1,000、任务成本 10 Tokens 时：

| 状态变化 | Remaining | Reserved | 可用余额 |
| --- | ---: | ---: | ---: |
| 准入前 | 1000 | 0 | 1000 |
| 接受任务：预留 | 1000 | 10 | 990 |
| 成功：结算 | 990 | 0 | 990 |
| 或者失败：释放 | 1000 | 0 | 1000 |

账本区分预留、已消费任务、释放、入账与人工调整。预留的 delta 是审计事件，不是又一次扣减余额。幂等状态迁移防止重复结算或释放。企业已结算消费不包含临时预留和充值变化。

## 产品与权益

Feature 拥有当前 Token 价格并映射到可执行 Workflow。标准/高级订阅套餐授权 Feature 及个人工作空间折扣。支付创建时快照套餐身份与数值权益，之后修改目录不会改写已有购买。一个用户跨等级最多一个待支付或生效订阅，目前没有切换等级或提前续费 API。

Token 套餐区分购买与赠送量。客户购买进入**个人账户**，企业点数池通过独立的管理员审计调整维护。新账号奖励使用 New user registration 活动当前金额，`INITIAL_USER_TOKENS` 作为 fallback；修改只影响未来奖励。

## 支付生命周期

使用持久幂等键及支持的支付 `type` 创建 `/v1/subscriptions` 或 `/v1/token-purchases`。订单历史为 `/v1/payments`，继续支付、关闭及退款使用对应订单操作。权益发放依据平台确认的证据，不能依据客户端收银台成功页面。已购 Token 批次和退款预留防止已使用 Tokens 被重复退回。

微信与抖音使用独立签名、回调与补偿路径。抖音使用 `type: douyin`、独立查询补偿接口和 mock/live 模式，见[抖音支付](/zh/reference/douyin-payment)。普通支付轮询只读本地状态；渠道 reconciliation 才主动查询平台证据。

推荐奖励需满足购买/使用条件后才可领取，并需要显式 claim。[活动配置](/zh/admin/campaigns)修改未来事件金额，不改写历史账本。完整错误及退款规则见 [REST API](/zh/reference/rest-api)。

当前两个小程序均关闭申请退款入口。服务端保留退款 API，但微信退款查询恢复与订阅回收存在已记录缺口；后台异常展示不等于人工审批/解决流程。参见[计费运营](/zh/admin/billing)。

---

代码依据 · backend `b13cc566`: [app/billing/billing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/billing/billing.py) · [app/billing/billing_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/billing/billing_api.py) · [documents/PAYMENT_REFUNDS.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/PAYMENT_REFUNDS.md).
