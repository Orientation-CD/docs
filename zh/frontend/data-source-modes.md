# 数据源与构建模式

每次构建固定前端数据源、平台、认证、支付与功能开关，用户不能运行时切换 Mock/API。修改这些设置后要重新编译。

## 相互独立的维度

| 维度 | 可选值 | 职责 |
| --- | --- | --- |
| `VITE_DATA_SOURCE` | `mock`、`api` | 前端模拟仓储或真实后端请求 |
| `VITE_MINI_PROGRAM_PLATFORM` | `weixin`、`douyin` | 平台能力与文案 |
| `VITE_MINI_PROGRAM_AUTH_MODE` | `mock`、`wechat`、`douyin` | 身份流程，显式值优先于旧微信设置 |
| `VITE_WECHAT_AUTH_MODE` | `mock`、`live` | 旧微信 code 辅助选择，与所选构建保持一致 |
| `VITE_PAYMENT_MODE` | `mock`、`wechat`、`douyin` | 支付运行配置，本身不会伪造微信原生 JSAPI 调用 |
| `VITE_ENABLE_PRIVATE_PROJECTS` | `true`、`false` | 编译项目路由、绑定、成员视图等 |
| `VITE_SHOW_BACKEND_STATUS` | `true`、`false` | 开发连接提示与健康请求 |
| `VITE_ENABLE_SUBSCRIPTION_SCENARIOS` | `true`、`false` | 仅客户端的会员覆盖和场景面板 |

运行默认值是 `mock` 数据、`weixin` 平台、模拟支付/认证，除非显式或旧设置选择了其它值。构建脚本会覆盖多项值；`.env` 与脚本内赋值都影响结果，应读取选中命令而非仅猜命令名。

前端 Mock 模拟初始图片/界面流程，并明确将多项 API 专用能力标为不可用。API 模式连接真实服务，即使后端又模拟身份、支付或模型。两类 Mock 检查的是不同边界。

## 已提供的构建档

| 构建档 | 数据 | 身份 | 支付 | 项目 |
| --- | --- | --- | --- | --- |
| 微信 `:mock` | 前端 Mock | 界面模拟 | 界面模拟 | 不强制开启 |
| 微信 `:api-local` | 固定8080 API | 模拟 | 后端模拟配置，原生桥仍存在 | 不强制开启 |
| 微信 `:api` | API | 正式微信 | 正式微信 | 开启 |
| 抖音 `:mock` | 前端 Mock | 模拟 | 模拟 | 关闭 |
| 抖音 `:local-test` | API | 正式抖音 | 抖音运行模式，后端模式另配 | 关闭 |
| 抖音 `:cloud-test` / `:cloud-production` | API | 正式抖音 | 抖音运行模式 | 开启 |
| 抖音 `:project-candidate` | API | 正式抖音 | 抖音运行模式 | 开启，允许开发提示/LAN |

抖音配置集中在 `config/build-targets.mjs`。云端包装脚本设置团队的 API/存储/报告 Origin 并检查健康；这些固定环境入口不是通用部署发现。

## 地址与内容设置

| 设置 | 配置内容 |
| --- | --- |
| `VITE_API_BASE_URL` | 后端基础地址，通常为 Origin；当前产品路径从 `/v1` 开始 |
| `VITE_ASSET_BASE_URL` | 静态/CDN 基础地址，团队示例为 `https://static.yuanzhushuzhi.com`；缺少时使用随包占位图 |
| `VITE_ALLOW_INSECURE_LAN_HTTP` | 开发时允许私有 LAN HTTP，回环地址另有例外 |
| `VITE_RESULT_STORAGE_ORIGINS` | 精确媒体 Origin，逗号分隔，本地须包含正确 MinIO 端口 |
| `VITE_REPORT_WEB_ORIGIN` | 单一报告 Origin，发布须 HTTPS，本地例外仅用于开发 |
| `VITE_DESIGN_PROMPT_FIELD_MAX_LENGTH` | 自定义设计字段限制，与部署对齐；示例4000，配置支持1–12000 |
| `VITE_WECHAT_CORP_ID`、`VITE_WECHAT_CUSTOMER_SERVICE_URL` | 可选企业微信客服设置 |

这些都是公开客户端设置，不是密钥存储。`PROJECT_OUTCOMES_ENABLED`、`VIDEO_MODEL_SELECTION_ENABLED` 是后端开关，前端通过发现反映结果，不负责开启发布。

## 动态广告与静态素材

广告通过 CDN `config/ad-assets.json`、缓存版本、启动图映射和有序 `homeBanners` 管理。运营可以不重新编译，发布零到多张轮播并启停各项；启动图默认 `ads/splash.jpg`。功能轮播有独立开关，企业微信名片使用共享 `contact/enterprise-wechat-card.jpg`。

旧的独立广告 URL、名片 URL、服务电话环境变量不再支持；联系电话由应用定义。获取 CDN JSON 需要登记 request 合法域名，见[平台接入](/zh/frontend/platforms)。

## 发布边界

正式 API 产物需剔除健康提示、前端场景覆盖与离线账号/任务实现。服务端权益验收应设置 `VITE_ENABLE_SUBSCRIPTION_SCENARIOS=false`，选演示会员状态不等于购买订阅。

自选本地端口使用[快速开始的显式构建](/zh/get-started/quickstart)，不要尝试在固定8080的 `api-local` 前覆盖 URL。源码检查和实际产物验证见[测试](/zh/frontend/testing)。

## 源码依据

前端 `eca0a5f`（2026-10-20）：[运行默认值](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/repositories/runtime.ts) · [构建档](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/config/build-targets.mjs) · [环境声明](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/env.d.ts) · [广告配置](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/adAssetVersions.ts)。
