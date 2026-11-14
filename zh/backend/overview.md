# 后端概览

FastAPI 管理身份、工作区、客户项目、AI Workflows、私有 Asset 和支付，也在 `/admin` 提供认证的 Studio Control。公开产品路由使用 `/v1`；`/health/live`、`/health/ready`、`/openapi.json` 与 Swagger `/docs` 各有不同职责。

## 产品与执行

| 能力 | 执行与结果 |
| --- | --- |
| 普通图片设计 | 角色化图片与提示词生成不可变图片 Asset |
| 语音与文案 | 有序录音或文本／知识库输入生成 Markdown Document |
| 报告 | 冻结 9、13、17 页 Blueprint，生成 HTML 与受支持的可编辑 PowerPoint |
| 视频 | 剧本或同款输入使用时长／模型计费快照，本地执行 MP4 |
| 户型图片／全景 | 自有供应商 Group、冻结渲染文档及主图进入 SDK 执行 |
| 三维家图片设计 | 七种客户 Feature 共用 SDK Workflow 与原始 H5 集成 |
| 企业协作 | 当前负责人项目、指派历史、阶段、销售统计及成员日报 |

**Feature** 是定价的客户能力，**Workflow** 定义图，**Operation** 是节点。普通模型节点绑定供应商／模型配置；三维家节点通过专用后台绑定版本化 SDK 配置与发布。连接已配置不等于用户有产品权限，也不证明供应商验收。

## 持久化边界

PostgreSQL 保存权限、余额、Job 状态、冻结执行及恢复证据。Redis 承担队列、限流、接力缓存和有界性能观测。对象存储保存已核验的精确版本字节。API、Submit worker、Poll worker 共享镜像，但分别运行。

输入准备在最终准入前提交可恢复的存储凭据；接受后，自有输入才变为无过期 ACTIVE。最终准入原子创建执行 pin、冻结商业证据、预留及 outbox。企业先检查共享钱包，再检查提交成员的月额度。视频预览不产生预留。

项目创建者、当前负责人和 Job 提交者是不同身份。读取谓词提供有界的 owner／负责人访问，写操作仍独立检查。列表隐藏他人输入，授权详情则可返回类型化输入，见[项目](/zh/backend/projects)、[历史操作](/zh/reference/flows/workflow-history-flow)与[数据模型](/zh/reference/data-model)。

从[本地入门](/zh/backend/getting-started)、[架构](/zh/backend/architecture)和[工作流生命周期](/zh/backend/workflows)开始，再读[户型](/zh/backend/floor-plans)、[视频计费](/zh/reference/flows/video-billing-flow)或[日报](/zh/reference/flows/daily-report-flow)。[对齐表](/zh/reference/integration-status)区分源码支持、客户端调用者与部署验收。

源码: [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/api/__init__.py) · [app/workflows/workflow_admission.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/workflow_admission.py) · [app/workflows/read_access.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/read_access.py) · [app/workflows/workflow_sdk_execution.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/workflow_sdk_execution.py)
