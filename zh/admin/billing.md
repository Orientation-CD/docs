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

## 配置视频模型单价与三种模式规则

视频计费区独立于通用 Feature 积分字段。配置正整数模型单价、剧本每秒字符数，以及 `script`、`reference_template`、`reference_upload` 三种规则。每种选择按秒 `per_second` 或按次 `per_task`：按次必须有正整数 `fixed_seconds`，按秒必须为空。基础模型不能停用；它的“默认”是已发布基准 8 积分/秒，自定义值必须带自定义标记。其他启用且非自定义模型由服务端按“基础单价 × 模型倍率”向上取整；自定义价格使用明确整数。其他模型被省略/禁用后，从可用价格表移除。

保存携带显示的 `configuration_version`。`admin_save_video_billing` 校验整套规则，取得视频 Feature 权威锁，原子替换单价/规则并增加版本。旧表单返回 409 `VIDEO_BILLING_CONFIGURATION_STALE`，应重新读取；无效规则返回 422 `VIDEO_BILLING_CONFIGURATION_INVALID`。已接纳快照保留原模型/金额，旧客户预览必须重新确认。

对照 [build_video_rates](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/video_billing.py#L110)、[admin_save_video_billing](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/video_billing.py#L150) 与[用户费用链路](/zh/reference/flows/video-billing-flow)。平台积分和供应商余额不是同一种计量。

---

代码依据 · backend `749e82df`: [app/admin/billing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/billing.py) · [app/templates/admin/billing.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/templates/admin/billing.html) · [documents/PAYMENT_REFUNDS.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/documents/PAYMENT_REFUNDS.md).
