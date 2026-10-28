# 性能排查

`/admin/performance`是需管理员认证的运维界面，组合优先排查项、按outcome分离的历史耗时、当前运行压力和有界近期Job证据。它不是永久审计库，也不授予重试、重启worker或调整容量的权限。

## 先提出一个可测量问题

选择历史family/measurement，再选完整UTC24小时或7天，与前一个等长窗口比较。当前不完整分钟/日是临时数据，可展示但不参与变化计算。判断变化前按route/workflow/configuration/build/execution/outcome过滤。

| 指标 | 回答什么 | 不表示什么 |
| --- | --- | --- |
| HTTP total/admission/handler | 用户可见HTTP时间积累在哪 | AI生成耗时或CPU占用 |
| Job generation/total age | 某代执行耗时与生命周期 | 唯一完成Job数量 |
| Operation execution/dependency/enqueue wait | 执行、等依赖、等投递的区别 | 三个可相加的百分位 |
| 供应商相关耗时 | 从请求到观测结果，含网络/轮询延迟 | 纯推理或供应商已确认接受 |
| 平台stage | 正确配对的具名边界start/end | 未配对start必已完成或必未执行 |

在所选指标内按累计观测时间或p95/p99估计排序。累计时间不是可节省时长，不能把并行/重叠阶段和百分位相加。失败更快不证明成功响应变快。展开候选查看数量、均值、桶范围、前窗和同群组详情；HTTP阶段详情只在展开时加载。

## 看改善箭头前先看覆盖

| 提示 | 阅读规则 |
| --- | --- |
| p95/p99 | 至少20/100样本，估计表示桶范围 |
| 溢出桶 | 不能伪造有限上界 |
| 缺失/未测量 | 不能填零 |
| 不完整/重置/不兼容/达到容量限制 | 保留可用值，抑制改善方向 |
| 部署成员总量未知 | 仅披露观测到的producer，不能保证全部副本 |
| build标签 | `APP_VERSION`设置为发布版本/提交 |

历史在Redis保留有界分钟桶48小时、日桶14天，后台批次可安全重放。Redis丢失影响近期运维历史，不改变SQL中的账务/业务事实。终态总量独立使用默认滚动24小时，按Job ID去重，删除后可用索引保留25小时。不完整总量只是最后记录结果，可能陈旧，不能证明失败率；完成和失败吞吐分开看。

## 用证据选择下一步边界

实时压力显示接收/处理RPS、in-flight/准入等待数、admission/poll队列深度和最老年龄、观测到的最大loop lag、PostgreSQL锁等待及最长事务。还应结合基础设施CPU/内存/重启、连接数和存储错误。

近期证据最多列出10个匹配的最老活跃/近期Job，它们是排查入口，不是某个直方图样本的精确代表。已删Job、缺失/截断诊断块应明确不可用。沿request/Job/workflow/operation/invocation/generation进入[跨进程追踪](/zh/reference/flows/runtime-debugging)。没有stage end是线索，不证明付费供应商请求没有执行。

## 刷新与实现地图

详情60秒刷新，实时压力/活跃Job10秒刷新，隐藏标签页暂停，并保留筛选、展开状态和图表滚动。`/admin/performance/refresh`返回认证报表HTML，`/admin/performance/live`返回有界压力JSON。不支持的历史选择返回422 `PERFORMANCE_HISTORY_SELECTION_INVALID`。

| 源码 | 职责 |
| --- | --- |
| `app/admin/performance.py::_performance_page_context` | 按选择缓存有界历史、健康和匹配证据 |
| `app/core/performance_reports.py::build_history_performance_report` | 完整等长窗口及可比规则 |
| `app/core/performance_history.py::PerformanceHistory` | 有界进程聚合与可重放Redis批次 |
| `app/core/execution_performance.py::observe_on_commit` | 发布已提交的Operation/Job终态 |
| `app/core/request_stages.py::request_stage` | 成对请求阶段观测与安全关联 |

导出/解读前先读[观测语义](/zh/backend/observability)。任何付费恢复操作前先核对持久化重试分类。

---

源码依据 · backend `e59716c8`: [app/admin/performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/performance.py) · [app/core/performance_history.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/performance_history.py) · [app/core/performance_reports.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/performance_reports.py) · [app/templates/admin/performance.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/performance.html).
