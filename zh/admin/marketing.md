# 营销数据

`/admin/marketing` 通过认证的 `/admin/marketing/data` 加载只读证据面板，汇总注册、生成、支付、转化、复购与留存，不修改活动、订单或用户状态。

## 窗口与口径

省略两个日期时默认最近 30 天（含今日）；显式日期必须成对使用 `YYYY-MM-DD`、顺序有效、不晚于今日，含首尾最多 366 天。今日数据尚未完整。读取响应的时区/覆盖元数据。日级营销窗口使用 **Asia/Shanghai**；月度财务区域使用独立完整 **UTC 月份**，不受日级日期筛选控制。

生成活跃用户指在规定窗口成功完成父/根任务的客户。1/7/30 日活跃窗口统计生成行为，不是登录 DAU/WAU/MAU。包含的子任务和输出图片不额外计为客户完成。历史首次成功和 cohort 留存各有自己的分母与观察窗口。

金额单位是分，Tokens、人数、任务数使用独立单位。总收入、退款和净收入应一起解读。转化/复购应使用相应合资格 cohort，不能随意相除不同时间窗口的总数。

## 可用性与刷新

来源窗口或财务成本缺失时以 unavailable/null 和覆盖说明展示，不能伪造为零。尚未成熟的留存单元保持未观测。图表保留空缺，导出/比较时也不能强制转成零。

页面分别处理加载、失败及只读安全刷新。传输/服务失败时应保留最后已知结果并显示不可用，不能展示为空的成功面板。会话过期需重新认证；修改奖励金额是独立[活动](/zh/admin/campaigns)操作。

详细指标定义、请求及错误以页末后端 **Internal administrator marketing contract** 为准。[财务](/zh/admin/finance)负责月成本录入，[概览](/zh/admin/dashboard)提供简短运营摘要。

---

代码依据 · backend `e59716c8`: [app/admin/marketing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/marketing.py) · [app/templates/admin/marketing.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/marketing.html) · [documents/REST_API_INTERFACE.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/REST_API_INTERFACE.md).
