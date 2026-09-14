# Prompt Templates

The Prompts page at `GET /admin/prompts` (template `app/templates/admin/prompts.html`) manages the prompt templates sent to model providers. A template bundles a system prompt, a body template with `{{variables}}`, an optional negative prompt, and a set of configurable variables that surface as choices in the mobile app.

## Listing

Live search over name/description, paginated at 50.

| Column | What it shows |
| --- | --- |
| Template | Name + description. |
| Prompt types | Badges: System / Configurable / Negative (which parts are present). |
| Configurable fields | The variable keys this template exposes. |
| Status | Active / inactive. |
| Updated | Last modified time. |

## Create / edit

- New: `GET /admin/prompts/new`, then submit `POST /admin/prompts`.
- Edit: `GET /admin/prompts/{id}/edit`, then submit `POST /admin/prompts/{id}`.

Form (`app/templates/admin/prompt_form.html`):

| Field | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| Name | text | Yes | Unique, immutable public id used by providers to select the template. Set once. | — |
| Description | text | No | Internal note. | — |
| System prompt | textarea | No | `system_prompt` sent as the system message. | empty |
| Template text | textarea | Yes | `template_text` body; use `{{variable_key}}` placeholders. | — |
| Negative prompt | textarea | No | `negative_prompt` for image models that support it. | empty |
| Variable specification | textarea | Yes | JSON describing variables and their options (see below). | — |
| Is active | checkbox | No | Off = template not offered to providers. | on |

### Variables & options (`PromptVariable`, `PromptOption`)

The variable-spec JSON declares, per variable:

| Property | Meaning |
| --- | --- |
| `key` | Placeholder name used in `template_text` (unique per template). |
| `label` | Human label shown in the app. |
| `required` | Whether the variable must be supplied. |
| `default_value` | Optional fallback. |
| `sort_order` | Display order. |
| `options` | Optional list of allowed choices, each with `value`, `label`, `sort_order` (`PromptOption`). When present, the app shows a constrained picker instead of free text. |

Variables are ordered by `sort_order`; options by their own `sort_order`.

## Actions

- **Toggle active** (`POST /admin/prompts/{id}/toggle`) — enable/disable without editing.
- **Remove** (`POST /admin/prompts/{id}/remove`) — deletes the template and its variables/options (cascade).

## Import / export archive

- **Export** (`GET /admin/prompts/export`) — downloads all active templates and their variables/options as a JSON archive.
- **Import** (`POST /admin/prompts/import`) — uploads a previously exported archive. This is a **destructive, replace-style** operation validated by `parse_prompt_archive`; use it to move templates between environments. The import dialog is opened from the "Import" button.

## How providers use prompts

When a design job runs, the provider layer selects the active template by name, substitutes the customer's chosen variable values (and defaults), and sends the assembled system + body + negative prompt to the configured model. Keep template names stable across environments because they are the coupling key between job types and prompts.
