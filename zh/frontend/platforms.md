# 微信与抖音平台接入

共享源码产出不同平台包，平台运行选择影响身份、支付、文件路径、音频、隐私和分享。微信模拟器成功不等于抖音发布验证通过。

## 构建和导入

| 目标 | 入口 | 导入目录 |
| --- | --- | --- |
| 微信 Mock | `pnpm build:mp-weixin:mock` | `dist/build/mp-weixin` |
| 微信正式 API | 配好 Origin 后 `pnpm build:mp-weixin:api` | `dist/build/mp-weixin` |
| 微信团队云环境 | `./scripts/build_mp-weixin-cloud-test.sh` / `./scripts/build_mp-weixin-cloud-production.sh` | `dist/build/mp-weixin` |
| 抖音 Mock | `pnpm build:mp-toutiao:mock` | `dist/build/mp-toutiao` |
| 抖音本地 | `pnpm build:mp-toutiao:local-test` | `dist/build/mp-toutiao` |
| 抖音云环境 | `pnpm build:mp-toutiao:cloud-test` / `:cloud-production` | `dist/build/mp-toutiao` |

`dev:*` 输出到 `dist/dev/<target>`。公开 AppID：微信 `wxec0d577de41255aa`，抖音 `ttd386a53b4dfe7bf501`。AppSecret、手机号解密私钥、回调密钥只在后端。抖音构建还会拒绝含抖音 AppSecret 变量的构建环境。

## 本地真机调试

[快速开始](/zh/get-started/quickstart)用回环地址连模拟器；手机的 `127.0.0.1` 指向手机自己，因此真机包要用 Mac 的私有局域网地址，且两者同网。

`build:mp-weixin:api-device-wechat` **要求**明确的 `VITE_API_BASE_URL`，校验器不会自动选地址；它使用正式微信身份，后端/AppID 必须匹配。独立 `build_mp-weixin-local-test.sh` 会自动选 Mac 地址，但目前固定 API7070，并有自己的结果存储端口设置，不是任意端口通用包装。

抖音本地脚本接受端口、可选 IP，检查健康并推导存储端口：

```bash
./scripts/build_mp-toutiao-local-test.sh --port 8080 --ip 192.168.1.20
```

两个示例值都要改成你拥有的栈和 Mac 地址。此构建用真实抖音身份，后端独立配置；模拟微信不会提供抖音凭据。配套 `--douyin real` 设置见后端本地手册。

本地域名校验例外只用于调试，云端/发布必须 HTTPS 和正确合法域名。

## 按实际请求配置域名

| 流量 | 平台登记/前端设置 |
| --- | --- |
| REST 与开发健康请求 | request 域名，发布须 HTTPS |
| CDN `config/ad-assets.json` | **request** 域名，同一 CDN 还提供图片也不例外 |
| Asset 直传 | 签名存储地址的 upload 域名 |
| 结果下载 | download 域名与精确 `VITE_RESULT_STORAGE_ORIGINS` |
| HTML `web-view` | 与 `VITE_REPORT_WEB_ORIGIN` 匹配的业务/报告域名 |
| 抖音原始录音网络播放 | 签名 OSS Origin 的 **request** 域名，仅 upload/download 不够 |

团队生产录音使用配置的生产 OSS Origin，测试有独立桶；从选定包装脚本/部署取得准确值，不放行所有 OSS 主机。平台后台更新后刷新开发者工具域名信息，再重新编译。签名 URL 也会独立过期。

## 隐私、文件与分享

录音和文件选择走平台隐私/权限处理。需在平台隐私保护指引声明实际 API，点击授权控件不能补救后台未声明能力。

剪贴板用于企业邀请码和诊断复制。缺声明时可能返回微信 `errno: 112`、抖音 `104179`。自动复制不可用时，邀请码仍可选择复制；日志只记录错误类别，不记录邀请凭据。

本地文件 scheme 包括 `wxfile://`、`ttfile://`。文件检测、下载保存使用共享平台辅助；抖音不继承微信朋友圈分享和企业微信客服能力。邀请各用平台原生面板；抖音端外分享文案可能由平台模板/默认配置控制，不完全等于端内动态标题。

## 支付行为

微信通过 `uni.requestPayment` 使用签名 JSAPI 参数；抖音使用行业 SDK 的 `tt.requestOrder`、`tt.getOrderPayment`，并恢复不确定平台订单。抖音构建明确加入行业 SDK 元数据。两端原生回调都不是最终结算凭据，前端继续确认后端订单。

后端支付模式、商户和平台设置须匹配前端构建。继续阅读[支付参考](/zh/reference/douyin-payment)、[测试](/zh/frontend/testing)、[本地栈](/zh/deploy/local-stack)。

## 源码依据

前端 `eca0a5f`、后端 `b13cc56`（2026-10-20）：[构建档](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/config/build-targets.mjs) · [设备校验](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/scripts/require-device-api-url.mjs) · [平台能力](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/platform.ts) · [抖音支付桥](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-account/services/payment.ts) · [后端本地设置](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/runbook.md)。
