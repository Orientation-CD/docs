# 视频：脚本生成与同款重制

`video_generation`是同一个Feature，使用本地`render_video` Operation。镜像内的私有jinqiu流水线执行耗时媒体/模型编排，本地执行器不走普通provider-model路由。两种视频模式都复用Job/Workflow、输入归档、钱包和结果发布机制。

## 三种请求路径，一个Operation

| 路径 | 请求主体 | 故事来源 | 附加约束 |
| --- | --- | --- | --- |
| 脚本 | `script`，无`prompts` | 冻结脚本 | 人物合成图恰好1，场景图0..12，录音0..1 |
| 系统同款 | 一个具名`prompts`选择，无`script` | 模板参考视频 | 活跃`purpose=same_style_video`，字段恰好`称呼`，场景图0..1，必选MP3录音>5秒 |
| 自定义同款 | `prompts`名称`__user_reference__`，上传`reference_video`，无`script` | 用户精确版本视频 | 相同字段/录音/场景限制；不查找/渲染模板，不创建script pin |

所有路径都要求恰好一张`character_image`/`primary` Image。上传参考片是已完成的Video Asset，最大100 MiB、15–120秒（含边界），port/role都为`reference_video`，不能重复Asset ID。结构模型最多14项输入，可能先于模式校验拒绝超大清单。UI要求可以比公共schema更窄，详见[联调状态](/zh/reference/integration-status)。

脚本最大20,000字符。当前txt方言使用独立`【场景N】`标题和结构化标签；仍支持的历史markdown方言集中在[兼容边界](/zh/reference/compatibility)。同时传script+prompts或script+reference clip是`VIDEO_SCRIPT_CONFLICT`，两种主体都不传是`VIDEO_SCRIPT_REQUIRED`。

## 模板选择与可选台词替换

小程序选择器读取`GET /v1/prompt-templates?purpose=same_style_video`；省略purpose只列通用模板。同款元数据包含展示名及短期参考片/封面URL，不暴露私有模板正文。播放能力过期应重新获取列表，预览不会创建Job或预留积分。

系统模板恰好定义`称呼`字段，无system/negative prompt，渲染脚本最多15,000字符，每场`【人物】`与称呼一致。称呼不能含空白或`、`、`,`、`，`。渲染文本经过校验并冻结，但重制流水线由参考片驱动，worker不传入另一份竞争脚本。自定义模式校验相同字段，但不写script输入。

可选顶层`replacements:[{"from":"旧台词","to":"新台词"}]`两端去空格后必须非空。`replace_scope`为`all`（默认）或`dialogue`，必须至少有一组替换。后端冻结并透传给镜头规划，不自己替换文本。默认all保持默认规范指纹，dialogue改变语义身份，不能修改替换内容后复用已接受动作key。

## 从接受Job到MP4

```mermaid
sequenceDiagram
  autonumber
  participant UI as 视频表单
  participant API as API/准入
  participant DB as PostgreSQL
  participant S as 版本化存储
  participant W as Submit worker
  participant P as 镜像内流水线
  UI->>API: 完成的Asset ID与script或prompts
  API->>S: 归档直接拥有的输入版本
  API->>DB: 冻结模式/pin/替换 预留 图/outbox
  W->>DB: 在代次围栏下claim渲染尝试
  W->>S: 下载冻结的精确版本
  W->>P: 脚本配置 或参考片remake配置
  P-->>W: 渲染产物与阶段证据
  W->>S: 核验并发布私有MP4
  W->>DB: 绑定不可变输出并只结算一次
  UI->>API: 轮询规范status URL
  API-->>UI: VIDEO类型输出与新签名URL
```

先读[`_build_render_request`](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/submissions/workflow_local_video_submission.py#L617)，再读[`build_config`](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/conversion/video_jinqiu_adapter.py#L237)。存在参考视频时进入`_remake_config`，script_path保持空；否则`_script_config`读取暂存脚本和映射。输出是核验后的`video/mp4` Asset，不是任意供应商URL。

## 模型、恢复与证据边界

启用 `VIDEO_MODEL_SELECTION_ENABLED` 后，计费目录列出每个模型可售分辨率及单价。关闭时有效组合固定为 `Doubao-Seedance-2.0-mini / 480p`。供应商能否执行所售组合需要用目标镜像验证。

渲染有有界租约、总时长/阶段预算、spool及上传限制，可以运行数小时。API健康不证明供应商容量。失败本地视频渲染为终态，不自动重新生成；人工付费重跑由支持流程决定，过时代次不能覆盖新代次。发布证据记录镜像内私有供应商版本，并区分模拟测试与仍待真实供应商/长时运行验证的边界。[产品全链路](/zh/reference/flows/workflow-products-flow#video-branch)提供错误码和代码导航。

## 费用预览与已接纳计费事实

当前视频表单先请求并确认 `POST /v1/video-billing/preview` 再提交。视频按所选模型与分辨率的持久化单价与模式规则计算费用，不能用单一 Feature 固定价代替。参考视频必须有 15–120 秒实测时长；剧本按秒模式使用 UTF-16 长度，按次模式使用配置的固定秒数。个人折扣只应用一次，并保留共享的 10 积分最低收费。

准入在预留前重新计算，费用/模型确认值变化返回 `VIDEO_PRICE_CHANGED`。成功后冻结 `video_time_v1` 的来源身份、模型、分辨率、配置和价格；已接纳重放及符合条件的显式重试沿用这些事实，即使实时配置已经改变。普通本地渲染失败仍为终态，不自动重新购买。见[视频费用全链路](/zh/reference/flows/video-billing-flow)，跟读源码、重新确认与回执未知重放的区别，以及记账示例。

画幅是独立的渲染选择。剧本及同款支持 `9:16`、`16:9`、`3:4`、`4:3`、`21:9`。worker 从接纳后的公开输入取得 `aspect_ratio`，缺省按 `9:16` 发送 `video_aspect_ratio`；`video_resolution` 来自 `video_time_v1` 商业快照。两种模式都在 renderer pipeline 配置使用这两个值，最终费用只随模型、分辨率、计费规则与来源变化。 [_build_render_request](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/submissions/workflow_local_video_submission.py#L617)

子进程在能够取得时报告已安装 `jinqiu_e2e` 的 `runtime_version`。缺失时保留未知，并结合镜像/私有源码证据排查；后端提交不能单独确定每次重建后的私有管线版本。源码：[runtime_version](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/conversion/video_jinqiu_adapter.py#L46)。

---

源码依据 · backend `f34b8a4d`: [app/core/models.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/core/models.py) · [app/workflows/video_template_rules.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/video_template_rules.py) · [app/workflows/workflow_admission.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/workflow_admission.py) · [app/workflows/submissions/workflow_local_video_submission.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/workflows/submissions/workflow_local_video_submission.py) · [app/conversion/video_jinqiu_adapter.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/f34b8a4d6307c83c6f7bbc905485a4f586d59a99/app/conversion/video_jinqiu_adapter.py).
