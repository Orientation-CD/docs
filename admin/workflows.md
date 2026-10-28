# Configure Workflow nodes

`/admin/workflows` shows product-backed Workflow cards and their input/node/output graph. It is an execution configuration view, not an arbitrary graph editor. Graph structure, port contracts and Operations are code-owned.

## Change a model

1. Expand the Workflow's Manage/details section.
2. Read availability reasons and open the configurable node.
3. Choose a compatible model and save with the displayed generation.
4. Check the refreshed availability and corresponding [Feature/plan permissions](/admin/billing).

The edit applies only to that node in that Workflow. A shared Operation can be reused without a global model switch affecting all consumers. Local converter nodes show their local executor; they do not need an external provider model. The historical standalone PPTX Workflow is not presented as a normal new product card.

Model choices, saves, imports and admission share the input/output modality intersection rule. Missing node configuration, unavailable/archived models or incompatible declarations make a Workflow unavailable. Configure the source model in [Model Providers](/admin/providers); there is no Operation grant checkbox to repair.

## Commercial and historical behavior

Feature activation and subscription permissions are separate from node selection. A configured Workflow without an active entitled Feature is not automatically a customer product. Accepted tasks preserve their frozen graph and provider snapshot; changing the node affects new admissions rather than rewriting running work.

The old `/admin/operations` GET remains an alias of this view, while global Operation-settings writes return `410 OPERATION_GLOBAL_SETTINGS_RETIRED`. Use per-Workflow node settings. Current report, voice, copywriting, image and local video execution all follow this separation; see [backend Workflows](/backend/workflows).

---

Source evidence · backend `e59716c8`: [app/admin/workflows.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/admin/workflows.py) · [app/workflows/workflow_configuration.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/workflow_configuration.py) · [app/templates/admin/workflow_views.html](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/templates/admin/workflow_views.html).
