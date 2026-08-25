---
layout: home

hero:
  name: "YuanZhu AI Docs"
  text: "From zero to hero"
  tagline: "The complete developer documentation for the YuanZhu AI interior-design WeChat mini program — frontend, backend, deployment and end-to-end reference."
  actions:
    - theme: brand
      text: Get Started
      link: /get-started/introduction
    - theme: alt
      text: Quick Start
      link: /get-started/quickstart
    - theme: alt
      text: REST API Overview
      link: /reference/rest-api

features:
  - icon: 🚀
    title: Get Started
    details: Understand what the product is, how the system is architected, and run the whole stack on your own machine in minutes.
    link: /get-started/introduction
  - icon: 📱
    title: Frontend
    details: Deep dive into the uni-app / Vue 3 mini program — pages, subpackages, repositories, data-source modes, and every key user flow.
    link: /frontend/overview
  - icon: 🧩
    title: Backend
    details: Deep dive into the FastAPI backend — API, ARQ workers, PostgreSQL, Redis, object storage, billing, reports and the AI provider layer.
    link: /backend/overview
  - icon: ☁️
    title: Deploy
    details: Run the local Docker Compose stack and deploy to Alibaba Cloud SAE — from first smoke test to production promotion and rollback.
    link: /deploy/local-stack
  - icon: 🔗
    title: Reference
    details: REST API overview, data model, configuration, and full end-to-end call chains for every open API — trace the data flow from button tap to response.
    link: /reference/rest-api
  - icon: 📚
    title: Contributing to Docs
    details: This site is built with VitePress and auto-deploys to GitHub Pages on every push. Learn how to edit, build and preview it.
    link: /get-started/faq
---

## What is YuanZhu AI?

YuanZhu AI is a **WeChat mini program** that uses generative AI to help home owners,
designers and renovation teams turn photos of rooms into professional interior-design
proposals and HTML reports.

The project is composed of three repositories under the `Orientation-CD` GitHub
organization:

| Component | Repository | Default branch | What it does |
| --- | --- | --- | --- |
| Frontend | [`wechat_mini_program`](https://github.com/Orientation-CD/wechat_mini_program) | `ui-integration` | uni-app + Vue 3 + TypeScript mini program |
| Backend | [`YuanZhu-AI`](https://github.com/Orientation-CD/YuanZhu-AI) | `main` | FastAPI + ARQ + PostgreSQL + Redis backend |
| Docs | this repository (`docs`) | `main` | The documentation you are reading now |

## How the docs are organized

- **Get Started** — no background assumed. Learn the product, the high-level
  architecture, and run the full stack locally.
- **Frontend** — everything about the mini program: tech stack, pages and
  subpackages, the repository layer, build modes, and key user flows.
- **Backend** — everything about the API service: modules, workers, the
  database, object storage, Redis, billing, reports and the AI provider layer.
- **Deploy** — how to run locally with Docker Compose and how to deploy to
  Alibaba Cloud SAE, including CI/CD and production safeguards.
- **Reference** — the API surface and full end-to-end call chains: for every
  open API you can trace exactly what happens from the user tapping a button in
  the mini program to the final response, including every intermediate hop
  (Redis, workers, providers, database, WeChat).

> **Reading order.** If you are new to the project, start at
> [Introduction](/get-started/introduction), then follow
> [Architecture Overview](/get-started/architecture), then the **Quick Start**.
> After you have the stack running, explore Frontend and Backend. Use
> **Reference** whenever you want to understand a specific API or data flow in
> depth.
