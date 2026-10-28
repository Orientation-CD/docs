# 积分、套餐与成员月额度

Feature价格、套餐权益、赠送与订单金额由服务端决定。客户端读取 `GET /v1/billing/features`；目录ETag/304可复用未变表示，读取失败表示可用性未知。[额度全链路](/zh/reference/flows/member-quota-flow)解释新增的企业成员容量边界。

## 钱包计算

可用余额为 `remaining_tokens - reserved_tokens`。个人空间扣User钱包，企业空间扣Enterprise钱包，不回退个人余额。

| 初始1000积分、任务价格10 | Remaining | Reserved | 可用 |
| --- | ---: | ---: | ---: |
| 接受前 |1000|0|1000|
| 接受并预留 |1000|10|990|
| 成功结算 |990|0|990|
| 或失败释放 |1000|0|1000|

预留流水的delta是审计证据，不是第二次扣余额。幂等状态转换防止finalizer重复结算。企业消耗统计只计已结算消耗，不计预留、释放或充值。

## 成员月容量是另一种计算

| 字段 | 含义 |
| --- | --- |
| `limit` | null表示无限，否则是当前有效成员上限 |
| `used` | 已接受的预留与已结算消耗各计一次 |
| `reserved` | `used`中仍待结算的子集，**不能再次相加** |
| `source` | `default`、`custom`、`owner` |
| `month` | Asia/Shanghai自然月，格式`YYYY-MM` |

用量归属预留所在月份，即使之后跨月结算/释放也不换月。已释放代次计零；显式重试是独立的新预留。不可变事件身份使删除Job后仍能归因。仅“有归属但没有对应reserve”的历史消耗回退到结算月。这有意区别于仍按结算月统计的 `consumption.current_month`。

当前owner可以设置全局成员额度（null或严格整数1..10,000,000），或成员专属额度（null或0..10,000,000）。**每次保存全局值都清空所有override**，即使值不变、保存null，或override属于离职成员。个人额度0是跨月持续暂停。单人保存即为`custom`，即使等于默认值；退出重加入保留该设置，除非全局保存已清除。owner无限，但其消耗仍统计归属。

准入先检查企业可用余额（`TOKEN_SHORTAGE_WORKSPACE`），再检查有限成员容量（`used + required <= limit`）。额度拒绝为402 `MEMBER_MONTHLY_TOKEN_LIMIT_REACHED`，附`limit`、`used`、`required`，不创建新Job/预留/outbox。已接受请求的同key重放不重复预留。显式重试使用原冻结价格，计入新的预留月；降低额度后，已接受任务仍能结算或释放。

## 产品、订单与退款

套餐授予Feature及个人空间折扣。支付创建时快照套餐身份和数值权益，后改目录不会重写历史购买。客户购买积分注入个人钱包，企业充值仍是独立的后台审计调整。额度设置只写配置审计，不产生财务事件或新余额。

`POST /v1/subscriptions`、`/v1/token-purchases`使用持久动作key。履约由供应商确认的证据授权，客户端支付成功画面不足以确认。支付GET只读本地状态，主动reconcile会查询支付渠道。当前UI可用性和运维边界见[支付链路](/zh/reference/flows/payment-flow)、[退款链路](/zh/reference/flows/refund-flow)、[抖音](/zh/reference/douyin-payment)与[联调状态](/zh/reference/integration-status)。

---

源码依据 · backend `e59716c8`: [app/billing/billing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/billing.py) · [app/billing/member_token_quotas.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/billing/member_token_quotas.py) · [app/workflows/workflow_admission.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/workflow_admission.py) · [app/workflows/submissions/workflow_submission_retry.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/submissions/workflow_submission_retry.py).
