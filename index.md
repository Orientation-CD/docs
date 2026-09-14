---
layout: home

hero:
  name: "YuanZhu AI Docs"
  text: "From zero to hero"
  tagline: "The complete developer documentation for the YuanZhu AI interior-design WeChat mini program — frontend, backend, Admin console, deployment and end-to-end reference."
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
    details: Deep dive into the FastAPI backend — API, ARQ workers, PostgreSQL, Redis, object storage, billing, reports and the multi-provider AI layer.
    link: /backend/overview
  - icon: 🛠️
    title: Admin Console (Studio Control)
    details: The operations console for product and ops — dashboard, users, workspaces, billing, campaigns, prompts, report templates, and the model-provider catalog.
    link: /admin/overview
  - icon: ☁️
    title: Deploy
    details: Run the local Docker Compose stack and deploy to Alibaba Cloud SAE — from first smoke test to production promotion and rollback.
    link: /deploy/local-stack
  - icon: 🔗
    title: Reference
    details: REST API overview, data model, configuration, and the OpenAPI surface for the backend service.
    link: /reference/rest-api
  - icon: 🧭
    title: End-to-End Call Chains
    details: Full traceable data flows — login, design-job lifecycle, asset upload, payments, reports and workspaces — from button tap to database and provider.
    link: /reference/flows/wechat-login-flow
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
  database, object storage, Redis, billing, reports, workspaces and the AI provider layer.
- **Admin Console (Studio Control)** — the operations web app: dashboard and alerts,
  users and accounts, workspaces, billing and tokens, campaigns, marketing, finance,
  performance, design jobs, assets, legal documents, prompt and report templates, and
  the model-provider catalog.
- **Deploy** — how to run locally with Docker Compose (per-developer parallel stacks)
  and how to deploy to Alibaba Cloud SAE, including CI/CD, namespace-safe tooling,
  migration credential separation and production safeguards.
- **Reference** — the API surface: REST overview, data model, configuration reference,
  and OpenAPI.
- **End-to-End Call Chains** — for every open API you can trace exactly what happens
  from the user tapping a button in the mini program to the final response, including
  every intermediate hop (Redis, ARQ workers, providers, database, WeChat).

> **Reading order.** If you are new to the project, start at
> [Introduction](/get-started/introduction), then follow
> [Architecture Overview](/get-started/architecture), then the **Quick Start**.
> After you have the stack running, explore Frontend and Backend. Use the
> **Admin Console** section when operating the product, **Deploy** when shipping to the
> cloud, and **Reference / End-to-End Call Chains** whenever you want to understand a
> specific API or data flow in depth.
