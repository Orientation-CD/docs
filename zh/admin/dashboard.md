# 概览仪表盘

`/admin` 汇总持久经营结果、当前账号构成与运维跟进事项，只读展示；修改需进入对应领域页面。

## 阅读各面板

摘要包含今日完成数、过去 24 小时终态任务完成率、30 日活跃用户与本月至今财务结果。各指标窗口不同，修改完成任务图的时间范围不会重定义全部摘要。

完成任务图支持 **7 或 30 天**，按 UTC 日分组，区分个人/企业付款任务。活动账号构成把当前非管理员客户归为个人、企业成员或企业所有者，与[营销数据](/zh/admin/marketing)中的生成活跃用户不是同一指标。

行动中心通过认证的 `/admin/overview/alerts` 刷新，每条告警链接到详细运营页面。需关注任务链接到[任务](/zh/admin/design-jobs)，干预前核对任务家族与执行代际。

## 跟进告警

| 现象 | 下一步 |
| --- | --- |
| 任务缓慢或失败 | 查看详情/诊断，再看[性能](/zh/admin/performance) |
| 商业或余额问题 | 核对[计费](/zh/admin/billing)、钱包账本与已结算消费 |
| 配置不可用 | 核对模型模态、节点选择与 Feature 开放状态 |
| 财务结果缺失 | 核对完整月度成本与时间范围 |

摘要不证明支付平台已结算或供应商实时健康。具体事件应依据持久订单/任务证据，见[可观测性](/zh/backend/observability)。

---

代码依据 · backend `b13cc566`: [app/admin/dashboard.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/dashboard.py) · [app/admin/overview.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/overview.py) · [app/templates/admin/dashboard.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/dashboard.html).
