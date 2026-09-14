# 关键用户流程

本页从小程序的视角走查**主要用户旅程**：每一步用户看到什么、前端做了什么。对应的后端调用链见
[参考 → 端到端调用链](/reference/rest-api)。

## 0. 应用启动

1. **广告启动页**（`pages/ad-splash/index`）——5 秒，可跳过。展示 CDN 对象
   `ads/beta-recruitment-splash.png` 或内置占位图
   （`static/images/ads/splash-placeholder.svg`）。
2. **品牌启动页**（`pages/splash/index`）——3 秒。
3. **首页**（`pages/home/index`）——主 tab。展示首页广告 banner（点击 → 经过注册门槛后 `openStore`）、自动轮播的功能 `HeroCarousel`，以及一个 `FeatureGrid`。

游客可以浏览一切，此时还不需要登录。

## 1. 首页的积分预检（#224、#226）

当用户点击某个功能卡片时，`pages/home/index.vue` 并不会直接跳转。它会调用
`src/services/homeEntryGuard.ts` 中的
`inspectHomeEntry(catalog.features[id].jobType.token_cost)`：

- 在 mock 模式下，它询问任务仓库当前有多少在途任务。
- 在 API 模式下，如果没有 access 令牌，就以游客身份短路放行。
  否则它会列出 `status=pending` 与 `status=running` 的任务（第 1 页），并在提供了积分成本时并行拉取当前个人资料，运行
  `personalCatalogTokenShortage(profile, cost)`。

在跳转前可能触发两道护栏：

- **积分不足**——弹窗显示
  "当前剩余 X Token，使用 `<feature>` 需要 Y Token"，并带一个**立即充值**按钮，打开
  `/pkg-account/pages/store/index`。
- **在途任务上限**——`ACTIVE_JOB_LIMIT = 5`。如果已经有 5 个任务在途，用户会被送去
  `/pages/plans/index`。准入仍然在提交时原子地强制执行；预检只是更友好的 UX。

从首页启动**语音**功能时，也会运行同样的预检。

## 2. 登录 / 注册（在提交时设门槛）

登录是一个**共享注册面板**（`pkg-account/pages/login/index.vue`），由
`src/services/accountGate.ts` 驱动。它由
`requestWechatRegistration()` / `ensureRegisteredForAction()` 触发：

- **老用户**：`wechatSessionRepository.silentLogin()` 用已存储的令牌尝试静默登录。如果后端返回 `428 PHONE_AUTH_REQUIRED`，流程切换到手机号授权；`409
  LEGAL_ACCEPTANCE_REQUIRED` 则加载当前法务文档。
- **新用户**：面板展示所需法务文档
  （`GET /v1/legal-documents/current?locale=zh-CN`），要求同意，并以
  `code + phone_code + accepted_document_ids` 调用
  `wechatSessionRepository.register(phoneCode, documents)`。
- 后端返回令牌对；`sessionTokenStore.applyTokenPair` 持久化它，被中断的动作继续执行。

## 3. 标准设计流程（室内 / 局部 / 厨房 / 卫生间 / 彩平图）

1. 用户点击功能卡片 → `pkg-features/pages/<feature>/index`。
2. 页面使用 `StandardFeaturePage.vue` 加上 `OptionGrid.vue` /
   `ImageOptionGrid.vue`，逐步引导选择空间/风格/材质。提示词目录来自
   `pkg-features/repositories/promptCatalog.ts`。
3. 用户通过 `UploadStep.vue` 上传照片；`imageFileMetadata.ts`
   检查本地文件。
4. 点击**提交**时（`standardDesignSubmit.ts`）：
   - 如有必要先运行登录门槛。
   - `assertSubmissionEligibility(profile, feature)` 检查订阅的
     `allowed_catalogs`。
   - `assertPersonalTokenBalance(profile, jobType)` 检查积分余额。
   - `stageDesignImages` 上传图片——见下文。
   - `buildStandardDesignJob` 组装请求，`submitDesignJob` 携带从逻辑动作推导出的 `Idempotency-Key`（`scope: "design"`、`ownerId`、`actionId: "job:<logicalJobId>"`）以 `POST /v1/design-jobs` 提交。
5. 结果页通过 `createPollScheduler` 轮询直到终态，然后展示结果图。

### 暂存图片（上传路径）

`pkg-features/repositories/designAssets.ts` 中的 `stageDesignImages`：

1. 对每个所需角色（`image`，以及任务类型要求时的
   `masked_image` / `reference_image`），调用幂等的
   `POST /v1/assets/upload-intents`，参数为 `{ type: "IMAGE", purpose: "DESIGN_JOB_INPUT", role,
   original_filename, content_type, size_bytes }`。
