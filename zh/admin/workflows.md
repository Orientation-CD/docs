# 配置 Workflow 节点

`/admin/workflows` 展示产品关联的 Workflow 卡片及输入/节点/输出图，是执行配置页面，不是任意图编辑器。图结构、端口合同及 Operation 归代码管理。

## 修改模型

1. 展开 Workflow 的管理/详情区域。
2. 阅读不可用原因，打开可配置节点。
3. 选择兼容模型，并携带当前 generation 保存。
4. 核对刷新后的可用性及对应 [Feature/套餐权限](/zh/admin/billing)。

修改只影响该 Workflow 的这个节点。共享 Operation 可以复用，不再通过全局模型切换影响所有使用方。本地转换节点显示本地执行器，无需外部模型。历史独立 PPTX Workflow 不作为普通新产品卡展示。

模型候选、保存、导入与准入共用输入/输出模态交集规则。节点未配置、模型不可用/归档或模态声明不兼容会使 Workflow 不可用。到[模型服务商](/zh/admin/providers)修复模型配置，不存在需要补勾的 Operation 授权。

## 商业与历史行为

Feature 开放状态及订阅授权与节点选择独立。只有配置好的 Workflow、没有活动且获授权 Feature，不会自动变成客户产品。已接受任务保留冻结图和服务商快照，修改节点影响新准入，不改写运行任务。

旧 `/admin/operations` GET 仍是本页别名，全局 Operation 配置写入返回 `410 OPERATION_GLOBAL_SETTINGS_RETIRED`，应使用 Workflow 节点配置。报告、语音、文案、图片与本地视频都遵循此分离，见[后端 Workflows](/zh/backend/workflows)。

---

代码依据 · backend `b13cc566`: [app/admin/workflows.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/workflows.py) · [app/workflows/workflow_configuration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/workflow_configuration.py) · [app/templates/admin/workflow_views.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/templates/admin/workflow_views.html).
