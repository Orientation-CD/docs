# 兼容边界

本页记录已核验服务端仍暴露的接口，不提供恢复已删除产品的教程。新集成从 `/v1/workflows`、类型化 Asset、Feature 定价与工作流节点配置开始。现有 UI 的适配调用仍属于[真实源码链路](/zh/reference/flows/workflow-products-flow#frontend-routing)。

## 区分三种状态

| 状态 | 实际行为 | 全链路说明 |
| --- | --- | --- |
| 仍支持的适配入口 | `/v1/design-jobs` 创建／列表／详情／重试／移动／删除／产物／报告／演示文件进入受支持的 Workflow 处理函数；OpenAPI 标为 deprecated | [准入](/zh/reference/flows/design-job-lifecycle)、[历史操作](/zh/reference/flows/workflow-history-flow)、[报告发布](/zh/reference/flows/report-view-flow) |
| 目录别名 | `GET /v1/billing/catalog`、`GET /v1/design-workflows` 使用目录处理函数，不是独立定价／模型绑定系统 | [功能发现](/zh/reference/flows/discovery-prompts-flow) |
| 明确拒绝 | `POST /v1/design-job-quotes` 返回 `409 WORKFLOW_UPDATED`，旧 quote 不会静默变成新报告请求 | [旧报价边界](/zh/reference/flows/design-job-lifecycle#retired-quote) |

所有者历史别名 `/v1/workspace/design-jobs` 共享 owner 范围 Workflow 列表授权，不授予创建者写权限。两个详情别名都使用相同 `readable_design_job` 谓词，允许原作者、具有成员关系的当前项目负责人，以及活动企业 owner。获授权的按 ID 详情暴露输入 Asset，owner／项目列表仍隐藏其他作者输入。返回的 `submitted_by`、当前 `project_assignee` 与 `permissions` 保留读取和新作者操作的区别。见[历史授权](/zh/reference/flows/workflow-history-flow)。

路由声明状态不包含全部运行时响应。deprecated 不表示所有适配接口都返回 409，声明 200 的 result-file 路由也可能返回签名跳转。

## 恢复结果不确定的动作

精确重放应保留原 endpoint、规范化 body 和幂等 key，由服务端检查指纹兼容性和重试 receipt。不要修改执行中的 URL／body／key 后，就认为它还是同一动作。确认原结果后，再按当前规范契约发起独立的新动作。可能已接受的供应商 POST 是另一条边界：[UNKNOWN 恢复](/zh/backend/workflows#unknown-recovery) 使用冻结尝试、持久截止时间和只读确认，更换适配 URL 或 key 不能让另一笔付费派发变安全。

## 视频请求与目录兼容

省略 `resolution` 保留现有提交的请求身份。画幅省略、传 null 或显式传 `9:16` 使用同一个默认身份。显式提交的分辨率和非默认画幅参与请求指纹。已受理的 `video_time_v1` 快照继续使用计价时冻结的分辨率，早期快照为 480p。历史 `feature_v1` 或无商业快照的任务沿旧渲染路径执行。公开目录从已启用的 480p 档投影 `model_rates` 供旧客户端读取。见[视频费用确认](/zh/reference/flows/video-billing-flow)。

## 不再定义当前系统的旧内容

已移除的报告模板编辑器、report-item／quote 拼装、仅图片供应商表、Catalog 级模型选择，都不是当前配置步骤。新的三维家工作使用共享 SDK 配置／发布版，不是恢复通用 3vjia_render Provider 模型。已有冻结历史执行保留明确 SDK 兼容解码，历史发布版不可用时不能用最新版替代。旧单 JSON 户型请求只为精确旧回执恢复而受理，新渲染需要 JSON 和已核验主 Image。当前报告使用 Blueprint 产品，模型绑定在 Workflow 节点，产物使用类型化 Asset。旧 URL 仅保留指向当前指南的短迁移入口，并排除搜索。历史迁移文件用于恢复取证，不是运行时安装教程。

所有仍声明的公开适配接口保留在[生成路由清单](/zh/reference/rest-api#generated-route-index)，并有逐接口解释。清除旧说明不能隐瞒仍暴露的 API，也不能假装现有 app 已完成传输层迁移。

源码：[src/pkg-features/repositories/designJobSubmit.ts](https://github.com/Orientation-CD/wechat_mini_program/blob/7f1a3169338c10bd4139c24318f7a35caf86310c/src/pkg-features/repositories/designJobSubmit.ts) · [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/api/__init__.py) · [app/workflows/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/api.py) · [app/billing/billing_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/billing/billing_api.py)
