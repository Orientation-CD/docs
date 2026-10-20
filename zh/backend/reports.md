# 设计报告与可编辑 PowerPoint

当前报告产品为 `design_report_9`、`design_report_13`、`design_report_17`，共用 `design_report` Workflow：先生成报告，再转换为可编辑演示文稿。实时价格与可用性从 `/v1/billing/features` 获取；初始 seed 价格不能作为客户端固定价格表。

## Blueprint 输入

客户端以选定 Feature 和严格 Blueprint 提交 `/v1/workflows`。Feature 确定准确总页数与允许的页面模板集合。`cover` 固定第一，`closing` 固定最后，中间页面可在该产品合同范围内调整顺序。

输入把已核验 Asset 绑定到语义别名：客户需求总结 Document（`customer_insight.md`）、原始/彩色平面图及室内图片。封面重复一份完整室内图绑定。每页最多三个 Asset，没有另一个报告全局图片数量上限；MIME、字节/像素预算及严格别名/模板矩阵仍然生效。完整例子见 [REST API](/zh/reference/rest-api)，不能继续用旧 report-item 配置拼装。

普通[项目](/zh/backend/projects)可预填可编辑的客户、项目及面积。这只是本次报告输入快照，编辑不会修改项目。省略 `project_id` 时任务进入临时项目。

## 结果与发布

Workflow 输出 HTML 预览和可编辑 PPTX。HTML 与图片引用经过校验，发布时保留输入精确版本。必须完成的导出成功后报告才完成；中间子任务成功不等于另一个完整客户产物，也不另行购买。

预览/下载 URL 携带短期签名能力。报告与演示文稿接口校验 token 及固定的发布身份；URL 到期后重新读取本人任务取得新地址。不能把这些 URL 记录或保存为永久公开分享链接。HTML 使用受限渲染与安全策略，PPTX 下载返回附件。

## 可选追加客户 PowerPoint

客户 PPTX 通过普通私有上传流程提交：`DOCUMENT`、`DESIGN_JOB_INPUT`、角色 `attachment`，上限 100 MiB。报告通过规定的 append 输入接收它，转换期间保留其精确版本。本地导出有明确资源预算，输入/产物清理遵循 Workflow 生命周期。

## 配置与迁移

报告节点模型在 [Workflows](/zh/admin/workflows)管理，可编辑生成模板在[提示词](/zh/admin/prompts)管理，功能价格/权限在[计费](/zh/admin/billing)管理。工作空间/default Logo 与私有 gallery 有独立存储规则，见部署 runbook。

旧 `html_report`、`/v1/report-items`、报价拼装、报告 section 配置及 `/admin/report-templates` 编辑器已退役。兼容历史产物仍可读取，新任务使用 Blueprint 产品。参见[兼容说明](/zh/backend/design-jobs)与[部署](/zh/deploy/sae-deployment)。

---

代码依据 · backend `b13cc566`: [app/workflows/operations/design_report/design_report_products.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/design_report/design_report_products.py) · [app/workflows/operations/design_report/workflow_report_publication.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/design_report/workflow_report_publication.py) · [documents/REST_API_INTERFACE.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/REST_API_INTERFACE.md).
