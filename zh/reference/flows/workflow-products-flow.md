# 各产品请求与模型执行分支

共享生命周期解释持久化与结算。本章回答下一步读源码的问题：选择 `type` 后，到底使用哪些输入、供应商分支和输出类型？共用提交接口，不表示产品可以相互替代。

## 已交付前端真正选择的路由 {#frontend-routing}

| 页面 / 操作 | 准备函数与 HTTP 路径 | 后端分支 | 产物 |
| --- | --- | --- | --- |
| 图片/自定义设计表单提交 | `submitDesignJob` → `postPrepared` → `/v1/design-jobs`，旧式有序 `assets` | 兼容适配器规范化图片角色，再进图片 Workflow | Image Asset |
| 语音总结提交录音 | 同一兼容路径，传有序录音 `assets` | 转为语音类型准入，执行共享 summary operation | Markdown + Document Asset |
| 八项文案表单生成 | `prepareCopywriting` → 同一 repository，但 `isCopywritingFeature` 选 `/v1/workflows` | 当前纯文本请求，共享 summary operation | Markdown + Document Asset |
| 视频表单生成 | `submitVideoGeneration` → 类型化 `inputs`、`script`、可选模型 → `/v1/design-jobs` | 视频准入、本地视频 Submission | MP4 Asset |
| 设计报告表单提交 | `prepareProjectWorkflow` / `postWorkflow` → `workflowsRepository.submit` → `/v1/workflows` | Blueprint 报告图、包含的 child、本地导出 | HTML 预览 + PPTX |

