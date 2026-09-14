# CI/CD with GitHub Actions

Two repositories use GitHub Actions: the **backend** (YuanZhu-AI) runs scheduled
endurance tests and a pull-request documentation gate, and this **docs repository**
(`docs`) auto-publishes the site to GitHub Pages. SAE cloud-test and production
deployment itself is **not** a GitHub Actions workflow — it is driven manually by the
scripts under `deploy/sae/` (see [SAE Deployment Runbook](/deploy/sae-deployment)).
This page covers everything that *is* automated.

## Backend workflows

The backend repository (`.github/workflows/`) ships two workflows.

### `daily-endurance.yml` — scheduled load endurance

| Aspect | Value |
| --- | --- |
| **File** | `.github/workflows/daily-endurance.yml` |
| **Triggers** | `schedule` (cron `17 3 * * *`) and `repository_dispatch` type `daily-endurance` |
| **Permissions** | `actions: read`, `contents: read` |
| **Concurrency** | group `daily-endurance`, `cancel-in-progress: false` |

What it does:

1. **`decide` job** (ubuntu-latest, 5 min timeout): when triggered by schedule, it asks
   the GitHub API for the previous scheduled run's `head_sha`. If it equals the current
   SHA, it skips (a release already covered); otherwise it runs. A manual
   `repository_dispatch` always runs.
2. **`endurance` job** (needs `decide`, 75 min timeout):
   - Checks out, installs Python 3.12 and `.[dev]` test dependencies.
   - Validates the bounded profile: exactly `E2E_USER_RUNNERS=2`,
     `E2E_USERS_PER_CONTAINER=4`, `E2E_DURATION_SECONDS=1800`,
     `E2E_AUTH_THREADS_PER_CONTAINER=2`, `E2E_API_WORKERS=2`.
   - Installs `.env.example` to a protected temp file and runs
     `python -m app.config_sync query` against the cloud admin to capture a validated
     config snapshot.
   - Launches a throwaway Compose stack (`CI_COMPOSE_PROJECT=yuanzhu-daily-<run-id>`,
     `CI_API_PORT=6060`) via `scripts/run_e2e_tests.sh --local localhost --mode
     endurance --config-snapshot ...`.
   - Samples `free -m`, `df -h`, and `docker stats` into `resources.log`.
   - On completion (always) captures `docker compose ps`/logs, uploads the evidence
     directory as a 7-day artifact, and tears down its own stack with `--volumes`.

**Secrets required:**

| Kind | Name | Purpose |
| --- | --- | --- |
| secrets | `CLOUD_API_URL` | Endurance E2E target / config-sync source |
| secrets | `CLOUD_ADMIN_USERNAME` | Config-sync admin login |
| secrets | `CLOUD_ADMIN_PASSWORD` | Config-sync admin password |
| vars | `DAILY_E2E_USER_ACTION_DELAY_SECONDS`, `DAILY_E2E_ADMIN_ACTION_DELAY_SECONDS` | Optional pacing overrides (bounded 1–10 s / 0.5–5 s) |

### `sdd-docs.yml` — pull-request documentation gate

| Aspect | Value |
| --- | --- |
| **File** | `.github/workflows/sdd-docs.yml` |
| **Triggers** | `pull_request` on paths `**/*.md`, `.github/spec-driven-delivery/**`, `scripts/check_sdd.py`, `tests/tooling/**`, `pyproject.toml`, this workflow file |
| **Permissions** | `contents: read` |
| **Concurrency** | group per PR number, `cancel-in-progress: true` |

Single job (`sdd`, ubuntu-latest, 10 min) that installs pinned documentation tooling
(`markdown-it-py==4.2.0`, `PyYAML==6.0.3`, `ruff==0.16.0`) and runs:

```bash
python scripts/check_sdd.py
python -m unittest discover -s tests/tooling -p 'test_*.py'
python -m ruff check scripts/check_sdd.py tests/tooling
python -m ruff format --check scripts/check_sdd.py tests/tooling
git diff --check "$BASE_SHA...$HEAD_SHA"
```

Evidence is uploaded as a 30-day artifact. No secrets required.

### Where SAE deployment automation lives

Cloud-test and production SAE rollouts are executed by `deploy/sae/deploy.sh` and its
helpers (`build-image.sh`, `run-deploy-container.sh`, `deploy-image.sh`), not by a
GitHub Actions workflow. The intended operator flow is:

1. Push to `main` (or run `daily-endurance`).
2. Locally run the two-phase deploy (build image → deploy from digest) — see
   [SAE Deployment Runbook](/deploy/sae-deployment).
3. Production promotion uses the protected `--promote` / `--rollback` flags.

This keeps release control with an operator who can read the migration backup evidence
and approve the database gate, rather than delegating it to a scheduled run.

## Docs workflow: automatic GitHub Pages publishing

The docs repository (`.github/workflows/deploy.yml`) uses the standard VitePress +
GitHub Pages setup.

| Aspect | Value |
| --- | --- |
| **File** | `.github/workflows/deploy.yml` |
| **Triggers** | `push` to `main`, plus manual `workflow_dispatch` |
| **Permissions** | `contents: read`, `pages: write`, `id-token: write` |
| **Concurrency** | group `pages`, `cancel-in-progress: false` |
| **Environment** | `github-pages` |

Two jobs:

1. **`build`** (ubuntu-latest): checkout → setup `pnpm/action-setup` +
   `actions/setup-node@v4` (Node 22, pnpm cache) → `pnpm install --frozen-lockfile` →
   `pnpm docs:build` → upload `.vitepress/dist` via
   `actions/upload-pages-artifact@v3`.
2. **`deploy`** (needs `build`): `actions/deploy-pages@v4` to the `github-pages`
   environment.

No repository secrets are required — GitHub Pages identity is provided by the
`GITHUB_TOKEN`.

### Local docs commands

Because GitHub Pages serves the repo at a project path, `.vitepress/config.mts` sets
`base: '/docs/'` (matching the repo name). If you rename the repo, update `base`.

```bash
pnpm install
pnpm docs:dev        # dev server with HMR
pnpm docs:build      # production build into .vitepress/dist
pnpm docs:preview    # preview the built site
```

`package.json` pins `packageManager: pnpm@10.28.2` and `vitepress: ^1.6.3`.

## Contributing rules for these docs

- All content is Markdown under the section directories (`deploy/`, `reference/flows/`,
  etc.).
- Internal links are root-relative without `.md` or a locale prefix (e.g.
  `/deploy/sae-deployment`, `/reference/flows/design-job-lifecycle`).
- Keep real service names, ports, env vars, and script paths in sync with the backend.
- Never commit `node_modules/`, `.env`, or `.vitepress/dist/`.
- Push to `main` to publish; the site updates automatically.

## Next steps

- [SAE Deployment Runbook](/deploy/sae-deployment) — the manual two-phase flow.
- [Production Promotion & Rollback](/deploy/production) — how a proven image goes to
  production.
