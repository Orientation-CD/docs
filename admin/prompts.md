# Prompt templates and complete-library import

`/admin/prompts` searches template names, descriptions and prompt text, and supports create/edit, activation, removal and JSON export/import. Templates are used by image, summary, report and copywriting flows; they are not an obsolete report-layout editor.

## Template contract

A unique template name identifies optional system, configurable and negative sections; at least one section must be present. Configurable placeholders have exact field definitions using `key | example value` rows. The server validates placeholder/field agreement, bounds lengths and rejects more than one selected system prompt in a composed request.

Customers discover active templates, then send exact field name/value selections. The backend stores the accepted composed text. Subsequent admin edits, deactivation or import do not alter prompts already frozen on accepted tasks or their retries.

## Export before replacement

**Import replaces the entire prompt library after the complete JSON archive passes validation.** It is not an incremental merge and there is no UI undo. Export a backup, preserve all existing entries/edits, add or change the intended templates in the complete archive, then import that archive. The input limit is 1,000,000 bytes.

Copywriting startup already creates missing seed templates without overwriting existing ones. Do not import its eight-template sample alone into a populated deployment. Editing the checked-in initial JSON also does not overwrite database-authoritative deployed templates. See [copywriting setup](/backend/copywriting).

Personal prompt presets are a separate customer feature managed through `/v1/prompt-presets`; they are not admin template definitions. Report generation prompts also differ from the removed raw HTML/Jinja report-template editor. Configure report execution in [Workflows](/admin/workflows).

---

Source evidence · backend `b13cc566`: [app/admin/prompts.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/prompts.py) · [app/prompts/prompt_templates.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/prompts/prompt_templates.py) · [documents/ai_copywriting_setup.md](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/documents/ai_copywriting_setup.md).
