# 配置参考

配置分为进程设置、数据库中的产品/provider 配置，以及部署/客户端构建选择。三者不能相互替代。

## 默认值与示例值

下方清单分别提取后端 Settings 的**代码默认值**和已提交 `.env.example` 的值。示例可能为了本地 mock 故意覆盖默认；两列都不代表真实云端环境。秘密默认/示例内容已隐藏。

<!--@include: ../../.vitepress/generated/configuration.zh.md-->

## 配置归属

| 配置族 | 来源与含义 |
| --- | --- |
| 进程设置 | `app/core/config.py`；环境变量优先于当前工作目录 `.env`，然后才是代码默认 |
| 定价与资格 | 数据库 Feature、Workflow 节点配置、订阅方案和权益授权，通过 Admin/公开发现检查 |
| 模型执行 | ProviderConnection、ProviderModelConfig、选中的 Workflow 节点；凭据加密并随执行冻结 |
| 前端模式 | 构建脚本/环境变量选择平台、API/mock 仓储行为、传输源站 |
| 云端拓扑 | namespace Envs、Secret/ConfigMap 引用、RDS/Redis/OSS/registry、digest 与 `APP_VERSION` |

改一个环境变量不会自动配置 Feature、激活 Workflow 或授予订阅权限。法律文档、订阅方案或执行配置缺失时，API 能启动也不能完成业务。

## 需要一起检查的设置

- **身份：** JWT 算法/秘密、access/refresh 生命周期、平台 AppID/secret、手机号解密密钥、不可变法律文档。真实登录与 mock 登录分开选择。
- **支付：** 微信/抖音 mock/live 模式、各渠道商户/密钥/回调、过期/对账和加密快照，API 与两个 worker 保持一致。
- **Asset：** 容器内 S3 endpoint、公网 presign endpoint、bucket/region/凭据、大小类型限制与保留期。直传是签名 multipart POST，CDN host 不能替代签名 host。
- **Workflow：** 队列/并发/限流、请求/provider 超时、重试/lease、本地视频/PPTX 资源限制及供应商能力。放宽 API 字段限制不代表供应商支持。
- **特性激活：** `PROJECT_OUTCOMES_ENABLED=false` 是首次启用边界，不能滚动开关或在写入成败后关掉。`VIDEO_MODEL_SELECTION_ENABLED` 控制可选视频模型，公开发现仍是权威。成败开关按受保护发布流程操作。
- **语音浏览器交接：** 开启语音上传还需正确 HTTPS URL/origin/cookie 设置；通用 API Bearer 不是浏览器会话凭据。

## 优先级与秘密材料

本地 Compose 中，生成的 `STACK_*` 和显式服务 `environment:` 覆盖服务 `env_file`。`--secret` 只选择输入 profile，不决定所有运行值，见[存储环境](/zh/testing/storage-environments)。

生产读云端配置；不要用一小段 JSON 覆盖 SAE 完整 Envs。按上游读取、合并、漂移检查流程保留无关项与 Secret 引用，原始数组与秘密不得提交。

配置加密 key 要在角色之间和保留数据期间稳定。未经审阅的轮换可能导致既有 provider/支付快照无法解密。私钥 PEM 与凭据放忽略的受保护文件/Secret 挂载；源码快照与生成文档不得带秘密。

## 配置不证明功能已部署

`VITE_FLOOR_PLAN_WEB_ORIGIN` 是精确受信前端 H5 origin（否则用 API origin），不是补出后端户型路由的开关。主题选择也受 selectable 目录约束，当前设置页入口隐藏。见[对齐状态](/zh/reference/integration-status)。

成员月额度是持久的企业／成员配置，不是环境变量开关。性能窗口与版本归属见[可观测性](/zh/backend/observability)，每个运行进程／镜像保留 `APP_VERSION`。生成表代码默认值不等于实际部署值。

## 源码依据

已按[记录的源码版本](/zh/reference/source-revisions)核对。

- [Settings 与校验](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/config.py)
- [已提交本地示例](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/.env.example)
- [数据库 provider 配置](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/providers/provider_configuration.py)
- [构建脚本](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/package.json)
