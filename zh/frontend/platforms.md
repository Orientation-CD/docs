# 微信与抖音平台

同一代码库生成不同产物，平台选择会改变原生认证/支付、文件 scheme、录音/隐私、分享及开发者工具打包。浏览器预览或微信模拟器不能证明抖音发布行为。

## 构建正确的目标

| 目标 | 命令/包装脚本 | 导入产物 |
| --- | --- | --- |
| 微信前端 Mock | `pnpm build:mp-weixin:mock` | `dist/build/mp-weixin` |
| 微信 API 生产档 | 配好 origin 后执行 `pnpm quality:mp-weixin:api` | `dist/build/mp-weixin` |
| 微信团队测试/生产 | `scripts/build_mp-weixin-cloud-test.sh` / `scripts/build_mp-weixin-cloud-production.sh` | `dist/build/mp-weixin` |
| 抖音前端 Mock | `pnpm build:mp-toutiao:mock` | `dist/build/mp-toutiao` |
| 抖音自有本地 API | 带包装脚本参数执行 `pnpm build:mp-toutiao:local-test` | `dist/build/mp-toutiao` |
| 抖音团队测试/生产 | `pnpm build:mp-toutiao:cloud-test` / `pnpm build:mp-toutiao:cloud-production` | `dist/build/mp-toutiao` |

监听命令写入 `dist/dev/<target>`。公开 AppID 为微信 `wxec0d577de41255aa`、抖音 `ttd386a53b4dfe7bf501`，密钥和渠道回调凭据留在后端。抖音 builder 会拒绝携带 AppSecret 的前端环境；SDK 信息和项目开关由目标构建档决定。

两端生产包装脚本现均选择 CDN 素材主机，测试档使用 static 主机。[构建模式](/zh/frontend/data-source-modes)解释数据、认证、支付、项目各自的维度。

## 使用属于当前会话的本地地址

手机的127.0.0.1指向手机自己。Mac 与手机应在同一网络，使用 Mac 私有局域网地址及当前会话拥有的 API/存储端口；不能因为熟悉某个固定端口就直接使用。

`build:mp-weixin:api-device-wechat` 要求提供 `VITE_API_BASE_URL`，守卫不会自动发现地址。它使用真实微信身份，后端凭据和 AppID 必须匹配。独立微信 LAN 包装脚本会发现 Mac IP，但目前固定 API7070、结果存储默认28574，因此不是通用自定义端口入口。

抖音本地包装脚本接受显式端口/IP：

```bash
./scripts/build_mp-toutiao-local-test.sh --port 8080 --ip 192.168.1.20
```

两项示例值都要替换成当前会话的值。脚本检查就绪并推导对应存储端口；此档使用真实抖音身份，与微信 mock 配置独立，后端需按 runbook 选择对应抖音模式。开发 HTTP/域名调试例外不能进入发布配置。

## 按真实操作注册域名

| 流量 | 所需域名/配置边界 |
| --- | --- |
| 后端 REST、开发健康检查 | request 域名，发布使用 HTTPS |
| CDN `config/ad-assets.json` | **request** 域名；同 CDN 图片能显示仍不代表 JSON 可请求 |
| 签名表单直传 | 真实存储端点的 upload 域名 |
| 输出下载 | download 域名和精确的 `VITE_RESULT_STORAGE_ORIGINS` |
| HTML 报告 web-view | 与 `VITE_REPORT_WEB_ORIGIN` 一致的业务域名 |
| 专业编辑器/全景 web-view | 精确编辑器 origin 和业务域名，同时仍需[后端集成](/zh/frontend/floor-plans) |
| 抖音网络播放原音频 | 签名存储 origin 的 **request** 域名，仅 upload/download 不够 |

平台域名注册与短期能力凭证是两层校验；刷新平台域名不会续签 URL。不能因为使用 OSS 就允许所有 OSS 主机，应选定测试/生产桶的精确 origin。

户型接力在精确 origin 校验后，仅把独立编辑器凭据放入内存中的 fragment。路由参数、诊断和草稿不能保存完整 web-view 地址；报告和文件查看器有各自的访问校验。

## 文件、隐私与原生呈现

`runtimeConfig.localFileSchemes` 选择 `wxfile://` 或 `ttfile://`。共享文件 helper 调用平台文件系统，本地路径不能视作可永久使用的 HTTPS 媒体。大文件临时路径可能过期，详见[媒体生命周期](/zh/frontend/architecture)。

在平台隐私配置中声明真实使用的录音、选择器、剪贴板与分享 API，授权按钮不能修复控制台未声明能力。邀请/诊断复制失败时保留可选文本和安全诊断类别，不泄露邀请码 bearer。

只改主题 CSS 不能改变原生栏，`themePageMixin` 会在页面显示时重新调用支持的导航/背景/Tab API，modern 默认主题的原生位图由生成器产生。两端均应实查安全区、长文本和按钮对齐。

抖音不会继承微信朋友圈与企业微信客服能力。原生分享面板及外部展示标题可能使用平台模板，而不完全采用应用中的动态文案。

## 支付按渠道分别执行

微信使用服务端签名 JSAPI 参数调用 `uni.requestPayment`；抖音经行业 SDK 使用 `tt.requestOrder`、`tt.getOrderPayment`，并恢复结果未知的平台订单。原生回调都不是最终结算证据，客户端还需核对服务端订单。

后端渠道模式、商户及回调配置必须与前端档位一致。模拟服务端订单与真实原生支付桥是两层机制，见[抖音支付](/zh/reference/douyin-payment)和[快速开始](/zh/get-started/quickstart)。

## 源码依据

核验日期 2026-10-28：[构建档](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/config/build-targets.mjs) · [平台运行时](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/repositories/runtime.ts) · [真机地址守卫](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/require-device-api-url.mjs) · [微信 LAN 脚本](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/build_mp-weixin-local-test.sh) · [平台 helper](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/services/platform.ts) · [编辑器接力](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/pkg-features/services/floorPlanHandoff.ts#L8) · [支付桥](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/pkg-account/services/payment.ts) · [后端本地 runbook](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/runbook.md)。
