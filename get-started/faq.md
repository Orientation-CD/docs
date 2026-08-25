# FAQ

Common questions from people starting with the project. If your question is not
here, try the [Glossary](/get-started/glossary) or search the docs.

## Product & project

**Q: What exactly does the product do?**
A: It is a WeChat mini program that turns photos of rooms into AI-generated
interior-design proposals and professional HTML reports. Users upload a photo,
the backend schedules an AI "design job", an image model renders the result, and
the user can view and share a report. See [Introduction](/get-started/introduction).

**Q: Why are there three repositories?**
A: Frontend (`wechat_mini_program`), backend (`YuanZhu-AI`) and documentation
(`docs`). They are developed and released on independent cadences, so keeping
them in separate repos lets each team work and deploy independently.

**Q: Which branches are canonical?**
A: Frontend → `ui-integration`; Backend and Docs → `main`. Always sync to the
latest before working (see [Quick Start](/get-started/quickstart)).

## Running the project

**Q: Do I need real WeChat credentials to develop locally?**
A: No. The local stack ships with mock WeChat identity, mock payment and mock
AI providers. You only need real credentials to test production behaviors
(real WeChat login/pay, real model calls). See [Quick Start](/get-started/quickstart).

**Q: Why does the mini program show "无法连接后端服务"?**
A: Usually the `VITE_API_BASE_URL` is wrong, or the mini program is trying to
reach a non-HTTPS, non-loopback address. Use the `api-local` dev mode which
targets `http://127.0.0.1:8080`, and make sure your backend stack is running.

**Q: Can I develop the UI without running the backend at all?**
A: Yes — run `pnpm dev:mp-weixin:mock`. The frontend has a complete in-memory
mock of every repository.

## Architecture

**Q: Why is design processing asynchronous (workers + polling)?**
A: AI image generation takes tens of seconds to minutes. Blocking a single HTTP
request for that long would be unusable and fragile. Instead the backend
enqueues a job, workers process it against the provider, and the frontend polls
for the durable status. See [Design Jobs](/backend/design-jobs).

**Q: Where are the images stored?**
A: In S3-compatible object storage — MinIO locally, Aliyun OSS in production.
The frontend uploads directly to storage via presigned URLs; it never proxies
images through the backend. See [Assets & Object Storage](/backend/assets-storage).

**Q: What is the role of each worker?**
A: The **submit worker** calls the AI provider to create a provider job; the
**poll worker** repeatedly checks that job and persists the result. See
[Architecture](/get-started/architecture).

## Billing & accounts

**Q: How does the token economy work?**
A: New users may receive a starter token grant. Each design job reserves tokens
on submission and settles the exact cost on completion. Users top up by buying
token packages or a subscription via WeChat Pay. See
[Billing & Tokens](/backend/billing-tokens).

**Q: Do users have to log in before using features?**
A: No. All six features can be explored as a **guest**; the WeChat
registration/login gate triggers at the final submission step.

**Q: What is the difference between personal and enterprise workspaces?**
A: A personal workspace is private. An enterprise workspace is shared: the
owner manages seats, invitations and members; members see shared plans. See
[Workspaces & Organizations](/backend/workspaces-orgs).

## Deployment

**Q: Where is the backend deployed?**
A: Alibaba Cloud **SAE** (Serverless App Engine). One immutable image per Git
commit is built and published to ACR, then deployed to SAE applications (API,
submit worker, poll worker, migration job, mocks). See
[Cloud Architecture](/deploy/cloud-architecture).

**Q: How does the documentation site get published?**
A: This site is built with **VitePress**. On every push to the `main` branch of
the `docs` repository, a **GitHub Actions** workflow builds it and publishes it
to **GitHub Pages**. You never deploy manually. See
[CI/CD with GitHub Actions](/deploy/ci-cd).

## Contributing to the docs

**Q: How do I edit these docs?**
A: All content is Markdown under `docs/docs/`. Edit a file, push to `main`, and
the site updates automatically. To preview locally:

```bash
pnpm install
pnpm docs:dev
```

Then open the printed local URL. See [CI/CD with GitHub Actions](/deploy/ci-cd)
for the full workflow and the local preview command.

**Q: Is there a style guide for docs?**
A: Keep it **beginner-friendly** (the docs assume zero background), use real
file/endpoint names, and whenever you describe an API include the full call
chain (see [Reference](/reference/rest-api)). Follow the structure of existing
pages: overview first, then details, then links to related topics.
