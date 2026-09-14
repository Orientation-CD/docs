# 性能监控

性能监控页面位于 `GET /admin/performance`（模板 `app/templates/admin/performance.html`），展示运行中的服务表现：HTTP 吞吐/延迟、任务执行时间、队列深度和实时快照。报表来自 `app/performance.py`。

## 控件

| 控件 | 值 | 效果 |
| --- | --- | --- |
| Minutes | 5 … 60 | HTTP 分钟级图表的滑动窗口。 |
| Hours | 1 … 24 | 任务性能聚合的窗口。 |
| Trend | traffic / latency / failures / admission_queue / poll_queue / jobs | 显示哪个图表/表格重点（`PerformanceTrend`）。 |

更改控件自动提交。

## HTTP 性能

`build_http_performance_report(db, window_minutes=...)` 将请求事件聚合为每分钟桶。每分钟包括：

- 进入请求数、已处理数。
- 总平均和 p99 延迟（毫秒），拆分为**准入**（队列等待）和**处理**（工作执行）两段。
- 状态 4xx、429（限流）、5xx 计数。
- 准入队列平均深度、最大深度和最老排队请求年龄。

## 任务性能

`build_job_performance_report(db, window_hours=...)` 聚合设计任务时长和结果：

- 每分钟任务吞吐量和时长指标。
- 按规范化错误码统计的失败计数。
- 终态结果汇总（完成/失败和完成率）——也被仪表盘使用。

HTTP 和任务报表都缓存在进程内 `AdminReportCache` 中（按键为窗口设置）。

## 实时性能快照

`build_live_performance_report(...)` **不缓存**。它以 JSON 形式在 `GET /admin/performance/live` 提供，由页面渲染。报告：

- 进入 RPS、已处理 RPS、在途请求数。
- 准入等待数、HTTP p99、服务器错误率、限流率。
- 准入队列深度和事件循环延迟。
- 活跃任务数和数据库锁等待数。

### 活跃任务快照与运行时瓶颈

- `build_active_job_snapshot(...)` 列出当前正在运行的任务。
- `build_runtime_bottleneck_report(...)` 交叉引用慢任务、队列深度和锁等待，指出实际瓶颈（worker 池 vs. 提供商 vs. 数据库）。

## 刷新机制

- `GET /admin/performance/refresh` 执行**整页替换**——它用重新计算的报表（缓存刷新后）重建 HTML，浏览器替换文档。
- 实时快照（`/admin/performance/live`）按独立间隔轮询，使页面顶部的实时指标移动而不干扰历史图表。
- 由于缓存报表有 TTL，图表可能比实时快照延迟最多一个缓存窗口；使用 `/refresh` 强制重新计算。

## 如何使用

- **延迟趋势上升** → 检查准入队列深度：等待者堆积意味着 worker/准入池饱和（队列瓶颈），而非数据库问题。
- **5xx 攀升** → 与 [providers](/admin/providers) 和 [failed jobs](/admin/design-jobs?status=failed) 关联分析。
- **活跃任务变慢** → 运行时瓶颈区域和仪表盘告警告诉你应该检查任务还是扩容提供商。
