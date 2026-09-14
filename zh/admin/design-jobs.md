# 设计任务运营

任务分区位于 `GET /admin/design-jobs`（模板 `app/templates/admin/design_jobs.html`），是你分诊客户提交的异步设计任务的地方。当仪表盘弹出"任务需要关注"告警时，这就是运营的前门。

## 任务状态

设计任务在 `DesignJobStatus`（`app/db_models.py`）中流转：

| 状态 | 含义 |
| --- | --- |
| `pending` | 已接受，等待分派。 |
| `running` | 已分派到提供商，等待结果。 |
| `completed` | 成功完成（终态）。 |
| `failed` | 永久失败（终态）。 |

只有 `completed` 和 `failed` 是终态。超过配置的慢任务阈值仍处于 `pending`/`running` 的任务被视为"卡住"并在告警中显示。

## 列表与筛选

列表支持实时搜索和状态筛选，每页 50 条分页。

**搜索匹配：** 用户名、任务类型、提供商任务 ID、错误消息和任务 ID。
**状态筛选：** 全部 / pending / running / completed / failed。

| 列 | 显示内容 |
| --- | --- |
| Job | 任务 ID + 创建时间。 |
| User | 所有者显示名称。 |
| Type / Tokens | 任务类型和预留/消耗的积分。 |
| Status | 状态标签。 |
| Provider ID | 提供商自己的任务 ID（如果已分派）。 |
| Created | 提交时间。 |

## 任务详情（`GET /admin/design-jobs/{id}`）

点击行打开 `app/templates/admin/design_job_detail.html`。显示：
- 任务的输入、提示词和参数。
- 所有子**提交记录**（`DesignJobSubmission`）及其提供商生命周期。
- 输出和相关**资产**（输入图片、结果图片、蒙版、录屏）。
- 当前状态、提供商 ID 和任何安全（脱敏）的错误消息。

## 对任务的操作

### 移除终态任务（`POST /admin/design-jobs/{id}/remove`）

**仅当任务为终态**（`completed` 或 `failed`）时才能移除，通过 `delete_terminal_design_job`。这是清理旧/噪声任务的操作。对仍在运行的任务拒绝执行，以确保你永远不会删除在途工作。

### 标记为失败（`POST /admin/design-jobs/{id}/mark-failed`）

调用 `admin_mark_design_job_failed(...)`。当任务卡住 `pending`/`running` 超过慢任务阈值且提供商不可恢复时使用。它将任务转为 `failed`，结算/释放预留积分，并记录安全的失败原因，使客户余额得到纠正。

> 优先使用"标记失败"而非让任务无限期挂起：它释放预留积分并清除卡住任务告警。

## 典型分诊流程

1. 打开仪表盘告警 → 链接到 `/admin/design-jobs`（或 `?status=failed`）。
2. 筛选 `running`/`pending`，按时间排序。
3. 打开详情，检查提供商 ID 和错误。
4. 如果不可恢复 → **标记为失败**。如果是旧/终态垃圾 → **移除**。
5. 如果失败集中出现，检查 [providers](/admin/providers) 和 [performance](/admin/performance)。
