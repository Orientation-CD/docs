# Features, Workflows and Result Contracts

The frontend supports both canonical `/v1/workflows` and compatible `/v1/design-jobs` requests. Choose the schema for the specific product; `assets`, explicit `inputs`, prompt fields and report blueprints are not interchangeable.

## Current frontend submissions

| Product | UI submission route | Important payload |
| --- | --- | --- |
| Standard images / furniture / customized design | `/v1/design-jobs` | `workspace_id`, `type`, `name`, `prompts`, verified `assets`; project/client data when applicable |
| Recording summary | `/v1/design-jobs` | `type: voice_summary`, verified recording `assets`; no image prompt requirement |
| Video | `/v1/design-jobs` | `type: video_generation`, `script`, explicit role/port `inputs`, optional advertised model |
| Eight copywriting/Q&A products | `/v1/workflows` | Exact `copywriting_*` type, template selection and fields, `inputs: []` |
| New design report | `/v1/workflows` | `design_report_9/13/17`, JSON blueprint, optional PPTX attachment |
| Historical HTML report | Legacy design-job compatibility | `html_report`; do not use it as the schema for new design reports |

The backend also exposes canonical schemas for other supported Workflows. This table records what this frontend version actually sends, not the entire public API. Every submission must preserve the accepted workspace/project and a stable `Idempotency-Key`; a `202` is admission only.

## Copywriting and AI Q&A

| Product key | UI title | Group |
| --- | --- | --- |
| `copywriting_short_video` | 短视频脚本 | Creative |
| `copywriting_xiaohongshu` | 小红书笔记 | Creative |
| `copywriting_moments` | 朋友圈文案 | Creative |
| `copywriting_titles` | 标题金句 | Creative |
| `copywriting_shooting` | 拍摄建议 | Creative |
| `copywriting_knowledge` | 装修知识 | Q&A |
| `copywriting_pitfalls` | 避坑指南 | Q&A |
| `copywriting_operations_experience` | 运营经验 | Q&A |

Each product maps to its exact `feature_copywriting_*` prompt template. Form controls are versioned in the frontend; authenticated template metadata must advertise the expected complete field set. Every field is sent once. UI-optional blanks become the literal `未提供`; required text is trimmed/nonempty and the current copywriting field limit is 4000 Unicode characters. The dependent short-video subtype resets when its parent category changes.

Execution prices come from discovered Features. Personal entitlement uses the advertised `allowed_features`; a visual group is not a permission wildcard. There is no generic `ai_copywriting` request type, media upload or browser-side model-provider call. Shooting suggestions produce text, not generated footage.

Completed Markdown uses inline output even when optional file metadata is absent. The result page formats safe Markdown/HTML, offers the applicable copy action and preserves unsupported markup as visible text. Server retry eligibility and current write access determine the retry action.

## Short-video script to AI video

A completed short-video script can be handed to AI video creation. Replacing a nonempty different draft script asks for confirmation and keeps other materials/settings. The receiving page still requires its own materials, entitlement and confirmation; importing text never submits or pays for a video automatically.

| Input | Current mini-program UI | Public backend schema |
| --- | --- | --- |
| Character composite image | Exactly one | Exactly one |
| Scene reference images | **Exactly one** | **Zero to twelve** |
| Script | Maximum 1000 characters | Maximum 20000 characters |
| Recording | Optional, at most one | Optional, at most one |

The UI's narrower scene limit follows the currently integrated supplier path; accepting a larger API inventory does not establish end-to-end multi-scene capability. Do not increase the UI limit by copying the API maximum. Upload-intent roles (`image`, `reference_image`) are mapped separately from task roles (`primary`, `reference`).

Video model choices and prices come from the catalog when the server enables selection. Otherwise the baseline is Doubao-Seedance-2.0-mini; the static frontend list is a validation/display aid, not pricing authority.

## New design reports

The form selects **8, 12 or 16 content pages**, producing **9, 13 or 17 total pages** and product keys `design_report_9`, `_13`, `_17`. It assembles a structured blueprint from project/customer information, a completed recording summary, a colored floor plan's original/result Assets and completed interior results from distinct spaces.

Source Assets must be valid and readable in the current scope. The blueprint maps them to page templates, can request style/material and lighting generation, and can reference configured gallery content. Current UI limits each interior result page to three images. Changing report size can require reselecting sources.

An optional attachment must be a `.pptx`, at most 104857600 bytes (100 MiB), uploaded and verified before submission. It is not a PDF/PPT input. A recovered draft revalidates attachment availability and permits replacement/removal. HTML results open only with fresh authorized access. The result viewer also recognizes supported PPTX task artifacts; public export capability and actual UI entry points must be distinguished.

## Failure and recovery

Keep input and the exact logical action after an uncertain POST response. Resolve authentication, subscription, balance, template changes or workspace/project loss through the corresponding UI action. Refresh expired result capabilities. Do not silently create a replacement task, change the payment workspace or infer completion from a native callback.

Read [Key flows](/frontend/key-flows), [Projects](/frontend/projects) and [API reference](/reference/rest-api) for surrounding behavior.

## Source evidence

Frontend `eca0a5f`, backend `b13cc56` (2026-10-20): [Actual route selection](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/repositories/designJobSubmit.ts) · [Copywriting controls](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/services/copywriting.ts) · [Report blueprint](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/services/reportBlueprint.ts) · [UI video validation](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-features/repositories/videoAssets.ts) · [Public video schema](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/models.py).
