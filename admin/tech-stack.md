# Administration implementation

Studio Control is part of the Python backend. FastAPI/Starlette handle routing, signed sessions and forms; Jinja templates render HTML; the shared CSS and vanilla JavaScript add live search, partial refreshes, dialogs, graph layout and mutation feedback. There is no separate React application or administrator JWT API.

## Ownership

| Location in backend | Responsibility |
| --- | --- |
| `app/admin` | Domain handlers, authorization, cache and view projections |
| `app/templates/admin` | Page templates, partials, navigation and bilingual presentation |
| `app/static/admin.js`, `admin.css` | Browser interactions and shared layout |
| `app/static/admin-language.js` | Browser language selection |
| `app/identity/admin_sessions.py` | Single active Redis session per admin |

Admin HTML routes are excluded from public OpenAPI. They are authenticated browser contracts; the internal marketing JSON and performance live JSON are not customer API endpoints. Form mutations verify CSRF and business constraints, and configuration changes use versions/generations to reject stale writes.

Lists use bounded server-side pagination/search. Partial updates must preserve form/search/scroll context and accessible status messages. When modifying these interactions in the backend, follow its browser-test policy; a Git push alone does not update a running preview.

The backend exposes `/admin/configuration/export` for an authorized deployment snapshot. Configuration import/export is broader than prompt archive replacement and must preserve secrets/compatibility boundaries. Keep the canonical tooling documentation in the backend; the docs site itself is a separate VitePress project.

## SDK activation has a prepare/commit boundary

[admin_activate_three_vjia_sdk](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/three_vjia_sdk.py) first authenticates and checks CSRF, then prepares the release contract and account installation without retaining a database session checkout across catalog/storage/Redis work. It checks displayed configuration generation and credential revision, takes the release/configuration locks for short database activation, rechecks admin and commits. `SDK_CONFIGURATION_CHANGED` requires reload/reconciliation. The post-commit process notification is a prewarm hint: its failure cannot turn a committed activation into a failed save. Keep browser controls and backend generation checks together when changing this UI.

---

Source evidence · backend `749e82df`: [app/admin/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/__init__.py) · [app/admin/dependencies.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/admin/dependencies.py) · [app/core/configuration/config_export.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/749e82df3a51c441335ba6a4db607a98bacbcf97/app/core/configuration/config_export.py).
