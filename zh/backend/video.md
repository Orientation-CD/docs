# 视频生成

`video_generation` Workflow 使用本地 `render_video` Operation，后端打包私有 jinqiu pipeline。结果为标准 Workflow 带类型输出中的 MP4；本地执行器不走普通 provider model 路由。

## 输入

| 端口 | 要求 |
| --- | --- |
| `script` | scalar 脚本，最多 20,000 字符 |
| `character_image` | 一张主角图，角色 `primary` |
| `scene_images` | 0–12 张场景图，角色 `reference` |
| `recording` | 可选单个录音 Asset，角色 `recording` |

先上传并完成 Asset，再按 [REST API](/zh/reference/rest-api)规定的脚本字段及精确端口/角色结构提交。服务端核验内容、所有权与冻结身份，不接受任意存储 key 或临时服务商 URL。

## 模型与计费

后端 `VIDEO_MODEL_SELECTION_ENABLED` 控制发现接口是否返回完整支持的视频模型。关闭时本地/测试默认 `Doubao-Seedance-2.0-mini`。客户端发现当前选项与价格，不复制模型价格表。我方 Token 定价与服务商真实积分消耗独立。

提交、轮询、历史、显式重试、移动及删除使用 [canonical Workflows](/zh/backend/workflows)。显式工作空间付款，预留及最终结算/释放使用普通账本机制。

## 执行与运维

视频包含较长的解析、生成、导出阶段，具有 render lease、产物大小、spool 空间及上传截止时间限制。`video_render_budget_seconds` 根据场景数与阶段预算计算有界执行时间。使用返回的进度估计与轮询提示，API 健康不表示供应方有足够容量。

提交 worker 执行本地视频任务，补偿与预留清理恢复符合条件的失败。迟到/旧代际不能覆盖当前结果。外部付费行为是否成功不明确时，必须服从持久重试分类，不能无条件自动重渲染。

镜像构建要求私有 supplier Git 访问。Supplier 打包进应用镜像，重建可能跟随其默认分支，因此发布证据需记录实际构建版本。参见[本地环境](/zh/deploy/local-stack)、[配置](/zh/reference/configuration)与[可观测性](/zh/backend/observability)。

---

代码依据 · backend `b13cc566`: [app/workflows/operations/video/workflow_video_definition.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/video/workflow_video_definition.py) · [app/workflows/operations/video/workflow_video_execution.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/video/workflow_video_execution.py) · [scripts/runbook.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/runbook.md).
