# AI copywriting

Eight Features share the text-only `copywriting` Workflow. They generate Markdown; **short-video scripts are text**, separate from [video rendering](/backend/video).

| Feature | Product |
| --- | --- |
| `copywriting_short_video` | Short-video script |
| `copywriting_xiaohongshu` | Xiaohongshu note |
| `copywriting_moments` | WeChat Moments copy |
| `copywriting_titles` | Titles and memorable lines |
| `copywriting_shooting` | Shooting suggestions |
| `copywriting_knowledge` | Renovation knowledge |
| `copywriting_pitfalls` | Pitfall guide |
| `copywriting_operations_experience` | Operations experience |

## Configure and submit

Startup creates missing records only: eight disabled Features, initial price 169 Tokens and editable templates. It does not choose a model, activate Features or grant subscriptions. Declare text input/output modalities, select a compatible `summary` node model in [Workflows](/admin/workflows), then manage pricing/access in [Billing](/admin/billing).

Submit `/v1/workflows` with the Feature `type`, explicit workspace, idempotency key and existing `prompts.prompts[].fields[]` name/value selections. Initial template names are `feature_{feature_key}`; active valid templates are discovered from `/v1/prompt-templates`. Omit `inputs` or send `[]`; this product does not accept image/audio Assets. Optional UI fields specified by the REST contract use literal `未提供` when blank.

The standard Markdown output contains `type: text`, `role: summary`, inline `text`, and a persisted Document Asset with signed URL. Use the normal history, retry and deletion APIs; render raw HTML and unsafe media disabled.

## Optional knowledge documents

The backend reads every case-insensitive `.md` object, including nested files, under `workspaces/{workspace_id}/kb/{feature_key}/`, sorted by object key. If that directory has no Markdown, it tries `workspaces/default/kb/{feature_key}/`. The two scopes are not merged; both empty means instruction-only generation.

Each selected file must be nonblank UTF-8 within 512 KiB. There is no file-count cap or truncation; the combined context still needs to fit the chosen model. Listing/read failures or invalid selected documents reject admission without creating work or reserving Tokens.

Prompts and original KB texts/version identities are frozen at admission. Each document follows the instruction as a separate original text input; filenames and storage paths are not added. Changes affect new tasks, not accepted tasks/retries. The former single-file `{feature_key}.md` location is retired for new work.

Use [Prompts](/admin/prompts) for deployed edits. Import replaces the **complete prompt library**; never import only the eight-template sample into a populated installation. Full fields and failure codes are in [REST API](/reference/rest-api).

---

Source evidence · backend `e59716c8`: [documents/ai_copywriting_setup.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/documents/ai_copywriting_setup.md) · [app/workflows/operations/summary/copywriting_definition.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/operations/summary/copywriting_definition.py) · [app/workflows/operations/summary/copywriting_kb.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/e59716c83e087deda8477da5ea7b327a40cf65c5/app/workflows/operations/summary/copywriting_kb.py).
