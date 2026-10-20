# Introduction

YuanZhu AI (装易装AI) helps renovation teams turn customer requirements, room photos and design results into images, text, videos and presentation reports. The same uni-app frontend builds **WeChat and Douyin mini programs**. Which capabilities a deployment offers comes from its server configuration; a screen in the source tree does not guarantee that capability is enabled.

## What users can do

| Area | Capabilities |
| --- | --- |
| AI design | Interior design, furniture try-on, colored floor plans, recording summaries, customized design and design reports |
| Renovation | Local, kitchen and bathroom renovation, grouped under AI design → old-house renovation |
| AI creation | Video creation and five copywriting forms: short-video scripts, Xiaohongshu notes, Moments posts, titles and shooting suggestions |
| AI Q&A | Renovation knowledge, pitfalls and operations experience, entered from the profile page |
| Projects and collaboration | Personal/enterprise workspaces, projects, plan lists, enterprise member overview and read-only member project activity |
| Account and billing | Registration, legal consent, subscriptions, Token packages, orders, ledger, seats and invitations |

The home screen has **AI设计** and **AI创作** group cards. Availability, membership permissions and prices still come from the backend. The former `html_report` flow remains for historical compatibility; the newer **设计报告** is a Workflow product with 9, 13 or 17 total pages.

## The repositories

| Repository | Working branch | Responsibility |
| --- | --- | --- |
| [wechat_mini_program](https://github.com/Orientation-CD/wechat_mini_program) | `ui-integration` | Vue 3, TypeScript, uni-app and uview-plus frontend |
| [YuanZhu-AI](https://github.com/Orientation-CD/YuanZhu-AI) | `main` | FastAPI, background workers, storage, account, billing and Admin |
| [docs](https://github.com/Orientation-CD/docs) | `main` | This bilingual VitePress site |

A repository is a versioned folder of source files. A branch is a named line of work inside that repository. These repositories can change independently; the source evidence at the end of each page identifies the version documented here.

## Choose a first route

- **No programming or terminal experience:** follow [macOS setup](/get-started/macos-setup), then [Quick Start](/get-started/quickstart). The first milestone needs no running backend.
- **Frontend work:** read [Frontend overview](/frontend/overview) and [Build and data modes](/frontend/data-source-modes).
- **Backend work:** start at [System architecture](/get-started/architecture) and [Backend overview](/backend/overview).
- **Product operations:** use [Admin overview](/admin/overview); local setup and cloud releases are in [Deployment](/deploy/local-stack).

The Quick Start first runs a frontend **Mock** build, then connects an **API** build to a real local service. That local service may use simulated identity, payment and model providers. These are distinct stages; a Mock UI demonstration is not evidence that server integration works.

## Source evidence

Documented against frontend `eca0a5f` and backend `b13cc56` (2026-10-20). [Frontend feature groups](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/featureGroups.ts) · [Workflow request types](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py).
