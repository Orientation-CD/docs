# 任务家族与诊断

`/admin/design-jobs` 保留后台 URL，客户 API 使用 [Workflows](/zh/backend/workflows)。页面搜索父/独立任务卡，并在父任务下展示包含的子任务。

## 找到对应执行

可按任务、用户、手机号、服务商身份或错误搜索，并按状态过滤。分页总数是父/独立卡片数，不是全部子记录数。卡片展示类型、Token 成本/状态、时间、状态、详情与诊断入口。展开子任务可定位失败依赖；子任务完成不代表报告父任务完成。

详情/诊断提供持久 Workflow/Operation/Submission 身份及尝试证据。下载要求管理员授权和存储片段可用。诊断存储故障不能证明服务商未收到请求。

## 受限干预

保留引用及生命周期允许时可移除终态任务。移除使用共享持久清理路径，存储不可用可能需要重试。不能通过手工删对象或数据库记录绕过引用检查。

详情可能提供受执行代际约束的**标记失败**操作。这是本地执行覆盖，不是取消服务商任务，也不证明外部付费调用失败。处理器重新核查当前代际、状态与服务商证据，通过正常补偿/收尾维护父任务账务。接收情况未知时仍不能任意重发。

干预前保留错误、代际、诊断及受影响 ID。使用[性能](/zh/admin/performance)区分正常积压与卡住的尝试。配置修复在 [Workflows](/zh/admin/workflows)或[模型](/zh/admin/providers)中完成，不改写已接受任务的冻结输入。

---

代码依据 · backend `e59716c8`: [app/admin/workflows.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/workflows.py) · [app/admin/workflow_diagnostics.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/workflow_diagnostics.py) · [app/templates/admin/design_jobs.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/design_jobs.html).
