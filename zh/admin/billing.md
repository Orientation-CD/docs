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

## 配置视频模型与分辨率单价

视频计费区按模型分组，给每个可售分辨率维护启用状态与整数 Token/秒单价。选择默认价时，服务端读取该组合自己的工厂价。选择自定义时，输入正安全整数。停用会移除本次保存后的售价行。`Doubao-Seedance-2.0-mini / 480p` 始终启用，可单独自定义价格。其他组合各自设置。后台仍需要剧本每秒字符数及 `script`、`reference_template`、`reference_upload` 三条模式规则。选择 `per_task` 时提供正整数 `fixed_seconds`，选择 `per_second` 时将它留空。 [app/workflows/operations/video/video_pricing_matrix.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/operations/video/video_pricing_matrix.py) · [build_video_rates](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/admin/video_billing.py#L88) · [admin_save_video_billing](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/admin/video_billing.py#L123)

管理员保存时提交当前 `configuration_version`。后端核验规则后取得视频 Feature 权威锁，在同一事务替换费率和模式规则并递增版本。遇到 409 `VIDEO_BILLING_CONFIGURATION_STALE` 时刷新后再比较修改，422 `VIDEO_BILLING_CONFIGURATION_INVALID` 表示输入组合或规则无效。已接纳快照保存原模型、分辨率和金额。 [客户费用全链路](/zh/reference/flows/video-billing-flow)

迁移把既有单价行归入 `480p`，改用 `(model_key, resolution)` 主键，保留自定义金额，以对应工厂价刷新默认行，并补齐已有配置中的可售组合。随后移除临时 SQL 默认值，要求写入明确指定分辨率。`MiniMax-H3` 只有 `768p` 与 `2k`。名称为 `Seedance-2.5-重制增强` 的模型有工厂价，但迁移不播种它，避免带 `480p` 的新模型进入尚使用旧五模型白名单的目录兼容字段。启用该模型需确认目标 renderer 支持，并考虑已部署客户端版本。 [migrations/versions/c9e4a7f1b820_add_video_rate_resolution_key.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/migrations/versions/c9e4a7f1b820_add_video_rate_resolution_key.py) · [migrations/versions/d7e1f4a9c305_drop_video_rate_resolution_default.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/migrations/versions/d7e1f4a9c305_drop_video_rate_resolution_default.py)

降级检查会在修改数据库前拒绝仍有非 `480p` 档位或旧版模型清单以外的费率行。故障恢复应先核对应用镜像和数据库结构的兼容范围。

---

代码依据 · backend `f34b8a4d`: [app/admin/billing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/admin/billing.py) · [app/templates/admin/billing.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/templates/admin/billing.html) · [documents/PAYMENT_REFUNDS.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/documents/PAYMENT_REFUNDS.md).
