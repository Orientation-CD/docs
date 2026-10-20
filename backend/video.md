# Video generation

The `video_generation` Workflow uses the local `render_video` Operation backed by the packaged private jinqiu pipeline. It returns an MP4 through the standard typed Workflow output and does not use ordinary provider-model routing for this local executor.

## Inputs

| Port | Requirement |
| --- | --- |
| `script` | Scalar script, at most 20,000 characters |
| `character_image` | Exactly one image, role `primary` |
| `scene_images` | Zero to twelve images, role `reference` |
| `recording` | Optional single audio Asset, role `recording` |

Upload/complete Assets first, then send the exact port/role structure with the script fields defined in [REST API](/reference/rest-api). The server checks content, ownership and frozen identity. Do not submit temporary provider URLs or arbitrary storage keys.

## Models and charging

The backend's `VIDEO_MODEL_SELECTION_ENABLED` setting controls whether discovery offers the full supported video model list. When disabled the local/test default is `Doubao-Seedance-2.0-mini`. Discover current choices and prices; do not duplicate the model price table in a client. Platform Token pricing is separate from the supplier's real credit consumption.

Submission, polling, history, explicit retry, move and deletion use [canonical Workflows](/backend/workflows). The requested workspace pays; work is reserved and finally settled/released through the normal ledger.

## Execution and operations

Video has long-running parse/generation/export stages, a render lease, output-size limits, spool space and upload deadlines. `video_render_budget_seconds` derives a bounded wall-clock budget from scene count and stage budgets. Use returned progress estimates and poll hints; a healthy API does not prove supplier capacity.

The submit worker runs the local video task; reconciliation and reservation cleanup recover eligible failures. Late/stale attempts cannot publish over the current generation. An uncertain external paid action must follow the persisted retry classification, not an unconditional automatic rerender.

Image builds require the documented private supplier Git access. The supplier is built into the application image; a rebuild can follow its default branch, so record the built supplier revision with release evidence. See [local stack](/deploy/local-stack), [configuration](/reference/configuration) and [observability](/backend/observability).

---

Source evidence · backend `b13cc566`: [app/workflows/operations/video/workflow_video_definition.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/video/workflow_video_definition.py) · [app/workflows/operations/video/workflow_video_execution.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/workflows/operations/video/workflow_video_execution.py) · [scripts/runbook.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/scripts/runbook.md).
