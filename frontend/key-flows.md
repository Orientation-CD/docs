# Key User Flows

This page walks through the **main user journeys** from the mini program's
perspective: what the user sees and what the frontend does at each step. The
corresponding backend call chains live in
[Reference → End-to-End Call Chains](/reference/rest-api).

## 0. App startup

1. **Ad splash** (`pages/ad-splash/index`) — 5 seconds, skippable. Shows the
   CDN object `ads/beta-recruitment-splash.png` or a bundled placeholder
   (`static/images/ads/splash-placeholder.svg`).
2. **Brand splash** (`pages/splash/index`) — 3 seconds.
3. **Home** (`pages/home/index`) — the main tab. It shows the home ad banner
   (tap → `openStore` after a registration gate), a rotating `HeroCarousel` of
   available features, and a `FeatureGrid`.

Guests can browse everything; no login is required yet.

## 1. Token precheck on the home screen (#224, #226)

When the user taps a feature card, `pages/home/index.vue` does not just
navigate. It calls `inspectHomeEntry(catalog.features[id].jobType.token_cost)`
from `src/services/homeEntryGuard.ts`:

- In mock mode it asks the task repository how many inflight jobs exist.
- In API mode, if there is no access token it short-circuits as a guest.
  Otherwise it lists `status=pending` and `status=running` jobs (page 1) and,
  when a token cost is supplied, fetches the current profile in parallel and
  runs `personalCatalogTokenShortage(profile, cost)`.

Two guards can fire before navigation:

- **Token shortage** — a modal shows
  "当前剩余 X Token，使用 `<feature>` 需要 Y Token" with a **立即充值** button
  that opens `/pkg-account/pages/store/index`.
- **Active-job limit** — `ACTIVE_JOB_LIMIT = 5`. If 5 jobs are already in
  flight, the user is sent to `/pages/plans/index`. Admission is still
  enforced atomically at submit time; the precheck is just friendly UX.

The same precheck runs for the **voice** feature when launched from home.

## 2. Login / registration (gate at submission)

Login is a **shared registration panel** (`pkg-account/pages/login/index.vue`)
driven by `src/services/accountGate.ts`. It is triggered by
`requestWechatRegistration()` / `ensureRegisteredForAction()`:

- **Returning user**: `wechatSessionRepository.silentLogin()` tries a silent
  login with the stored tokens. If the backend answers `428
  PHONE_AUTH_REQUIRED` the flow switches to phone authorization; `409
  LEGAL_ACCEPTANCE_REQUIRED` loads current legal documents.
- **New user**: the panel shows the required legal documents
  (`GET /v1/legal-documents/current?locale=zh-CN`), requires agreement, and
  calls `wechatSessionRepository.register(phoneCode, documents)` with
  `code + phone_code + accepted_document_ids`.
- The backend returns a token pair; `sessionTokenStore.applyTokenPair`
  persists it and the interrupted action continues.

## 3. A standard design flow (interior / local / kitchen / bathroom / colored floor plan)

1. User taps a feature card → `pkg-features/pages/<feature>/index`.
2. The page uses `StandardFeaturePage.vue` plus `OptionGrid.vue` /
   `ImageOptionGrid.vue` to walk through room/style/material choices. The
   prompt catalogue comes from `pkg-features/repositories/promptCatalog.ts`.
3. The user uploads a photo via `UploadStep.vue`; `imageFileMetadata.ts`
   inspects the local file.
4. On **Submit** (`standardDesignSubmit.ts`):
   - The login gate runs if needed.
   - `assertSubmissionEligibility(profile, feature)` checks the subscription
     `allowed_catalogs`.
   - `assertPersonalTokenBalance(profile, jobType)` checks the token balance.
   - `stageDesignImages` uploads the image(s) — see below.
   - `buildStandardDesignJob` assembles the request and `submitDesignJob` POSTs
     `POST /v1/design-jobs` with an `Idempotency-Key` derived from the logical
     action (`scope: "design"`, `ownerId`, `actionId: "job:<logicalJobId>"`).
5. The result page polls via `createPollScheduler` until terminal, then shows
   the result image.

### Staging images (upload path)

`stageDesignImages` in `pkg-features/repositories/designAssets.ts`:

1. For each required role (`image`, plus `masked_image` / `reference_image`
   when the job type requires them), call `POST /v1/assets/upload-intents`
   (idempotent) with `{ type: "IMAGE", purpose: "DESIGN_JOB_INPUT", role,
   original_filename, content_type, size_bytes }`.
