# 抖音支付集成

后端已经实现通用交易系统支付：与微信共享服务端定价、幂等订单、积分账本、退款预留和同手机号账号，保留独立渠道 `douyin`、签名和回调。mock 成功不能证明真实设备/交易路径已验收。

## 前后端调用

1. 读取公开 billing/Feature 目录，选择返回的 plan/package code。
2. 向 `/v1/subscriptions` 或 `/v1/token-purchases` 提交 `type: "douyin"` 和持久 `Idempotency-Key`。
3. 按参数调用 `tt.requestOrder`，再调用 `tt.getOrderPayment`；已有平台订单可按 get-payment 动作恢复。
4. 查询后端支付记录。只有已验签回调/平台查询证据可结算和发放权益，客户端 success 不是到账证据。
5. 退款结果与退款申请回调使用独立的已验证幂等路径。小程序目前不开放应用内退款申请入口。

抖音构建声明 `industrySDK: true`。类目/交易准入与已发布平台回调仍是外部前提。实现不证明 iOS 普遍支持 CNY；固定验收文档记录了平台 DIAMOND 限制，要求真机证据。不要沿用旧文档“一律禁止 iOS 购买”，也不能用 mock 宣称真实现金支付获平台支持。

## 配置与密钥

| 配置 | 含义 |
| --- | --- |
| `DOUYIN_PAY_MODE` | `mock` / `live`，生产使用预期 live |
| `DOUYIN_APP_ID`、`DOUYIN_MINI_PROGRAM_APP_SECRET` | 应用身份/client_token，与登录复用 |
| `DOUYIN_PAY_MERCHANT_ID`、`DOUYIN_APP_KEY_VERSION` | 商户核对与平台注册公钥版本 |
| `DOUYIN_APP_PRIVATE_KEY` / `_FILE` | 手机解密/交易签名共用无密码 RSA-2048 私钥，inline PEM 优先 |
| `DOUYIN_PLATFORM_PUBLIC_KEY` / `_FILE` | 平台验签公钥，与应用登记公钥不同 |
| `DOUYIN_PAYMENT_NOTIFY_URL` | HTTPS `/v1/webhooks/douyin/payment` |
| `DOUYIN_REFUND_NOTIFY_URL` | HTTPS `/v1/webhooks/douyin/refund` |
| `DOUYIN_REFUND_APPLICATION_FORWARD_ENABLED` | 明确开启跨环境 fallback，默认 false |
| `DOUYIN_REFUND_APPLICATION_FALLBACK_URL` | 本地无订单的已验证退款申请，可转发的固定 HTTPS 对端 |

API 与两个 worker 保持一致。旧手机号专用私钥变量已删除，现有环境需迁移至共享应用私钥命名。私钥放忽略的受保护文件或 Secret，不公开用户本地路径、凭据和完整 Envs。

## 回调与环境路由

支付、退款、退款申请都用 RSA 验证未经修改的 JSON 原始字节，header 为 `Byte-Timestamp`、`Byte-Nonce-Str`、`Byte-Signature`，不是旧 SHA1/token 共享秘密协议。变更状态前核对应用、订单、商户、金额并保证事件幂等。

共享 AppID 不会自动把回调分流到阿里云 namespace。逐单可覆盖支付/退款结果通知地址；首次退款申请入口是平台方案配置。仅在 live 且显式开启时，入口环境可把已认证、但本地不存在订单的申请转发固定 peer；peer 再次验签并处理自己的订单。已有本地订单不走 fallback，入口不产生第二次金融动作。普通 mock 测试保持关闭。

## 发布验收

核对真实准入/已发布回调、新老用户登录、手机号绑定和账号复用、下单/恢复/过期、重复/篡改回调和对账。Android/iOS 分别记录结果和平台拒绝。财务验收需要明确批准的受控交易/退款流程，文档验证不会执行。

启用入口前读固定生产清单和未完成能力，公共结算/过期路径见[支付调用链](/zh/reference/flows/payment-flow)。

## 源码依据

已按[记录的源码版本](/zh/reference/source-revisions)核对。

- [抖音交易实现契约](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/DOUYIN_PAYMENT.md)
- [生产验收要求](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/DOUYIN_PRODUCTION_ACCEPTANCE.md)
- [RSA 网关与下单](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/billing/douyin_pay.py)
- [回调验签和路由](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/billing/douyin_api.py)
