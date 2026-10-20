# 财务与月度成本

`/admin/finance` 将已记录客户收入/退款与人工云服务、模型成本结合。所有金额输入为整数**分**，10,000 分等于 100 元。

## 录入成本

选择月份、`cloud` 或 `model_provider`、非负金额与可选备注。提交**相同月份及类别会替换该月总额**，不会新增一张发票。应先汇总目标发票再提交月总额，并通过备注/证据保留依据。

页面支持 1–36 个月范围（默认 12），以及经营概览、单位经济性、利润趋势；财务按 UTC 月边界聚合。营销中的月财务投影使用相同财务基础，而日级客户窗口使用北京时间。

## 解读结果

| 数值 | 含义 |
| --- | --- |
| 总收入 | 对应期间已确认客户收款 |
| 退款 | 已记录成功退款金额 |
| 净收入 | 总收入减退款 |
| 云/模型成本 | 显式录入的月成本 |
| 经营差额 | 净收入减完整记录成本 |

成本缺失是证据缺失，不等于零支出。必要类别不可用时不能宣称利润完整或比较利润率。内部 Token 消耗是另一运营单位，不是以分计的支付金额。

此页不审批退款，也不向服务商支付发票。支付补偿与异常展示在[计费](/zh/admin/billing)，客户转化/留存见[营销](/zh/admin/marketing)。

---

代码依据 · backend `b13cc566`: [app/admin/billing.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/billing.py) · [app/billing/finance.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/billing/finance.py) · [app/templates/admin/finance.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/finance.html).
