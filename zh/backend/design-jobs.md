# 图片生成 Workflow

图片设计与报告、文本、视频共用 [Workflow 生命周期](/zh/backend/workflows)。内部仍使用 `DesignJob` 持久任务模型和响应类型，这不表示新客户端应继续使用旧创建接口。

## 提交图片任务

从 `/v1/billing/features` 发现 Feature，再按所需角色进行[直传](/zh/backend/assets-storage)，每个角色使用独立 Asset。主图上传角色为 `image`，可选涂抹/蒙版及参考图分别为 `masked_image`、`reference_image`。Canonical Workflow 请求按图片 schema 显式声明端口与角色。不能直接把历史结果 Asset 当临时输入，应先调用其 `design-input-copies` 接口。

提示词选择沿用 `prompts.prompts[]` 的模板名称及精确字段 name/value 合同。服务端拒绝未知/缺失字段与多个 system prompt。最终 system/configurable/negative 段在准入时冻结；客户端不发送模型凭据或最终服务商请求。

图片完成时发布不可变应用 Asset，在有序 `outputs` 中返回签名 URL 及对应过期时间。URL 是临时访问能力，Asset UUID 才是持久引用。

## 模型选择

管理员声明模型输入/输出模态，再在 Workflow 节点选择兼容模型。模型声明与 adapter 能力的交集必须覆盖节点所需类型；蒙版与传输协议检查仍在相应执行边界生效。不再使用 Catalog 分配或人工 Operation 授权。参见[模型管理](/zh/admin/providers)与 [Workflow 配置](/zh/admin/workflows)。

## 兼容边界

实际适配入口及明确拒绝行为集中在[兼容参考](/zh/reference/compatibility)。新集成沿规范 Workflow 契约，现有 UI 跟读保留真实请求路径。

---

代码依据 · backend `e59716c8`: [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/api/__init__.py) · [app/core/models.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/models.py) · [app/providers/provider_configuration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/providers/provider_configuration.py).