2. If the intent says `READY`, the asset already exists — done.
3. Otherwise **upload directly** to the returned presigned POST URL with
   `uni.uploadFile`, reporting progress through `onProgressUpdate`.
4. Call `POST /v1/assets/{id}/complete` to confirm and receive
   `content_sha256`, `object_etag`, width/height.

The backend never proxies image bytes.

### Reusable design submissions

Submission reuse is enforced by `pkg-features/repositories/designJobSubmit.ts`:

- A `PreparedDesignJobRequest` is validated against a per-type allow-list of
  body keys (voice jobs expect `workspace_id/type/name/assets`; image jobs also
  require `prompts`; `html_report` also requires `report_items`).
- The response is cross-checked against the request: same `workspace_id`,
  `type`, `name`, echoed `client_info`, a `status_url`, and a single
  `resolved_prompt`. Any drift throws `DESIGN_JOB_SUBMIT_RESPONSE_INVALID`.
- The `Idempotency-Key` header makes retries after a network failure safe.

## 4. Furniture try-on

1. Upload a **space photo**.
2. Use the built-in canvas mask (brush/eraser, undo/redo) to mark the area.
3. Pick a furniture item from the option grid.
4. Double-confirm.
5. Submit with `furnitureDesignSubmit.ts`, which stages `image`,
   `masked_image` and (when chosen) `reference_image` in parallel.

## 5. Voice recording & playback (#228) + voice summary workflow

This is the newest flow. It has two halves: **recording/submission** and
**playback with resumable progress**.

### 5a. Recording & submission

Page: `pkg-features/pages/voice_summary/index.vue`.

- The page restores a draft from `yuanzhu.voice-summary-draft.v1` and
  revalidates each saved audio file (size and content-type must match).
- Two ways to add audio:
  - **Start recording** — uses `uni.getRecorderManager()` with
    `{ duration: 600000, format: "mp3", sampleRate: 16000,
    numberOfChannels: 1, encodeBitRate: 48000 }`. The recorder is carefully
    tracked with `WeakMap`/`WeakSet` ownership guards so a stale
    `onStop`/`onError` after navigation cannot corrupt state.
  - **Pick from chat/files** — `wx.chooseMessageFile` filtered to
    `mp3, wav, aac, m4a`.
- Accepted constraints: 1–3 files, each ≤ 25 MB, duration ≤ 120 minutes,
  and the file signature (RIFF/WAVE, ftyp, ID3, MPEG audio sync, AAC sync)
  must match its extension.
- Client info is collected via `ClientInfoForm.vue`
  (`last_name` ≤ 10 chars, `salutation` 先生/女士, `project_name` ≤ 20 chars)
  — the "natural wood client info" collection.
- On submit, `voiceSummarySubmit.ts` runs eligibility + token preflight,
  `stageVoiceAudioFiles` uploads each recording (intent → direct upload →
  complete, with up to 2 retries on 429/503/409 and a duplicate-sha256
  rejection), then POSTs `POST /v1/design-jobs` with
  `{ type: "voice_summary", assets, client_info }`.
- On success the page navigates to
  `/pkg-plans/pages/markdown/index?id=<jobId>`.

### 5b. Resumable voice playback

Page: `pkg-plans/pages/markdown/index.vue`.

- The page polls `loadMarkdownSummary(id)` until the job is terminal.
- Each uploaded recording is listed with a circular progress ring built from
  a `conic-gradient` driven by the CSS variable `--audio-progress`.
- Playback state is kept in a `playbackByAsset` ref, keyed by `assetId`, with
  `{ status: idle|loading|playing|paused|ended|error, currentTime, duration }`.
- Tapping play creates one `uni.createInnerAudioContext()`. When switching
  from a paused recording, `releaseAudio(preservePosition = true)` writes the
  current position back into `playbackByAsset`, and the new context is started
  with `context.startTime = resumeAt` — so playback resumes exactly where it
  left off. (A finished recording restarts from 0.)
- `onHide` pauses audio; `onUnmounted` disposes the scheduler and destroys the
  audio context. Expired URLs surface a friendly toast.
- When ready, the markdown is rendered as sanitized blocks
  (`parseSafeMarkdown` strips images/links/HTML, keeps headings 1–3, bullets,
  ordered lists and `**bold**` segments), with a "复制原始总结" button.

