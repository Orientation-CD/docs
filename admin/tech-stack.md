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

---

Source evidence · backend `b13cc566`: [app/admin/__init__.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/__init__.py) · [app/admin/dependencies.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/admin/dependencies.py) · [app/core/configuration/config_export.py](https://github.com/Orientation-CD/YuanZhu-AI/blob/b13cc5668920620a274cb91a3393ed9fadac72ae/app/core/configuration/config_export.py).
