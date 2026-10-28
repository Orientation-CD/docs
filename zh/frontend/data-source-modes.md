# 数据源与构建模式

产物固定了数据源、平台、认证、支付和编译期能力。已安装的 Mock 包没有用户开关可以直接变成 API 包；修改这些配置后需要重新构建并导入。

## 先读命令，再读环境文件

`runtimeConfig` 提供缺省值，`.env` 提供构建值，脚本行内赋值覆盖相应变量，抖音 `build-targets.mjs` 再固定构建档配置。带行内赋值的脚本可能覆盖命令前缀传入的变量。完整[配置参考](/zh/reference/configuration)从已核验源码生成。

| 维度 | 当前配置 | 边界 |
| --- | --- | --- |
| 数据 | `VITE_DATA_SOURCE=mock/api` | 前端模拟或真实后端请求 |
| 平台 | `VITE_MINI_PROGRAM_PLATFORM=weixin/douyin` | 分享、文件 scheme 与平台呈现 |
| 认证 | `VITE_MINI_PROGRAM_AUTH_MODE=mock/wechat/douyin` | 显式认证模式；现有微信 helper 还使用 `VITE_WECHAT_AUTH_MODE=mock/live` |
| 支付 | `VITE_PAYMENT_MODE=mock/wechat/douyin` | 前端支付运行时；后端商户和模式单独配置 |
| 项目 | `VITE_ENABLE_PRIVATE_PROJECTS` | 编入/排除路由、Tab、绑定及成员视图 |
| 诊断 | `VITE_SHOW_BACKEND_STATUS` | 开发状态与健康检查 |
| 演示权益 | `VITE_ENABLE_SUBSCRIPTION_SCENARIOS` | 客户端情景实现，不是真实服务端购买 |

没有配置时默认前端 Mock、微信平台和模拟认证/支付；`.env.example` 则明确使用 API 数据。两者都不能代表所有 npm 命令，应读取实际赋值。

## 支持的构建档与产物

| 构建档 | 数据/认证/支付 | 项目行为 |
| --- | --- | --- |
| 微信 `build:mp-weixin:mock` | 前端 Mock | 明确强制关闭项目 |
| 微信 `dev:mp-weixin:mock` | 前端 Mock | 不强制项目开关，可继承构建环境 |
| 微信 `:api-local` | 固定8080的 API / 模拟认证 / 模拟支付配置 | 不强制项目开关 |
| 微信 `:api-local-wechat` | API / 真实微信认证 / 模拟支付配置 | 可传地址，否则使用8080 |
| 微信 `:api` | API / 真实微信 / 微信支付 | 开启项目，选择生产静态资源地址 |
| 抖音 `:mock` | 前端 Mock / 模拟 / 模拟 | 关闭项目 |
| 抖音 `:local-test` | API / 真实抖音 / 抖音运行时 | 关闭项目，允许开发局域网 |
| 抖音 `:cloud-test` / `:cloud-production` | API / 真实抖音 / 抖音运行时 | 开启项目，关闭局域网与开发状态 |
| 抖音 `:project-candidate` | API / 真实抖音 / 抖音运行时 | 开启项目，允许开发状态/局域网 |

构建目录为 `dist/build/<platform>`，监听目录为 `dist/dev/<platform>`。先后对同一目录构建不同档，会覆盖前一个产物，上传前务必确认。前端 Mock 不验证数据库、worker、模型供应商或服务端结算；真实 API 配模拟供应商检验的是另一层边界。

## 不同 origin 是不同能力

| 配置 | 用途 |
| --- | --- |
| `VITE_API_BASE_URL` | 公开产品路由的后端基址 |
| `VITE_ASSET_BASE_URL` | 公开静态/CDN 素材；生产包装脚本选 CDN，测试选 static 主机 |
| `VITE_ALLOW_INSECURE_LAN_HTTP` | 开发环境允许私有局域网 HTTP，不等于平台域名注册 |
| `VITE_RESULT_STORAGE_ORIGINS` | 精确结果域名白名单，本地要带自己拥有的 MinIO 端口 |
| `VITE_REPORT_WEB_ORIGIN` | 受信的 HTML 报告 origin |
| `VITE_FLOOR_PLAN_WEB_ORIGIN` | 专业编辑器/查看器的预期 origin，未配置时使用 API origin |
| `VITE_DESIGN_PROMPT_FIELD_MAX_LENGTH` | 可编辑设计文本上限，示例4000，可配置1–12000 |
| `VITE_WECHAT_CORP_ID`、`VITE_WECHAT_CUSTOMER_SERVICE_URL` | 可选的企业微信客服配置 |

这些值会进入客户端，不能放 AppSecret、供应商凭据或私钥。受信的报告 origin 不会自动获得存储或户型编辑器权限；编辑器配置也不能让[本轮后端缺失的路由](/zh/frontend/floor-plans)凭空出现。

## 本地和云环境包装脚本

自定义 API 端口时使用[快速开始](/zh/get-started/quickstart)中的显式环境/构建命令。在固定8080的 `:api-local` helper 前加另一地址，不能改变脚本里的行内赋值。微信局域网包装脚本仍固定7070；抖音本地包装脚本支持 `--port`、`--ip`。

云包装脚本先检查就绪，再选择 API、报告、存储、静态资源 origin，并执行目标产物门禁。它们是团队环境入口，不负责自动发现部署。生产素材现在使用 `https://cdn.yuanzhushuzhi.com`，测试示例保留 `https://static.yuanzhushuzhi.com`。

微信 API-local 不会把原生支付桥替换成假的成功回调；模拟订单应经过文档中的后端 mock 结算流程。检查真实服务端权益时关闭演示套餐情景。后端 `PROJECT_OUTCOMES_ENABLED`、`VIDEO_MODEL_SELECTION_ENABLED` 属于部署控制，不能由客户端开关启用。

## 源码依据

核验日期 2026-10-28：[命令与行内赋值](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/package.json) · [运行时](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/repositories/runtime.ts) · [抖音构建档](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/config/build-targets.mjs) · [环境示例](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/.env.example) · [生产包装脚本](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/build_mp-weixin-cloud-production.sh) · [抖音生产脚本](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/scripts/build_mp-toutiao-cloud-production.sh)。
