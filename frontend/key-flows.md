# Key User Flows

This page walks through the **main user journeys** from the mini program's
perspective: what the user sees and what the frontend does at each step. The
corresponding **backend call chains** live in
[Reference → End-to-End Call Chains](/reference/rest-api).

## 0. App startup

1. **Ad splash** (5 s, skippable) — shows the configured ad image
   (`VITE_AD_SPLASH_IMAGE_URL`) or a bundled placeholder.
2. **Brand splash** (3 s) — the brand page.
3. **Home** — the main tab. Shows:
   - the home **ad banner**,
   - a rotating carousel of the six features,
   - a **3×2 grid** of feature cards.

Guests can browse everything; no login is required yet.

## 1. Login / registration (gate at submission)

Login is a **shared registration panel** used across the app. It is triggered
when a user needs an account — most importantly at **submission time** (see
below). Flows:

- **Returning user**: `hasRegisteredSession()` tries a **silent login** with the
  stored tokens; if that works the user is authenticated immediately.
- **New user**: the panel requests **WeChat phone-number authorization**, shows
  the required **legal documents** (privacy policy etc.), and registers with
  `code + phone_code + accepted_document_ids`.
- The backend returns a token pair; the frontend persists it and continues the
  interrupted action.

See [WeChat Login Flow](/reference/flows/wechat-login-flow) for the full chain.

## 2. A standard design flow (interior / local / kitchen / bathroom)

1. User taps a feature card → `pkg-features/pages/<feature>/index`.
2. The page loads **prompt templates** and **job-type availability**
   (status, required images, token cost) from Content repositories.
3. User completes the **multi-step form** (room type, style, materials, ...)
   and uploads a **photo**.
4. On **Submit**:
   - The **login gate** runs if needed (guest → register).
   - **Token preflight** verifies the personal token balance is enough.
   - Images are **staged** (upload-intent → direct upload → complete).
   - A **design job** is submitted with an **idempotency key**
     (`POST /v1/design-jobs`).
5. The result page shows the job and **polls** (`pollScheduler`) using the
   backend's `poll_after_seconds` / `Retry-After` guidance until terminal
   status (`completed` / `failed`).
6. On completion, the **result image** is shown (from a short-lived presigned
   URL); the user can then create a **report**.

## 3. Furniture try-on

1. Upload a **space photo**.
2. Use the **canvas mask** to mark the area where furniture will be placed.
3. Browse **furniture items**; select one.
4. **Double-confirm** the selection.
5. Submit as a design job with the space image + masked image (+ optional
   reference image). Same polling/report path as above.

## 4. Design report (方案汇报)

1. From a completed design job, the user taps **生成汇报**.
2. They upload/review assets, choose one of **15 styles**, fill in
   **personal / enterprise fixed fields** (or "client info": surname,
   salutation, project name), and optionally pick **content sections**.
3. Submit an `html_report` design job (report items are included in the
   request).
4. When the report job completes, the backend produces a **report view token**.
5. The user opens the report in a `web-view` whose origin must equal
   `VITE_REPORT_WEB_ORIGIN`. The frontend validates the session (origin,
   HTTPS, expiry) before opening.

See [Report Viewing Flow](/reference/flows/report-view-flow).

## 5. My plans (我的方案)

- Lists the user's design jobs (`GET /v1/design-jobs`) with
  **workspace switching** (personal vs enterprise), **status / type filters**,
  and **search** (`q`).
- Supports **image comparison** (input vs result).
- Opens **report** `web-view`s for completed reports.
- Plan detail (`pkg-plans/pages/detail`) shows a single job with polling and
  action buttons.

## 6. Account & billing

### Store (购买权益)
- The store lists **token packages** and **subscriptions** from the Billing
  repository.
- Buying triggers the **payment flow**: backend `POST /billing/...` returns
  WeChat JSAPI payment parameters → frontend calls `uni.requestPayment`
  (`payment.ts` paymentBridge) → user pays in WeChat → backend receives the
  payment notify webhook → order becomes paid.

### Orders & tokens
- **支付记录** lists payment orders.
- **Token 明细** shows the token ledger entries (initial grant, reserves,
  settlements, purchases).

### Subscription (权益管理)
- Shows the current subscription, its allowance and renewal; first version is
  **single payment + manual renewal** (no auto-charge).

### Profile (账号资料)
- Update nickname / phone.
- Default avatar derived from the first character of the nickname.
- Server-side session logout (revokes the refresh token).
- Avatar saving is not yet open.

## 7. Organization (企业空间) — owner only

- **Enterprise workspace management**: rename, seats, invitations, members and
  all plans. Roles are only **owner** and **member**; there is no member-role
  adjustment.
- The owner sends **invitations**; members accept via the invitation page.

See [Workspace Membership Flow](/reference/flows/workspace-membership-flow).

## Cross-cutting behaviors

- **Idempotency**: submit actions and asset uploads carry an idempotency key,
  so retries after network failure never create duplicates.
- **Polling**: `pollScheduler` pauses when the page is hidden and resumes when
  visible; respects `Retry-After`, and backoffs exponentially on 429/503.
- **Token refresh**: the request client transparently refreshes expired access
  tokens.
- **Error presentation**: backend error codes are mapped to friendly Chinese
  messages (`designFailurePresentation.ts`, `HTTP_STATUS_MESSAGES`).

## Next steps

- [Data Source Modes](/frontend/data-source-modes) — which mode each flow runs in.
- [Reference → End-to-End Call Chains](/reference/rest-api) — the backend side.