2. 如果 intent 显示 `READY`，说明素材已存在——完成。
3. 否则用 `uni.uploadFile` **直接上传**到返回的预签名 POST URL，通过
   `onProgressUpdate` 上报进度。
4. 调用 `POST /v1/assets/{id}/complete` 确认，并取回
   `content_sha256`、`object_etag`、宽/高。

后端从不代理图片字节。

### 可复用的设计提交

提交复用由 `pkg-features/repositories/designJobSubmit.ts` 强制：

- `PreparedDesignJobRequest` 会按类型对照 body 键的白名单校验（语音任务期望
  `workspace_id/type/name/assets`；图片任务还需要 `prompts`；`html_report`
  还需要 `report_items`）。
- 响应会与请求交叉核对：相同的 `workspace_id`、`type`、`name`、回显的
  `client_info`、一个 `status_url`，以及单个 `resolved_prompt`。任何漂移都抛出
  `DESIGN_JOB_SUBMIT_RESPONSE_INVALID`。
- `Idempotency-Key` 请求头让网络失败后的重试也是安全的。

## 4. 家居试搭

1. 上传一张**空间照片**。
2. 使用内置画布蒙版（画笔/橡皮、撤销/重做）标出区域。
3. 从选项宫格中选择一件家具。
4. 二次确认。
5. 用 `furnitureDesignSubmit.ts` 提交，它会并行暂存 `image`、
   `masked_image` 以及（选中时的）`reference_image`。

## 5. 录音与回放（#228）+ 语音总结工作流

这是最新的流程。它有两半：**录制/提交**与**带进度记忆的回放**。

### 5a. 录制与提交

页面：`pkg-features/pages/voice_summary/index.vue`。

- 页面从 `yuanzhu.voice-summary-draft.v1` 恢复草稿，并重新校验每个已保存的音频文件（大小与 content-type 必须匹配）。
- 添加音频有两种方式：
  - **开始录制**——使用 `uni.getRecorderManager()`，配置为
    `{ duration: 600000, format: "mp3", sampleRate: 16000,
    numberOfChannels: 1, encodeBitRate: 48000 }`。录音器通过
    `WeakMap`/`WeakSet` 归属守卫被仔细追踪，以保证导航后过期的
    `onStop`/`onError` 不会污染状态。
  - **从聊天/文件选择**——`wx.chooseMessageFile` 过滤为
    `mp3, wav, aac, m4a`。
- 接受条件：1–3 个文件，每个 ≤ 25 MB，时长 ≤ 120 分钟，且文件签名（RIFF/WAVE、ftyp、ID3、MPEG audio sync、AAC sync）必须与扩展名一致。
- 客户信息通过 `ClientInfoForm.vue` 收集
  （`last_name` ≤ 10 字符、`salutation` 先生/女士、`project_name` ≤ 20 字符）
  ——即"原木风客户信息"采集。
- 提交时，`voiceSummarySubmit.ts` 运行资格 + 积分预检，
  `stageVoiceAudioFiles` 上传每段录音（intent → 直传 → complete，对
  429/503/409 最多重试 2 次，并拒绝重复 sha256），随后以
  `{ type: "voice_summary", assets, client_info }` 发起
  `POST /v1/design-jobs`。
- 成功后页面导航到
  `/pkg-plans/pages/markdown/index?id=<jobId>`。

### 5b. 可续播的语音回放

页面：`pkg-plans/pages/markdown/index.vue`。

- 页面轮询 `loadMarkdownSummary(id)` 直到任务终态。
- 每段已上传录音都以一个圆形进度环列出，进度环由 CSS 变量
  `--audio-progress` 驱动的 `conic-gradient` 绘制。
- 回放状态保存在 `playbackByAsset` ref 中，以 `assetId` 为键，值为
  `{ status: idle|loading|playing|paused|ended|error, currentTime, duration }`。
- 点击播放会创建一个 `uni.createInnerAudioContext()`。从某段暂停的录音切走时，
  `releaseAudio(preservePosition = true)` 会把当前位置写回
  `playbackByAsset`，新的上下文以 `context.startTime = resumeAt`
  启动——因此播放会精确从上次停下的地方续上。（已播完的录音则从 0 重新开始。）
- `onHide` 暂停音频；`onUnmounted` 销毁调度器并销毁音频上下文。过期 URL
  会弹出友好提示。
- 准备好后，markdown 以清洗后的块渲染
  （`parseSafeMarkdown` 剥离图片/链接/HTML，保留 1–3 级标题、项目符号、有序列表与 `**加粗**` 片段），并带一个"复制原始总结"按钮。

