# FAQ

Common questions from people starting with the project. If your question is not
here, try the [Glossary](/get-started/glossary) or search the docs.

## Product & project

**Q: What exactly does the product do?**
A: It is a WeChat mini program that turns photos (or voice recordings) of rooms
into AI-generated interior-design proposals and professional deliverables. Users
upload a photo or recording, the backend schedules an AI "design job", a model
renders the result (or summarizes the recording as markdown), and the user views
and replays it. See [Introduction](/get-started/introduction).

**Q: Why are there three repositories?**
A: Frontend (`wechat_mini_program`), backend (`YuanZhu-AI`) and documentation
(`docs`). They are developed and released on independent cadences, so keeping
them in separate repos lets each team work and deploy independently.

**Q: Which branches are canonical?**
A: Frontend → `ui-integration`; Backend and Docs → `main`. Always sync to the
latest before working (see [Quick Start](/get-started/quickstart)).

**Q: What is the WeChat AppID? Can I commit the AppSecret?**
A: The AppID is `wxec0d577de41255aa` (public). The **AppSecret must never be
committed** to the frontend repo — it lives only on the backend, where WeChat
exchanges the login `code` for an `openid`.

## Running the project

**Q: Do I need real WeChat credentials to develop locally?**
A: No. The local stack ships with mock WeChat identity, mock payment and mock
AI providers. You only need real credentials to test production behaviors
(real WeChat login/pay, real model calls). See [Quick Start](/get-started/quickstart).

**Q: Can I develop the UI without running the backend at all?**
A: Yes — run `pnpm dev:mp-weixin:mock`. The frontend has a complete in-memory
mock of every repository and uses a seeded personal + organization workspace.

**Q: Why does the mini program show "无法连接后端服务"?**
A: Usually `VITE_API_BASE_URL` is wrong, or the mini program is reaching a
non-HTTPS, non-loopback address. Use the `api-local` dev mode which targets
`http://127.0.0.1:8080`, make sure your backend stack is running, and enable
"不校验合法域名" in WeChat DevTools.

**Q: How do I point the frontend at a backend on a different port?**
A: Override the env var on the command line:
`VITE_API_BASE_URL=http://127.0.0.1:9090 pnpm dev:mp-weixin:api-local`.

**Q: How do I test on a real phone?**
A: Put the phone and Mac on the same LAN and run
`pnpm build:mp-weixin:api-device-wechat`, then import
`dist/build/mp-weixin` into DevTools.

## Architecture

**Q: Why is design processing asynchronous (workers + polling)?**
A: AI image generation and speech summarization take tens of seconds to minutes.
Blocking a single HTTP request for that long would be unusable and fragile.
Instead the backend enqueues a job, workers process it against the provider,
and the frontend polls for durable status with backoff. See
[Design Jobs](/backend/design-jobs).

**Q: Where are the images and audio stored?**
A: In S3-compatible object storage — MinIO locally, Aliyun OSS in production.
The frontend uploads **directly to storage** via presigned POST forms; it
never proxies bytes through the backend. The backend only signs intents and
verifies completions. See [Assets & Object Storage](/backend/assets-storage).

**Q: What is the role of each worker?**
A: The **submit worker** calls the AI/speech provider to create a provider
job; the **poll worker** repeatedly checks that job and persists the result.
See [Architecture](/get-started/architecture).

**Q: Why does the home screen check tokens before opening a feature?**
A: It is a friendly UX guard (#224, #226): `inspectHomeEntry(tokenCost)` counts
inflight jobs (`ACTIVE_JOB_LIMIT = 5`) and compares the personal token balance
against the job's catalog cost. If either fails, the user is sent to the store
or "我的方案". The backend still enforces the same limits atomically at submit
time.

**Q: How does voice playback resume where I left off?**
A: The markdown summary page keeps a per-asset `playbackByAsset` map
(`status`, `currentTime`, `duration`). Pausing or switching recordings writes
the current position back, and a new `InnerAudioContext` is started with
`context.startTime = resumeAt`. A finished recording restarts from 0.

## Billing & accounts

**Q: How does the token economy work?**
A: New users may receive a starter token grant. Each design job reserves tokens
on submission and settles the exact cost on completion. Users top up by buying
token packages or a subscription via WeChat Pay. See
[Billing & Tokens](/backend/billing-tokens).

**Q: Do users have to log in before using features?**
A: No. All image features can be explored as a **guest**; the WeChat
registration/login gate triggers at the final submission step.

**Q: Why can't I renew an active subscription?**
A: This version deliberately does not support early renewal. The "权益管理" page
shows a notice ("暂不支持提前续订") with the plan's end date; the user buys
again after expiry. There is no auto-charge.

**Q: What is the difference between personal and enterprise workspaces?**
A: A personal workspace is private. An enterprise workspace is shared: the
owner manages seats, invitations and members; members see shared plans. Roles
are only owner and member — there is no member-role adjustment. See
[Workspaces & Organizations](/backend/workspaces-orgs).

## Debugging & contribution

**Q: How do I run the tests?**
A: `pnpm test:domain` (pure logic, milliseconds), `pnpm test:unit` (Vitest),
and `pnpm quality:mp-weixin:mock` for the full local gate. See
[Testing & Quality Gates](/frontend/testing).

**Q: Why did the build fail on "package too large"?**
A: The quality gate enforces ≤ 1.5 MiB per chunk and ≤ 200 KiB per bundled
media. Heavy code must live in a subpackage; large images belong on the CDN
behind `VITE_ASSET_BASE_URL`.

**Q: Why is my new response field ignored / rejected?**
A: Every backend response is validated by a normalizer that throws
`*RESPONSE_INVALID` on unexpected shapes. Add the field to the matching
`map*` function and its unit test, and run `pnpm check:api-contract`.

**Q: How do I edit these docs?**
A: All content is Markdown under `docs/`. Edit a file, push, and the VitePress
site rebuilds automatically. To preview locally:

```bash
cd docs
pnpm install
pnpm docs:dev
```

Then open the printed local URL.

**Q: Is there a style guide for docs?**
A: Keep it **beginner-friendly** (the docs assume zero background), use real
file/endpoint/env-var names, and whenever you describe an API include the full
call chain (see [Reference](/reference/rest-api)). Internal links use paths
like `/frontend/architecture` (no `.md`, no locale prefix).
