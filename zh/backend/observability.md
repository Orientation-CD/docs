# 只读观察系统

三种证据回答不同问题：有界聚合历史寻找规律，当前压力显示实时环境，单个Job诊断把某次执行对应到源码。它们都不意味着可以重复一次付费结果不确定的调用。

## 信号与保留

| 界面 | 证据 | 边界 |
| --- | --- | --- |
| HTTP/stage/Job/Operation/provider历史 | 同群组均值、累计耗时和尾延迟估计 | Redis分钟桶48小时、日桶14天；序列与producer覆盖有界 |
| 唯一终态总量 | 完成/失败Job吞吐 | 按Job ID去重、删除后可用索引保留25小时；代次样本不等于Job数 |
| 实时压力 | 接收/处理RPS、in-flight/准入等待、队列深度/年龄、loop lag、DB锁和事务压力 | 仅已观察进程/环境，缺失不是零 |
| Job诊断/分块 | Workflow/Operation/Submission/代次及安全阶段证据 | 私有管理员认证访问，保留有限分块；缺失/删除应明确不可用 |

历史比较完整UTC24小时或完整七个UTC自然日与紧邻的等长前窗。当前未完成分钟/日是临时桶，不用于变化计算。p95至少20个样本，p99至少100个；桶范围是估计，溢出桶不能伪造有限上界。不完整、缺失、重置、不兼容或达到容量限制的数据可以保留观测值，但不显示改善方向。用 `APP_VERSION` 标识发布提交。

## 指标语义

HTTP total包含准入/handler阶段，Operation execution不包含依赖等待。enqueue/due→worker等待与依赖等待单列。供应商相关耗时包含网络和实际观测到的轮询延迟，不是纯推理时间，也不证明供应商已接受。累计观测时间不是CPU用量或可节省时长，不能把重叠阶段或百分位相加。

快速失败不证明成功工作变快。比较时对齐route、workflow、configuration、build、执行种类和outcome。部署成员总量未知时，只披露已观察范围，不能声称覆盖全部副本。

## 追踪一次请求

`request_stages.py::request_stage`记录成对平台阶段。准入或读取时将`request_id`与Job关联；worker再关联Workflow run、Operation、Submission、invocation和generation。`performance stage=... event=start|end|failure elapsed_ms=...`复用安全日志处理器，不需要新开关/采样profile。没有end的start仅表示最后观察位置，不证明外部操作未执行。

高频耗时先在进程内聚合，后台刷出紧凑、可安全重放的批次，不逐请求写Redis/SQL遥测。`execution_performance.py::observe_on_commit`只发布已提交的终态，回滚转换不能生成成功样本。payload、提示词、签名URL、凭据及个人信息不进入指标标签/日志。

## 运维阅读顺序

1. 打开[性能页](/zh/admin/performance)，选定指标与outcome，查看优先排查项及群组/覆盖警告。
2. 查看实时队列年龄、DB压力和进程CPU/内存；基础设施监控仍需同时使用。
3. 打开匹配的最近Job，将阶段证据对应到[跨进程追踪指南](/zh/reference/flows/runtime-debugging)。
4. 恢复前先读持久化retry disposition。付费接受状态`UNKNOWN`需要协调，不能自动重新生成。

Liveness只证明本进程响应，readiness只证明有界DB/Redis连接；两者都不证明worker、供应商余额、存储发布或AI输出有效。授权恢复操作见[部署恢复](/zh/deploy/production)。

---

源码依据 · backend `e59716c8`: [app/core/request_stages.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/request_stages.py) · [app/core/execution_performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/execution_performance.py) · [app/core/performance_history.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/performance_history.py) · [app/core/performance_reports.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/performance_reports.py) · [app/core/terminal_performance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/terminal_performance.py) · [app/core/workflow_diagnostics.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/workflow_diagnostics.py).
