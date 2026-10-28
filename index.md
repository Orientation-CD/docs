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
      text: Follow the code end to end
      link: /reference/system-walkthrough
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
    title: Follow the complete call chain
    details: Trace every public API from its real UI or external trigger through handlers, workers, transactions and stored results, with diagrams and code maps.
    link: /reference/system-walkthrough
---

## Choose a route

New to development? Start with [macOS setup](/get-started/macos-setup). [Quick Start](/get-started/quickstart) moves through six checkpoints, from a frontend-only Mock preview to registration, local mock settlement and a completed task persisted by the real local server. It identifies required private dependency/configuration access before Docker builds.

For implementation work, read [System architecture](/get-started/architecture), [Frontend](/frontend/overview) or [Backend](/backend/overview). Operators can enter [Admin](/admin/overview) or [Deployment](/deploy/local-stack). Use search for a feature key, route, environment variable or error, and follow each page's pinned source evidence when checking behavior.

## Product and documented baseline

YuanZhu AI (装易装AI) supports design/renovation images, recording summaries, customized design, video, eight copywriting/Q&A forms and Workflow-based design reports. Projects and enterprise views organize plans and member activity. Availability, prices, entitlements and rollout switches are deployment-specific server configuration.

| Repository | Working branch | Documented source |
| --- | --- | --- |
| [wechat_mini_program](https://github.com/Orientation-CD/wechat_mini_program) | `ui-integration` | `3662578` |
| [YuanZhu-AI](https://github.com/Orientation-CD/YuanZhu-AI) | `main` | `e59716c` |
| [docs](https://github.com/Orientation-CD/docs) | `main` | This bilingual documentation site |

The content was checked on **2026-10-28**. Implementation in a branch does not prove a feature is enabled or has passed device/production acceptance. Current public product API paths begin with `/v1`; source evidence distinguishes client UI limits from wider backend contracts.

## Source evidence

[Frontend feature groups](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/src/services/featureGroups.ts) · [Frontend commands](https://github.com/Orientation-CD/wechat_mini_program/blob/3662578b384fd5b0fbe7509229b2a08a6fe44ab9/package.json) · [Backend contracts](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/models.py) · [Local runbook](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/scripts/runbook.md).

## Audited integration boundary

The frontend has new design/theme/dashboard work and candidate floor-plan APIs; backend main adds same-style video, input archival, member quotas and performance history. Read [what is actually aligned](/reference/integration-status) before choosing a full-stack exercise.
