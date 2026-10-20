# 工作流（Workflow）、Feature 与 Operation

Feature 是请求 `type` 选择的公开产品，拥有自己的价格、开放状态与套餐权限。Workflow 定义可执行图，节点使用可复用的 Operation。节点模型选择归属于具体 Workflow，因此修改一个 Workflow 不会重绑所有使用同一 Operation 的产品。

## 提交合同

1. 通过公开的 `GET /v1/billing/features` 发现可执行产品与价格。
2. 上传并完成所需 Asset，保持声明角色、不可变版本及对应产品的端口绑定。
3. 使用 Bearer 认证、`Idempotency-Key`、显式 `workspace_id`、`type` 及产品规定的输入提交 `POST /v1/workflows`。`project_id` 可省略，此时任务进入临时项目；后续移动项目不会改变原始请求身份。
4. 保存回执，按返回的 `poll_after_seconds`/`Retry-After` 轮询 `status_url`。读取有序、带类型的 `inputs`/`outputs`，不能假定所有结果都是图片。

新请求会冻结已接收的图、模型/连接配置、提示词、商业价格及输入身份。后续管理配置只影响新任务。每次执行都有持久化 Operation/Submission、尝试代际与执行围栏，防止旧执行覆盖新尝试的结果。

## 状态与计费

公开状态为 `pending` → `running` → `completed` 或 `failed`。进度估计保持单调；100 表示完成，并不保证每个外部阶段按预测时间结束。每用户跨工作空间的活动任务有上限，默认五个。

显式指定的工作空间付款。准入事务原子预留 Tokens，最终成功后消费，失败后释放。包含的子任务不会作为另一个客户产品单独收费。参见[计费](/zh/backend/billing-tokens)。

精确请求重放使用相同键与请求体，返回已接收任务。失败任务重试是在 `/v1/workflows/{design_job_id}/retry` 上的单独显式操作，受服务端重试资格与冻结输入限制。付费服务商是否已接收不明确时，不能安全重发；应按错误与重试元数据处理。

## 历史与生命周期

`GET /v1/workflows` 是个人任务历史，`/v1/workspace/workflows` 是受所有者权限约束的工作空间视图。移动后按任务当前项目过滤。移动、删除使用 canonical Workflow 接口，并核查生命周期、保留依赖和权限。存储清理失败时可能已持久接受删除声明；应重试规范操作，不能因此另建任务。

产品差异见[图片及兼容接口](/zh/backend/design-jobs)、[报告](/zh/backend/reports)、[语音](/zh/backend/voice)、[文案](/zh/backend/copywriting)与[视频](/zh/backend/video)。完整结构、错误处理及废弃接口见 [REST API](/zh/reference/rest-api)。

---

代码依据 · backend `b13cc566`: [app/workflows/workflow_admission.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/workflow_admission.py) · [app/workflows/workflow_execution.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/workflow_execution.py) · [documents/REST_API_INTERFACE.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md).
