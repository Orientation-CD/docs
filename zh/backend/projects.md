# 项目、成交结果与企业活跃度

项目在显式工作空间内归组同一创建者的 Workflows。即使在企业中，项目管理仍然私有；当前所有者的企业概览只披露单独规定的子集。

## 项目生命周期

每个用户/工作空间都有临时项目（scratch）、普通项目和持久默认选择。设备当前选择保存在设备上。普通字段包含名称、客户、地址、描述、面积与户型；scratch 不能像普通客户项目一样编辑。

使用 `/v1/workspaces/{workspace_id}/projects` 列表/创建，对应详情/PATCH 更新，通过 `/default` 设置持久默认。删除需显式选择 `delete_jobs` 或 `move_to_scratch`，可能异步完成。活动任务或保留依赖可能阻止操作。移动 Workflow 保留原请求身份和计费来源。

## 状态目录与结果

认证的 `GET /v1/project-statuses` 返回有序标签、稳定 code 与停滞阈值。基础阶段为 `NEW`、`REQUIREMENTS_CAPTURED`、`REPORT_PRODUCED`。完成语音总结或报告可按既有阶段规则推进主阶段。

`PROJECT_OUTCOMES_ENABLED` 默认 false。开启后目录加入 `WON`、`LOST` 和流失原因；关闭项目保留原主阶段，重新打开则以所选主阶段开始新周期。PATCH 只接受已发布、可选的 code。关闭开关时最多 20 个普通项目加 scratch；开启后仅进行中普通项目占用该额度，因此已关闭项目可使可见列表更长。

首次开启需要文档要求的前端采纳和保护式 API 停机窗口。不能混合开关状态服务，也不能在已有结果数据后关闭开关。见[发布控制](/zh/deploy/sae-deployment)。

## 进度与活跃度不同

`furthest_status` / `furthest_reached_at` 一起表示当前周期到达过的最高主阶段。回退阶段保留最高值，重新打开重置周期。未知/不可信的 pair 投影为两个 null。

已接受的项目修改及根 Workflow 操作记录活跃度。根任务最终成功/失败计入项目活跃度，但不是成员人工操作。读取、默认选择、幂等重放、自动重试与子任务不会增加人工活跃事件。只更新时间戳不会改写项目 `updated_at`。

## 企业概览

成员收到共享余额/消费；仅所有者收到成员数组、私有项目摘要、`last_active_at`、项目 `last_activity_at`、`plan_count` 与缩略图。`plan_count` 是当前项目的根历史任务总数，不是已完成方案或图片数；字段存在（包括 0）才是能力信号。

活跃度可信边界由部署状态管理。状态缺失/损坏时相关操作返回 `503 PROJECT_ACTIVITY_STATE_UNAVAILABLE`；不能把 null 理解为不活跃，也不能通过初始化/清空可信状态绕过错误。停滞按北京时间日历日及目录阈值计算，只有**超过**阈值才提示。缩略图选择、前成员隐私及恢复规则见完整 [REST 合同](/zh/reference/rest-api)。

---

代码依据 · backend `b13cc566`: [app/workspaces/project_api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/project_api.py) · [app/workspaces/project_statuses.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workspaces/project_statuses.py) · [app/admin/enterprise_overview.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/enterprise_overview.py).
