# YuanZhu AI Docs

The official documentation for the **YuanZhu AI** project — the WeChat mini
program for AI interior design, its backend and its deployment.

Built with [VitePress](https://vitepress.dev), auto-deployed to **GitHub Pages**
on every push to `main`.

## Live site

`https://orientation-cd.github.io/docs/`

## Project overview

| Component | Repository | Branch |
| --- | --- | --- |
| Frontend (mini program) | [wechat_mini_program](https://github.com/Orientation-CD/wechat_mini_program) | `ui-integration` |
| Backend (FastAPI) | [YuanZhu-AI](https://github.com/Orientation-CD/YuanZhu-AI) | `main` |
| Docs (this repo) | `docs` | `main` |

## Local development

```bash
pnpm install
pnpm docs:dev        # dev server with HMR
pnpm docs:build      # production build into docs/.vitepress/dist
pnpm docs:preview    # preview the built site
```

## Editing content

All documentation is Markdown at the repo root, organized by section:

- `get-started/` — introduction, architecture, quick start, glossary, FAQ
- `frontend/` — the mini program deep dive
- `backend/` — the FastAPI backend deep dive
- `deploy/` — local + Alibaba Cloud SAE deployment
- `reference/` — REST API, data model, configuration, and end-to-end call chains

### Structure conventions

- Every section has an `overview` page that introduces the topic and links to
  sub-pages.
- Reference flow pages trace the **full call chain** from the mini program
  through the backend (Redis, workers, providers, DB, storage) to the response.
- When you add a page, register it in `.vitepress/config.mts` (nav + sidebar).

### Publishing

Push to `main` — GitHub Actions builds and deploys automatically. No manual
deploy step.

## License

Internal team documentation.
