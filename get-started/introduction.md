# What you can learn and run

圆筑 AI / 装易装AI helps renovation teams turn requirements and design materials into images, text, videos and presentation reports. The uni-app frontend builds WeChat and Douyin mini programs; FastAPI and its workers own identity, execution, storage and billing.

Start with the [integration status](/reference/integration-status). These docs audit independently changing branches: an implemented screen, an OpenAPI fixture and a capability available from backend `main` are different evidence.

## Follow the current interface

| Entry | What to look for in code |
| --- | --- |
| Home → AI设计 | Light/professional design landing pages, `featureGroups` and the Feature launcher |
| AI轻盈设计 | Interior/furniture/colored-plan work, voice summaries, customized design, reports and renovation |
| AI专业设计 | Floor-plan editing, rendering, works and panorama frontend; its dedicated backend is **absent from the audited main** |
| AI创作 | Script video, same-style video, copywriting and configured creation entries |
| Projects | Personal projects and an enterprise member dashboard; owner read-only views have a distinct permission boundary |
| Account and membership | Login/consent, workspace selection, subscriptions, Tokens, orders and invitations |

Labels, cards and themes are client presentation. Server discovery, active templates, entitlement and wallet checks determine what an actual submission can run. A route alone does not prove a model or paid provider is configured.

## Pick a learning route

- **First time using code:** [macOS setup](/get-started/macos-setup) → [first local workflow](/get-started/quickstart). Start with frontend Mock, then connect a real local API using simulated external services.
- **Understand a button:** [source-reading walkthrough](/reference/system-walkthrough) → domain chain → pinned function. Follow Job and Asset identities across processes.
- **Frontend:** [code map](/frontend/overview), [design system](/frontend/design-system) and [floor-plan boundary](/frontend/floor-plans).
- **Backend:** [architecture](/backend/architecture), [admission](/reference/flows/design-job-lifecycle), [input archival](/reference/flows/asset-upload-flow) and [member quota](/reference/flows/member-quota-flow).
- **Operations:** [Admin](/admin/overview), [performance evidence](/admin/performance) and [release/recovery](/deploy/production).

## Repositories

| Repository | Branch | Responsibility |
| --- | --- | --- |
| `Orientation-CD/wechat_mini_program` | `ui-integration` | UI, local state, platform adapters and API repositories |
| `Orientation-CD/YuanZhu-AI` | `main` | FastAPI, workers, database, private storage and administration |
| `Orientation-CD/docs` | `main` | Bilingual learning guides, source maps and checks |

The [source record](/reference/source-revisions) pins full commits. Examples describe this pair, not an arbitrary deployment or an unmerged feature branch. Exposed adapters are explained in the [compatibility reference](/reference/compatibility); new integrations follow the canonical Workflow contract.

Source: [src/services/featureGroups.ts](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/services/featureGroups.ts) · [app/core/models.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/core/models.py)
