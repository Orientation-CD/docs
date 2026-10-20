# 性能面板

`/admin/performance` 区分 HTTP 压力、持久任务健康与队列/执行阶段，使用普通管理员会话认证，不是公开指标接口。

## 选择视图

页面分别保留任务健康小时窗口、趋势类型与滚动分钟窗口。趋势包括流量、延迟、失败、准入队列、补偿队列与任务阶段。历史报告可能使用短期后台缓存，实时压力单独采集。

| 信号 | 用于区分 |
| --- | --- |
| 进入与处理流量 | 需求和准入/处理能力 |
| 总耗时、准入等待、handler 耗时 | handler 前排队与应用执行 |
| p99 估计 / event-loop lag | 尾部压力，不只看平均值 |
| 4xx、5xx、服务商/结果/中断失败 | 预期拒绝与基础设施/执行故障 |
| 队列深度与最旧年龄 | 积压数量与等待时间 |
| 提交/收尾阶段 | 服务商派发与结果验证/存储 |

认证的 `/admin/performance/refresh` 返回报告 HTML，`/admin/performance/live` 返回有界实时 JSON。样本缺失或采集不可用不代表零流量。百分位是有界聚合，不是无限请求跟踪库。

## 定位瓶颈

先定位慢阶段及具体任务/request ID，再通过[任务](/zh/admin/design-jobs)诊断核查对应代际、数据库长事务与外部存储/模型证据。加大服务商超时不能解决准入饱和。

本页不重启 worker、不改变生产容量，也不授权重放结果未知的付费请求。这些行为遵循[部署](/zh/deploy/sae-deployment)与持久重试合同。健康检查局限见[可观测性](/zh/backend/observability)。

---

代码依据 · backend `b13cc566`: [app/admin/performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/performance.py) · [app/core/performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/performance.py) · [app/templates/admin/performance.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/performance.html).