## 6. 设计报告（方案汇报）

HTML 报告功能目前被后端目录**从首页下线**（`reason: "report_blocked"`）。历史 HTML 报告仍可从"我的方案"通过 `web-view` 打开。启用后的流程：

1. 从一个已完成的设计任务出发，提交一个带用户所选
   `report_items` 的 `html_report` 任务。
2. 完成后，在 `web-view` 中打开报告，其源站必须等于
   `VITE_REPORT_WEB_ORIGIN`。`reportViewer.ts` 在打开前校验会话（源站、
   HTTPS、过期时间）。

## 7. 我的方案

`pages/plans/index.vue` 使用 `src/services/plansPage.ts` 中的
`loadPlansPage(workspaceId, scope, page)`：

- 区分 `mine`（个人）与 `all`（工作空间）两种 scope。
- 并行加载当前页与完成/失败总数，以计算 `inflightTotal` 与
  `completedReportTotal`。
- 支持工作空间切换、状态/类型过滤与 `q` 搜索。
- `pkg-plans/pages/detail/index.vue` 展示单个任务，带轮询与操作；
  `pkg-plans/services/designComparison.ts` 驱动图片对比。

## 8. 账户与计费

### 商店（购买权益）
`pkg-account/pages/store/index.vue` 从
`pkg-account/repositories/billingCatalog.ts` 列出积分包与订阅。购买调用
`purchaseRequest.ts`，由后端创建 JSAPI 订单，随后
`payment.ts` 用签名参数（timeStamp/nonceStr/package/signType=RSA/paySign）调用
`uni.requestPayment`。取消与支付方失败都会表现为带类型的
`PaymentBridgeError`。

### 支付记录改版（支付记录）
`pkg-account/pages/orders/index.vue` 渲染改版后的支付记录列表。订单生命周期被拆到多个小仓库：
`paymentOrder.ts`（创建）、`paymentResume.ts`（重新查询待支付订单）、
`paymentReconciliation.ts`（轮询直到已支付）、`paymentClose.ts`（关闭过期订单）、
`paymentHistory.ts`（列表）。页面使用 `pricePresentation.ts` 与
`entitlementPresentation.ts` 格式化金额与权益。

### 订阅与续订引导（权益管理）
`pkg-account/pages/subscription/index.vue` 展示当前套餐、额度与周期。
`pkg-account/services/subscriptionRenewal.ts`
（`activeSubscriptionRenewalNotice`）在用户尝试续订生效中订阅时，弹出标题为
**"暂不支持提前续订"**的弹窗：它说明当前套餐的到期日期，告知用户到期后再购买。本版本**没有自动扣费**。

### 积分（Token 明细）
`pkg-account/pages/tokens/index.vue` 渲染来自
`workspaceTokenDetail.ts` 的游标分页积分台账，覆盖初始赠送、购买、任务预留/消耗/释放、订阅购买/到期、推荐奖励与人工调整。

### 企业空间（企业空间）——仅所有者
`pkg-account/pages/organization/index.vue` 让所有者重命名工作空间、管理席位、发送/撤销分享邀请（`shareInvitations.ts`、
`shareInvitationPreview.ts`、`shareInvitationAcceptance.ts`），并通过
`memberSelfLeave.ts` 退出。角色只有 **owner** 与 **member**；没有成员角色调整。推荐奖励在
`pkg-account/pages/rewards/index.vue` 领取。

## 横切行为

- **幂等**：提交动作与素材上传都携带幂等键，因此网络失败后的重试绝不会产生重复。
- **轮询**：`pollScheduler` 在页面隐藏时暂停，遵守
  `poll_after_seconds` / `Retry-After`，并在 429/503 时退避。
- **令牌刷新**：请求客户端透明地刷新过期的 access 令牌（单一共享的刷新 promise，合并并发 401）。
- **错误呈现**：后端错误码被映射为友好的中文消息
  （`designFailurePresentation.ts`、`request.ts` 中的
  `HTTP_STATUS_MESSAGES`）。
- **上传的隐私合规**：录音与选文件按钮使用
  `open-type="agreePrivacyAuthorization"` 并检查 `uni.getPrivacySetting()`；未声明隐私的选择器错误（`VOICE_AUDIO_PICKER_PRIVACY_UNDECLARED`、
  `VOICE_AUDIO_PICKER_PRIVACY_REQUIRED`）以弹窗呈现。

## 下一步

- [数据源模式](/frontend/data-source-modes)——每个流程运行在哪个模式。
- [参考 → 端到端调用链](/reference/rest-api)——后端一侧。
