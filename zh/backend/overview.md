# 后端总览

YuanZhu 使用 FastAPI 提供身份认证、工作空间、私有客户项目、AI Workflow 与支付服务。同一服务还在 `/admin` 提供 Studio Control 管理后台。

公开 API 使用 `/v1`；健康检查为 `/health/live` 和 `/health/ready`。运行中的服务在 `/docs` 提供 Swagger UI，在 `/openapi.json` 提供接口结构。完整合同与兼容接口见 [REST API](/zh/reference/rest-api)。

## 系统提供什么

| 能力 | 执行与产物 |
| --- | --- |
| 图片设计 | 绑定角色的图片与提示词 → 不可变图片 Asset |
| 需求采集 | 1–3 段录音 → Markdown 需求总结 Document |
| AI 文案 | 八种文本功能 → Markdown，可使用私有知识文档 |
| 设计报告 | 9、13 或 17 页 Blueprint → HTML 预览与可编辑 PowerPoint |
| 视频生成 | 脚本、主角图片与可选参考图/录音 → MP4 |

**Feature** 是面向客户的计价功能，指向代码定义的 **Workflow**，其中的节点执行 **Operation**。管理员在每个 Workflow 的节点上选择执行模型。功能是否开放以及套餐授权决定客户能否使用；创建服务商连接并不会直接开放产品。

## 持久化边界

PostgreSQL 保存账号、权限、余额、任务状态与执行回执。Redis 承担 ARQ 队列、限流、会话及有界性能数据。私有对象存储保存核验后的输入、产物和精确版本。API 与 worker 使用同一个应用镜像。

每次提交都显式指定工作空间。个人任务使用个人钱包，企业任务使用该企业的钱包。同一企业中的项目管理仍对创建者私有；所有者的企业概览通过单独合同披露成员与项目数据。

先读[本地启动](/zh/backend/getting-started)，再读[系统架构](/zh/backend/architecture)与 [Workflow 生命周期](/zh/backend/workflows)。产品能力分别见[设计报告](/zh/backend/reports)、[语音](/zh/backend/voice)、[文案](/zh/backend/copywriting)与[视频](/zh/backend/video)。

## 当前持久化与授权边界

Workflow 自有输入先归档，再进入最终准入事务；接受后成为 ACTIVE、无过期时间并形成不可变 pins。企业任务还检查提交成员的月额度，与共享钱包独立。owner 可以读取他人可见任务详情但不返回私有输入，写操作仍限创建者。见[资产](/zh/backend/assets-storage)、[额度](/zh/reference/flows/member-quota-flow)、[历史授权](/zh/reference/flows/workflow-history-flow)。

视频现有脚本、系统同款、自传参考三条路径，并非都必须“脚本加一张场景图”。性能分析采用带版本的有界历史与完整窗口比较。[对齐表](/zh/reference/integration-status)还记录了此前端已有、此后端 main 缺失的户型能力。

---

代码依据 · backend `e59716c8`: [app/main.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/main.py) · [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/api/__init__.py) · [app/workflows/workflow_configuration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/workflow_configuration.py).
