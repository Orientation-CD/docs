# 可观测性与恢复

健康检查判断是否适合接流量，Studio Control 展示总体压力，Workflow diagnostics 解释一次具体执行；三者回答的问题不同。

## 健康与 HTTP 证据

`/health/live` 仅证明 HTTP 进程存活。`/health/ready` 检查 Redis 与 PostgreSQL，失败返回 `503 DEPENDENCY_UNAVAILABLE`，不校验模型凭据、对象存储验收或支付结算。

HTTP 保护层传递 request ID、限制并发/请求体、采样 trace，并按已注册路由模板聚合指标。应用错误使用 `detail.code`、`message` 与可选元数据；请求结构 422 使用验证数组。敏感请求体和凭据不应粘贴到诊断报告。

## 性能

[/admin/performance](/zh/admin/performance)区分进入/处理流量、准入等待、handler 耗时、有界延迟估计、失败、队列深度/年龄与任务阶段。提供认证的 HTML 刷新和实时 JSON 接口；应用没有公开 Prometheus `/metrics` 合同。

历史报告可能短暂缓存，实时压力独立采集。要区分数据缺失/不可用和零负载。慢响应可能来自准入竞争、数据库压力、服务商或收尾，应先定位阶段，不能一律加大超时。

## 单任务诊断

后台任务详情链接到 diagnostics、持久化片段及授权下载。排查重试时对应 Workflow/Operation/Submission 身份及尝试代际。服务商错误区分确定未发送、明确拒绝及接收情况未知，并关联不同重放策略。付费结果未知不代表可以自动重发。

worker 补偿持久化 Operation/Submission、支付证据、删除声明及临时存储。补偿机制不授予手工改库或删除保留对象版本的权限。

## 活跃度可信状态与部署恢复

`PROJECT_ACTIVITY_STATE_UNAVAILABLE` 表示权威活跃度状态需要运维核对，不表示无人操作。项目活跃度迁移与 trust epoch 恢复需按当前部署 runbook 的保护式全角色停机流程执行，不能清空/初始化可信状态或降级持久数据库来压制错误。

参见[后台性能](/zh/admin/performance)、[任务](/zh/admin/design-jobs)、[部署](/zh/deploy/sae-deployment)与[配置](/zh/reference/configuration)。报告事件时保留首个失败证据、实际版本及具体受影响任务 ID。

---

代码依据 · backend `b13cc566`: [app/core/http_safety.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/http_safety.py) · [app/core/performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/performance.py) · [app/admin/workflow_diagnostics.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/workflow_diagnostics.py) · [deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md).
