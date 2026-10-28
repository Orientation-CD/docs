# What this frontend/backend pair supports

This map describes the [audited commits](/reference/source-revisions), not a deployment acceptance report. The branches advance independently. Read it before choosing an end-to-end exercise.

## Capability map

| Domain | Frontend evidence | Backend main evidence | Learning boundary |
| --- | --- | --- | --- |
| Images, voice, copywriting, reports | Pages, repositories, polling and result presenters | Typed routes, admission, workers and publication | Follow the domain chains; active configuration still controls availability |
| Script/same-style video | Script, managed-template and uploaded-reference modes | Script/prompts union, Video Assets, validation and local execution | [Video](/backend/video); UI limits, API limits and provider acceptance differ |
| Enterprise dashboard | Member cards and filtered project/plan views | Owner overview and read-only Workflow detail | [Projects](/frontend/projects); enterprise ownership grants no edit rights over another creator's work |
| Monthly member Tokens | No callers of the three quota APIs in this frontend (neither editor nor self-read) | Three quota routes and ledger/admission enforcement | [Quota API chain](/reference/flows/member-quota-flow); do not invent an existing button |
| Floor-plan editor/render/panorama | Dedicated pages, APIs and candidate OpenAPI fixtures | **No dedicated floor-plan routes or implementation in this main** | [Frontend floor plans](/frontend/floor-plans) explains the client and missing server boundary |
| Themes/package limits | Theme engine, generated assets and budget gates; settings switch currently hidden | Client presentation | [Design system](/frontend/design-system), [tests](/frontend/testing) |
| Performance | Backend-served Studio Control | Versioned observations, Redis history, reports and authenticated UI | [Performance](/admin/performance); missing coverage is not zero or proof of improvement |

## Four different kinds of validation

1. **Frontend Mock** can render successfully without FastAPI.
2. A **candidate fixture check** checks client JSON against a captured candidate schema, not deployed `main`.
3. A **local real-API loop** reaches FastAPI, SQL, Redis and storage; payment/model services can still be simulated.
4. **Deployed provider acceptance** proves a particular image, configuration, environment and real provider behavior. Source/unit tests cannot establish it alone.

The existing colored-floor-plan **image Feature** is distinct from the new model/editor/render/panorama system. A similar name does not make the new APIs available.

## Current interface and new integrations

Current non-copywriting submissions still commonly use `/v1/design-jobs`; copywriting and some other operations use `/v1/workflows`. Supported aliases enter the current workflow implementation. Source-reading guides identify the actual button request; new integrations use canonical Workflows. Do not change an uncertain action's URL, body or key during replay. See [compatibility](/reference/compatibility).

Source: [documents/REST_API_INTERFACE.md](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/documents/REST_API_INTERFACE.md) · [src/services/useFeatureLauncher.ts](https://github.com/Orientation-CD/wechat_mini_program/blob/21db6d824a7b32417bda88e7e31d3f0b91dfa51c/src/services/useFeatureLauncher.ts) · [app/api/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/api/__init__.py) · [app/workflows/api.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/api.py)
