# Key User Flows

This page follows user actions through the shared frontend behavior. Request-family details are in [Workflows](/frontend/workflows); project ownership is in [Projects](/frontend/projects).

## Discover and enter a feature

The home page and group pages share `useFeatureLauncher`: release visibility, server discovery, subscription explanation, Token precheck and the five-active-task guard are applied consistently. Root cards lead to AI design/creation; the renovation folder adds a third level. Breadcrumbs and shared navigation preserve the path back to home.

The anonymous Feature catalog uses `/v1/billing/features`. Missing products in a successful response are unavailable. Network failure is a retryable discovery problem, not proof that a deployment has no capabilities. Prices and permission keys are server values.

## Register at the appropriate action

Available image flows let a guest complete local choices and request registration at final submission. Shared account gating handles current legal documents, phone authorization and platform-specific registration. It also handles account/workspace changes during an action. Do not describe all API-only pages as fully usable by guests.

WeChat and Douyin use separate backend login exchanges. Local WeChat mock codes are a development identity mechanism. A production bundle uses platform login; secrets stay on the backend.

## Create an image or recording summary

Standard design pages collect choices and a photo. Furniture try-on adds mask editing and a reference image; customized design uses advertised editable templates. Submission rechecks server configuration/entitlement, binds the project if enabled, stages verified Assets and sends one logical action.

Recording summary supports recording or selecting up to three MP3/WAV/AAC/M4A files. Local file inspection checks signatures and the 25,000,000-byte / 120-minute per-file limits. The recording UI has a shorter per-take capture limit. Duplicate recordings and stale/unreadable local files are rejected before submission.

The Markdown result page polls until terminal, renders formatted sanitized text and lists the original recordings. Playback remembers each Asset's position while switching recordings; leaving the page pauses and eventually releases audio resources. Expired media access needs a fresh server-authorized URL. [Platforms](/frontend/platforms) covers privacy/domain setup.

## View, retry and manage plans

Plans can be filtered by workspace/project, status and type. Enterprise all-plans access is owner-only and separate from a user's personal list. Result routing handles images/comparison, recording summaries, copywriting Markdown, video and reports.

The client never changes a pending task to failed merely because a timer elapsed. A supported retry uses server eligibility and keeps the existing task identity. Deletion/movement check current write access and invalidate affected counts/caches. Read-only member project views omit submission, retry, deletion and movement actions.

## Purchase and confirm entitlements

The store and subscription pages group design reports, AI copywriting and AI Q&A for readability; grouping does not grant extra Feature keys. Prices, discounts, benefits and workspace suitability come from the backend.

A purchase creates an idempotent order. The platform bridge opens WeChat JSAPI or Douyin trade payment; the app then reconciles with server evidence. Native cancellation, delayed notifications and uncertain responses preserve recovery through payment history. Active subscriptions show manual-renewal guidance; current UI does not support early renewal or automatic charging.

For local mock WeChat payment, native invocation is not replaced automatically. Use the explicit authenticated mock settlement in [Quick Start](/get-started/quickstart). A paid mock order tests application settlement, not the real payment channel.

## Resume drafts and recover safely

Feature drafts are scoped by owner and workspace, listed in the draft box, and saved with recoverability checks. A request with unknown acceptance retains its exact payload and idempotency key. Re-entering another account/workspace cannot reuse the old context silently.

Inputs survive recoverable errors so the user can refresh configuration, restore access, choose another subscription, resolve balance or retry the original uncertain action. Report/file viewers refresh access instead of treating an expired signed URL as a permanently lost result.

## Source evidence

Frontend `eca0a5f` (2026-10-20): [Shared entry](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/useFeatureLauncher.ts) · [Audio verification](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/voiceAudioFiles.ts) · [Native payment](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-account/services/payment.ts) · [Draft persistence](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/featureDrafts.ts).
