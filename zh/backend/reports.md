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

## 追加文件的耐久性

直接自有的追加 PPTX 先归档，再随已接受 Job 和物理输入 pins 激活。后续转换不能依赖临时上传路径。已执行操作的输入 pins 不因归档或修复而重写。[输入归档](/zh/reference/flows/asset-upload-flow)与[定点恢复](/zh/deploy/production#input-recovery)解释该区别。整份报告仍须等待必要导出完成；归档成功既不是报告完成，也不是另一笔购买。

## 交接不转移来源权限

当前项目负责人或企业所有者可读取获授权的前任报告，但能读不等于可以把其 Asset 选作新报告输入。最终准入检查来源任务作者、目标空间和当前来源项目负责关系（`require_assignee_project`）；归属或负责关系变化会以输入／指派错误拒绝，不受理新报告。已受理报告／子任务执行使用有效任务项目检查，交接时保留原作者、输入 pin 和计费。

结果查看页在隐藏或权限变化时清除旧成员能力。PPTX 下载之后、调用原生打开之前，重新核对删除状态及成员／交接权限。见[报告查看](/zh/reference/flows/report-view-flow)和[项目交接](/zh/reference/flows/project-assignment-flow)。

---

代码依据 · backend `749e82df`: [app/workflows/operations/design_report/design_report_products.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/operations/design_report/design_report_products.py) · [app/workflows/operations/design_report/workflow_report_publication.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/operations/design_report/workflow_report_publication.py) · [documents/REST_API_INTERFACE.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/documents/REST_API_INTERFACE.md).
