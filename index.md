---
layout: home
hero:
  name: YuanZhu AI Docs
  text: Understand, build and operate
  tagline: Code-backed guides for the WeChat and Douyin mini programs, Workflow backend and operations console.
  actions:
    - theme: brand
      text: Start on macOS
      link: /get-started/macos-setup
    - theme: alt
      text: Run the first local task
      link: /get-started/quickstart
    - theme: alt
      text: API reference
      link: /reference/rest-api
features:
  - icon: 🧭
    title: Get started
    details: Learn the product and terminal basics, preview Mock UI, then verify a persistent local API task.
    link: /get-started/introduction
  - icon: 📱
    title: Frontend
    details: Platform builds, feature groups, copywriting, video, reports, projects and read-only collaboration.
    link: /frontend/overview
  - icon: 🧩
    title: Backend
    details: Domain modules, Workflows and Operations, assets, identities, billing, storage and background execution.
    link: /backend/overview
  - icon: 🛠️
    title: Administration
    details: Configure models, Workflow nodes, Features, entitlements, billing, legal documents and operational diagnostics.
    link: /admin/overview
  - icon: ☁️
    title: Deploy and test
    details: Run owned local stacks, verify storage environments, and follow cloud release, migration and recovery procedures.
    link: /deploy/local-stack
  - icon: 🔗
    title: Reference
    details: Current API contracts, environment settings, data models and traceable end-to-end flows.
    link: /reference/rest-api
---

## Choose a route

New to development? Start with [macOS setup](/get-started/macos-setup). [Quick Start](/get-started/quickstart) moves through six checkpoints, from a frontend-only Mock preview to registration, local mock settlement and a completed task persisted by the real local server. It identifies required private dependency/configuration access before Docker builds.

For implementation work, read [System architecture](/get-started/architecture), [Frontend](/frontend/overview) or [Backend](/backend/overview). Operators can enter [Admin](/admin/overview) or [Deployment](/deploy/local-stack). Use search for a feature key, route, environment variable or error, and follow each page's pinned source evidence when checking behavior.

## Product and documented baseline

YuanZhu AI (装易装AI) supports design/renovation images, recording summaries, customized design, video, eight copywriting/Q&A forms and Workflow-based design reports. Projects and enterprise views organize plans and member activity. Availability, prices, entitlements and rollout switches are deployment-specific server configuration.

| Repository | Working branch | Documented source |
| --- | --- | --- |
| [wechat_mini_program](https://github.com/Orientation-CD/wechat_mini_program) | `ui-integration` | `eca0a5f` |
| [YuanZhu-AI](https://github.com/Orientation-CD/YuanZhu-AI) | `main` | `b13cc56` |
| [docs](https://github.com/Orientation-CD/docs) | `main` | This bilingual documentation site |

The content was checked on **2026-10-20**. Implementation in a branch does not prove a feature is enabled or has passed device/production acceptance. Current public product API paths begin with `/v1`; source evidence distinguishes client UI limits from wider backend contracts.

## Source evidence

[Frontend feature groups](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/featureGroups.ts) · [Frontend commands](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/package.json) · [Backend contracts](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py) · [Local runbook](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/runbook.md).