打开 [src/pkg-features/repositories/designJobSubmit.ts → postPrepared](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/repositories/designJobSubmit.ts#L128) 看真实路径条件。新 API 客户端可经 `/v1/workflows` 提交受支持的图片/语音/视频类型请求；修改现有表单路径必须同时符合 body/mapper 契约，不能只在文档里替换 URL。旧前端 helper 还看得到 `html_report` 分支，不代表服务端继续接受那个已退休请求。

## 图片和自定义设计 {#image-branch}

[app/core/models.py → ImageWorkflowDesignJobCreate](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py#L658) 要求 1–3 个带角色输入：一个 `primary`，最多各一个 `mask`、`reference`；真实库存还受 Feature/图约束。上传时已冻结的角色必须与这些语义角色一致。自定义设计是图片分支，不授予任意 URL 或自定义供应商 endpoint 的权限。

```mermaid
sequenceDiagram
  autonumber
  participant UI as 图片表单 / 上传 repository
  participant A as 准入
  participant W as 图片执行
  participant P as 冻结图片供应商
  participant O as 存储
  participant DB as PostgreSQL
  UI->>A: 准备的 assets/prompts 与动作 key
  A->>DB: 冻结角色、合成 prompt、节点模型、预留
  W->>DB: claim 当前 Submission 和冻结输入
  W->>P: 带不可变签名图片的 ProviderRequest
  P-->>W: 类型化图片结果或可轮询任务 ID
  W->>O: 暂存核验图片，复制精确发布版本
  W->>DB: 绑定 Image Asset 并完成 child
```

| 消息 | 源码与证据 |
| --- | --- |
| 1–2 | [准入](/zh/reference/flows/design-job-lifecycle#submit-workflow)：先规范化当前/受支持旧请求，后调供应商 |
| 3–5 | [app/workflows/operations/image/workflow_image_execution.py → dispatch_image_workflow_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/image/workflow_image_execution.py#L1525) → [app/workflows/operations/image/workflow_image_execution.py → build_image_provider_request](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/image/workflow_image_execution.py#L214)：加载冻结 pin，构建指令/图片输入，校验适配器能力 |
| 6–7 | [app/workflows/operations/image/workflow_image_execution.py → _publish](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/image/workflow_image_execution.py#L1202)：再次核对 publication intent、租约、精确版本/哈希、代次和权限，才能关联 |

供应商临时 URL 是运输证据，不是永久结果。执行器落地、校验、暂存，再发布到自己存储的授权 Asset。HTTP 成功但没有正确输出，不能把 Job 标 completed。GPT image、Seedream 等适配器各自实现传输协议；引擎消费类型化图片结果，不把不同供应商响应格式直接暴露给小程序。

## 有序音频如何变成持久 Markdown {#voice-branch}

[app/core/models.py → VoiceWorkflowDesignJobCreate](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py#L702) 接收 **1–3 个不同录音**，端口/角色为 `port: "recordings", role: "recording"`，输入顺序有意义。当前前端兼容 `assets` 列表按该顺序规范化。浏览器接力只准备录音，[受限会话](/zh/reference/flows/voice-upload-flow)本身不创建收费总结。

1. 准入核验 owner、ready 状态、对象 pin，冻结总结指令。
2. [app/workflows/submissions/workflow_provider_submission.py → dispatch_workflow_provider_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/submissions/workflow_provider_submission.py#L768) 选冻结适配器，[app/workflows/operations/summary/summary_execution.py → build_summary_provider_request](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/summary/summary_execution.py#L19) 构建有序 `AudioInput` 并要求 Markdown。供应商能力必须真的支持音频，纯文本适配器不能替代。
3. 同一 attempt 下核验/恢复完成文本，[app/workflows/operations/markdown_output_assets.py → materialize_markdown_output](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/markdown_output_assets.py#L407) 创建带 hash、持久 Asset ID 的私有版本化 Document 输出。
4. 协调器/finalizer 把输出绑定公开 Job 并结算；根语音任务完成可推进 Project 到已采集需求。
5. Markdown 结果页读类型输出内容与身份。内联字符串方便展示，但不能替代报告复用时需要的 Document。

当前类型请求长这样（两个 UUID 都要换成实际可访问响应 ID）：

```json
{
  "workspace_id": "22222222-2222-2222-2222-222222222222",
  "type": "voice_summary",
  "name": "本地需求沟通总结",
  "inputs": [
    {"kind":"asset","port":"recordings","role":"recording","asset_id":"00000000-0000-0000-0000-000000000001"}
  ]
}
```

`workspace_id` 是计费/权限上下文；`asset_id` 是已完成的音频上传，不是文件路径。省略 `project_id` 使用后端按调用者解析的 scratch Project。本例用于 `/v1/workflows`；兼容 UI 的 body 使用 `assets` 而非 `inputs`。

## 八项文案共用文本引擎 {#copywriting-branch}

| Feature key | 用户用途 |
| --- | --- |
| `copywriting_short_video` | 短视频脚本 |
| `copywriting_xiaohongshu` | 小红书文案 |
| `copywriting_moments` | 朋友圈文案 |
| `copywriting_titles` | 标题建议 |
| `copywriting_shooting` | 拍摄指导 |
| `copywriting_knowledge` | 知识科普 |
| `copywriting_pitfalls` | 避坑内容 |
| `copywriting_operations_experience` | 运营经验 |

从表单 `submit` 跟进 [src/pkg-features/services/copywritingSubmit.ts → prepareCopywriting](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/copywritingSubmit.ts#L13)：校验对应 Feature 的字段，加载 profile/catalog/templates，核对上下文/权益，规范化字段，开关启用时绑定 Project，创建持久逻辑动作 key。`inputs` 是空数组，用户文本在具名提示词字段里，不应伪造 Asset 输入。模板名/字段名都是配置契约。

[app/core/models.py → CopywritingWorkflowDesignJobCreate](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py#L740) 拒绝非空 `inputs`。准入合成可配置 prompt，并经 [app/workflows/operations/summary/copywriting_kb.py → read_copywriting_kb](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/summary/copywriting_kb.py#L23) 读取空间/Feature 知识资料，冻结相关知识文本/配置，避免后续对象/配置变化悄悄改写本次执行。知识对象错误会在发模型前得到 `COPYWRITING_KB_INVALID`。

同一 summary operation 构建纯文本 `ProviderRequest`：可配置 prompt/知识变成类型化 `TextInput`，system/negative 指令单独保留，再校验 Markdown、落地与语音相同的持久 Document。复用 operation 不代表八个 Feature 共用开放状态、价格、模板或知识配置。沿准确 Feature key 搜索前端目录、提示词选择与后端准入，就能看到这些差异。

## 视频使用有界本地编排进程 {#video-branch}

[src/pkg-features/services/videoGenerationSubmit.ts → submitVideoGeneration](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/videoGenerationSubmit.ts#L45) 核对 profile/catalog/权益，准备角色图、场景图、可选录音和剧本。[app/core/models.py → VideoWorkflowDesignJobCreate](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py#L789) 接受恰好一个角色图、0–12 张不同场景图、最多一段录音、最多 20,000 字符且非空白的剧本。已交付表单要求一张场景图、剧本最多 1,000 字符；安装的供应商依赖能力还可能更窄，这是三个不同限制层。

```mermaid
sequenceDiagram
  autonumber
  participant UI as 视频表单
  participant API as 视频准入
  participant W as Submit worker
  participant C as render 子进程 / jinqiuai
  participant O as 自有对象存储
  participant DB as PostgreSQL
  UI->>API: 输入、剧本、可选已知模型和 key
  API->>DB: 冻结 pin/model/script，创建 local Submission
  W->>DB: claim 代次与 render 权限
  W->>C: 下载冻结输入，写有界请求，只 render 一次
  C-->>W: 已核验结果 locator
  W->>DB: 暂存 locator 与结果证据
  W->>O: 有界下载 MP4，计算 hash，上传自有版本
  W->>DB: 核验绑定 Video 输出，协调父任务
```

| 消息 | 具体代码 |
| --- | --- |
| 1 | [src/pkg-features/services/videoGenerationSubmit.ts → submitVideoGeneration](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/videoGenerationSubmit.ts#L45) |
| 2 | [准入](/zh/reference/flows/design-job-lifecycle)的 `admit_workflow_job` / `_resolve_video_inputs` |
| 3 | [app/worker.py → execute_video_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/worker.py#L353) → [app/workflows/submissions/workflow_local_video_submission.py → execute_local_video_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/submissions/workflow_local_video_submission.py#L881) |
| 4–5 | [app/conversion/video_subprocess.py → SubprocessVideoClient](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/conversion/video_subprocess.py#L85) → [app/conversion/video_jinqiu_adapter.py → main](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/conversion/video_jinqiu_adapter.py#L121) |
| 6–8 | [app/workflows/submissions/workflow_local_video_submission.py → execute_local_video_submission](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/submissions/workflow_local_video_submission.py#L881) → [app/workflows/submissions/workflow_local_video_submission.py → attach_verified_video_output](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/submissions/workflow_local_video_submission.py#L721) |

“本地”表示 worker 拥有编排子进程，第三方流水线仍可能调用收费远端服务。子进程只拿最少环境和必需凭据，不拿 DB/存储权限；worker 拥有 pin 和最终发布。render 超时意味着结果不确定，不会自动再渲染；恢复已有暂存下载/上传，与再次购买 render 是两件事。供应商下载 URL 不直接作为永久 Job 输出返回。

可选 model 只有服务端启用模型选择时才被采用，否则使用规定基线。只改 UI/API 不会给私有依赖增加能力。源码/包准备和 Linux 运行时检查仍属于[部署](/zh/deploy/local-stack)。

## 报告组合这些分支 {#report-branch}

报告 Blueprint 可引用已核验图片/总结、冻结图库对象，或包含新生成设计，其图再合成 HTML 并导出 PPTX。不能传 HTML 字符串或旧 `report_items` 就当作当前契约。沿[报告合成与浏览](/zh/reference/flows/report-view-flow)学习父子依赖、页计划、清理、转换和签名访问。当前直接提交 `design_report_pptx` 被拒绝为 `WORKFLOW_UNAVAILABLE`；活动报告流水线的 HTML/PPTX 双输出才是受支持主路径。

## 比较两个产品的源码练习 {#exercise}

选语音和文案，从表单处理函数找出不同 body 和共用 summary operation。在 `operation_run_inputs` 中分辨有序音频 pin、文本指令/知识，找出共用 Document 落地，解释报告后续为何能复用。再对比视频，找出 OS 进程边界，以及恢复下载与重新发起供应商执行的分界。用本地模拟供应商即可，读源码无需付费调用。
