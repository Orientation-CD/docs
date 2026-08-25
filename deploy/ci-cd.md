# CI/CD with GitHub Actions

Two repositories use GitHub Actions: the **backend** (cloud-test deployment) and
this **docs repository** (automatic documentation publishing). This page covers
both.

## Backend: deploy to SAE cloud test

The backend's workflow (`.github/workflows/deploy-sae-cloud-test.yml`) deploys
to SAE **cloud test** when code is pushed to the target branch (or via manual
`workflow_dispatch`).

### How it works

1. **validate** job (ubuntu-latest):
   - checks out the code,
   - installs `[dev]` test dependencies,
   - runs `ruff check` on the deployment script + `pytest -q` (regression
     suite).

2. **build-and-deploy** job (requires `validate` to pass, environment
   `cloud-test`):
   - checks out the commit,
   - sets up **Buildx** and logs into **ACR**,
   - builds & pushes the `runtime` image tagged with the full commit SHA,
   - **assumes the cloud-test SAE deployment role** via Alibaba OIDC
     (`aliyun/configure-aliyun-credentials-action`),
   - installs the pinned SAE SDK,
   - runs `scripts/deploy_sae_cloud_test.py` which performs: migration →
     deploy mock image → mock payment → mock WeChat → submit worker → poll
     worker → API → automated verification of live contracts.

### Variables / secrets required

| Kind | Name | Purpose |
| --- | --- | --- |
| vars | `ACR_REGISTRY`, `ACR_REPOSITORY` | Image target |
| secrets | `ACR_USERNAME`, `ACR_PASSWORD` | ACR login |
| vars | `ALIYUN_DEPLOY_ROLE_ARN`, `ALIYUN_OIDC_PROVIDER_ARN` | OIDC role assumption |
| vars | `SAE_REGION`, `SAE_ACR_INSTANCE_ID`, `SAE_MIGRATION_JOB_ID`, `SAE_MOCK_IMAGE_APP_ID`, `SAE_MOCK_PAYMENT_APP_ID`, `SAE_MOCK_WECHAT_APP_ID`, `SAE_SUBMIT_WORKER_APP_ID`, `SAE_POLL_WORKER_APP_ID`, `SAE_API_APP_ID`, `CLOUD_TEST_PUBLIC_API_BASE_URL`, `SAE_LEGAL_LOCALE` | SAE targets |

`concurrency` is set so only one cloud-test deploy runs at a time
(`cancel-in-progress: false`).

## Docs: automatic GitHub Pages publishing

This documentation site uses the standard **VitePress + GitHub Pages**
workflow. On every push to `main`, the workflow:

1. Checks out the repo.
2. Sets up Node + pnpm, installs dependencies.
3. Builds the site (`pnpm docs:build`).
4. Publishes the `docs/.vitepress/dist` output to **GitHub Pages**
   (via the official `actions/deploy-pages` + `actions/upload-pages-artifact`
   actions).

Because GitHub Pages serves the repo at a **project path**, the VitePress
config uses `base: '/docs/'` (matching this repo's name). If you rename the
repo, update `base` in `.vitepress/config.mts` accordingly.

### Editing & previewing locally

```bash
pnpm install
pnpm docs:dev        # dev server with HMR at http://localhost:5173
pnpm docs:build      # production build into docs/.vitepress/dist
pnpm docs:preview    # preview the built site
```

### Contributing rules

- All content is Markdown under `docs/docs/` (`.md`), organized by section.
- Keep links relative to the site root (e.g. `/backend/overview`).
- When you describe an API, follow the full call-chain style of the
  Reference section.
- Never commit `node_modules`, `.env`, or `docs/.vitepress/dist`.
- Push to `main` to publish; the site updates automatically.

## Next steps

- [Production Promotion & Rollback](/deploy/production) — how a proven image
  goes to production.
- [Get Started → FAQ](/get-started/faq) — contributing to these docs.
