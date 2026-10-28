# 计费、功能授权与订单

`/admin/billing` 管理商业配置及支付历史。价格使用整数分，内部任务使用 Tokens。配置以服务端为准，不改写已接受任务或已购权益快照。

## 功能与套餐

Feature 包含稳定 key、显示名、Token 价格、Workflow 映射、适用的图片角色标记及开放状态。先创建/配置再开放，开放要求 Workflow 可执行。节点模型在 [Workflows](/zh/admin/workflows)选择，不在 Catalog 授权表选择。

订阅区分标准/高级等级及固定周期，管理原价/成交价、点数赠送及个人任务折扣。保存套餐后单独编辑 Feature 权限。UI 显式保留不可用/未知授权，不把它们静默当成已知活动产品。已购快照保留原数值权益。

Token 套餐区分购买与赠送数量，总赠送量由服务端计算。停用/移除产品只影响未来购买，保留历史订单。个人购买不进入企业池，企业账本调整见[工作空间](/zh/admin/workspaces)。

## 支付证据

历史支持关键词、渠道（`app`、`jsapi`、`douyin`）、mock/live、状态与购买种类筛选。旧待支付订单核验会排队执行适用的平台查询并展示异步进度，不是把订单直接标为已付。客户端 SDK 成功回调不构成结算证据。

## 抖音交易与退款

交易表单保存共享 HTTPS 图片及会员/Token 映射，服务类型为 **702**，并配置平台标签组。保存使用配置版本；live 应选择真实官方标签，不能沿用模拟标签。密钥与回调 origin 属于部署配置，不是公开表单值。参见[抖音支付](/zh/reference/douyin-payment)。

当前保留服务端全额退款、回调与补偿，小程序申请退款入口仍关闭。后台展示抖音退款异常，但**没有普通人工审批队列或异常解决按钮**。微信退款查询恢复及关联订阅回收存在已记录缺口，不能把异常展示或 mock 成功描述为完整退款运营闭环。完整限制见页末退款合同及 [REST API](/zh/reference/rest-api)。

---

代码依据 · backend `e59716c8`: [app/admin/billing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/billing.py) · [app/templates/admin/billing.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/billing.html) · [documents/PAYMENT_REFUNDS.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/PAYMENT_REFUNDS.md).