## 6. Design report (方案汇报)

The HTML report feature is currently **disabled from the home screen** by the
backend catalog (`reason: "report_blocked"`). Historical HTML reports remain
openable from "我的方案" via the `web-view`. The flow, when enabled:

1. From a completed design job, submit an `html_report` job with
   `report_items` selected by the user.
2. When it completes, open the report in a `web-view` whose origin must equal
   `VITE_REPORT_WEB_ORIGIN`. `reportViewer.ts` validates the session (origin,
   HTTPS, expiry) before opening.

## 7. My plans (我的方案)

`pages/plans/index.vue` uses `loadPlansPage(workspaceId, scope, page)` from
`src/services/plansPage.ts`:

- Splits `mine` (personal) vs `all` (workspace) scope.
- Loads the current page plus completed/failed totals in parallel to compute
  `inflightTotal` and a `completedReportTotal`.
- Supports workspace switching, status/type filters and `q` search.
- `pkg-plans/pages/detail/index.vue` shows one job with polling and actions;
  `pkg-plans/services/designComparison.ts` powers image comparison.

## 8. Account & billing

### Store (购买权益)
`pkg-account/pages/store/index.vue` lists token packages and subscriptions from
`pkg-account/repositories/billingCatalog.ts`. Buying calls
`purchaseRequest.ts`, which asks the backend to create a JSAPI order, then
`payment.ts` invokes `uni.requestPayment` with the signed parameters
(timeStamp/nonceStr/package/signType=RSA/paySign). Cancellations and provider
failures surface as typed `PaymentBridgeError`s.

### Payment history redesign (支付记录)
`pkg-account/pages/orders/index.vue` renders the redesigned payment history
list. The order lifecycle is split across small repositories:
`paymentOrder.ts` (create), `paymentResume.ts` (re-query a pending order),
`paymentReconciliation.ts` (poll until paid), `paymentClose.ts` (close a stale
order), `paymentHistory.ts` (list). The page uses `pricePresentation.ts` and
`entitlementPresentation.ts` to format amounts and benefits.

### Subscription & renewal guidance (权益管理)
`pkg-account/pages/subscription/index.vue` shows the current plan, allowance
and period. `pkg-account/services/subscriptionRenewal.ts`
(`activeSubscriptionRenewalNotice`) shows a modal titled **"暂不支持提前续订"**
when the user tries to renew an active subscription: it explains the current
plan's end date and tells them to buy again after expiry. There is **no
auto-charge** in this version.

### Tokens (Token 明细)
`pkg-account/pages/tokens/index.vue` renders the cursor-paginated token ledger
from `workspaceTokenDetail.ts`, covering initial grant, purchase, job
reserve/consume/release, subscription purchase/expiration, referral reward and
manual adjustments.

### Organization (企业空间) — owner only
`pkg-account/pages/organization/index.vue` lets the owner rename the workspace,
manage seats, send/revoke share invitations (`shareInvitations.ts`,
`shareInvitationPreview.ts`, `shareInvitationAcceptance.ts`) and leave via
`memberSelfLeave.ts`. Roles are only **owner** and **member**; there is no
member-role adjustment. Referral rewards are claimed from
`pkg-account/pages/rewards/index.vue`.

## Cross-cutting behaviors

- **Idempotency**: submit actions and asset uploads carry an idempotency key,
  so retries after network failure never create duplicates.
- **Polling**: `pollScheduler` pauses when the page is hidden, respects
  `poll_after_seconds` / `Retry-After`, and back offs on 429/503.
- **Token refresh**: the request client transparently refreshes expired access
  tokens (single shared refresh promise).
- **Error presentation**: backend error codes are mapped to friendly Chinese
  messages (`designFailurePresentation.ts`, `HTTP_STATUS_MESSAGES` in
  `request.ts`).
- **Privacy compliance for uploads**: recording and file-pick buttons use
  `open-type="agreePrivacyAuthorization"` and check `uni.getPrivacySetting()`;
  undelared-picker errors (`VOICE_AUDIO_PICKER_PRIVACY_UNDECLARED`,
  `VOICE_AUDIO_PICKER_PRIVACY_REQUIRED`) are surfaced as modals.

## Next steps

- [Data Source Modes](/frontend/data-source-modes) — which mode each flow runs in.
- [Reference → End-to-End Call Chains](/reference/rest-api) — the backend side.
