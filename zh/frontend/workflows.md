# 功能、Workflow 与结果契约

前端同时支持规范 `/v1/workflows` 与兼容 `/v1/design-jobs` 请求。按具体产品选择 schema，不能将 `assets`、显式 `inputs`、提示词字段与报告 Blueprint 互换。

## 当前前端实际提交

| 产品 | UI 提交接口 | 重要内容 |
| --- | --- | --- |
| 标准图片 / 家居试搭 / 自定义设计 | `/v1/design-jobs` | `workspace_id`、`type`、`name`、`prompts`、验证过的 `assets`，按需附项目/客户资料 |
| 录音总结 | `/v1/design-jobs` | `type: voice_summary`、录音 `assets`，不要求图片提示词 |
| 视频 | `/v1/design-jobs` | `type: video_generation`、`script`、带 role/port 的 `inputs`，可选已声明模型 |
| 八项文案/问答 | `/v1/workflows` | 准确 `copywriting_*` type、模板及字段、`inputs: []` |
| 新设计报告 | `/v1/workflows` | `design_report_9/13/17`、JSON Blueprint、可选 PPTX 附件 |
| 历史 HTML 汇报 | 旧设计任务兼容 | `html_report`，不能作为新设计报告 schema |

后端还提供其它受支持 Workflow 的规范 schema。此表记录当前前端实际发送的内容，不等于全部公共 API。每次提交保留确认过的空间/项目与稳定 `Idempotency-Key`；`202` 仅表示受理。

## AI文案与问答

| 产品键 | 界面名称 | 分组 |
| --- | --- | --- |
| `copywriting_short_video` | 短视频脚本 | 创作 |
| `copywriting_xiaohongshu` | 小红书笔记 | 创作 |
| `copywriting_moments` | 朋友圈文案 | 创作 |
| `copywriting_titles` | 标题金句 | 创作 |
| `copywriting_shooting` | 拍摄建议 | 创作 |
| `copywriting_knowledge` | 装修知识 | 问答 |
| `copywriting_pitfalls` | 避坑指南 | 问答 |
| `copywriting_operations_experience` | 运营经验 | 问答 |

每项映射准确的 `feature_copywriting_*` 模板。控件定义随前端版本管理，认证模板元数据需声明预期的完整字段集合，每字段只发一次。UI可选空白发送字面量 `未提供`；必填文字 trim 后非空，当前文案字段上限为4000个 Unicode 字符。短视频父分类变化时重置依赖子类。

价格来自 Feature 发现；个人权益使用声明的 `allowed_features`，视觉分组不是权限通配符。不存在通用 `ai_copywriting` 请求类型，不上传媒体，不在浏览器调用模型供应商。拍摄建议产生文字，不产生视频素材。

完成结果即使没有可选文件元信息，也可读取 inline Markdown。结果页渲染安全 Markdown/HTML，提供适用复制动作，并将不支持的标记保留为可见文字。重试取决于服务端资格和当前写权限。

## 短视频脚本导入 AI视频

已完成短视频脚本可交给 AI视频创作。替换非空且不同的草稿剧本需确认，其它素材和设置保留。目标页仍须自行检查素材、权益并确认，导入文字不会自动提交或支付视频任务。

| 输入 | 当前小程序 UI | 公共后端 schema |
| --- | --- | --- |
| 角色三视图合成图 | 恰好1张 | 恰好1张 |
| 场景参考图 | **恰好1张** | **零到12张** |
| 剧本 | 最多1000字 | 最多20000字 |
| 录音 | 可选，最多1个 | 可选，最多1个 |

更严格的 UI 场景限制对应目前集成的供应商路径；API 接收更多输入不证明端到端已具备多场景处理能力。不能直接照搬 API 最大值放宽 UI。上传凭证 role（`image`、`reference_image`）与任务 role（`primary`、`reference`）须独立映射。

后端启用选型时，从目录读取视频模型与价格；否则使用基准 Doubao-Seedance-2.0-mini。静态前端模型清单仅用于校验/展示，不是定价依据。

## 新设计报告

表单选择 **8、12、16个内容页**，对应 **9、13、17总页数**，产品键为 `design_report_9`、`_13`、`_17`。Blueprint 使用项目/客户信息、已完成录音总结、彩平图原图/结果 Asset、不同空间的已完成室内方案。

来源 Asset 必须在当前作用域合法且可读。Blueprint 按页模板组织素材，可请求风格材质、灯光生成，并引用配置图库。当前每个室内效果页最多三张图片；更换报告规格可能要求重新选择来源。

可选附件只能是 `.pptx`，最多104857600字节（100 MiB），完成上传和验证后才可提交，不接受 PDF/PPT。恢复草稿后重新确认附件有效性，可更换或移除。HTML 查看使用新鲜授权地址。结果页也识别受支持的 PPTX 任务产物；公共导出能力与当前 UI 入口应分别说明。

## 失败与恢复

POST 响应不确定时保留输入与准确逻辑动作。认证、订阅、余额、模板变化、空间/项目失权分别用对应动作恢复；结果能力过期则刷新。不能静默创建替代任务、切换支付空间或仅按原生回调认定完成。

周边行为见[关键流程](/zh/frontend/key-flows)、[项目](/zh/frontend/projects)、[API参考](/zh/reference/rest-api)。

## 源码依据

前端 `eca0a5f`、后端 `b13cc56`（2026-10-20）：[实际路由选择](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/repositories/designJobSubmit.ts) · [文案控件](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/copywriting.ts) · [报告Blueprint](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/reportBlueprint.ts) · [UI视频校验](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/repositories/videoAssets.ts) · [公共视频schema](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py)。
