# OpenAPI

The backend is built on FastAPI, so every endpoint ships with an **automatic,
always-current OpenAPI specification**. This page explains where to find it and
how the frontend uses it to stay in sync.

## The live spec

With the backend running, FastAPI serves:

| URL | Content |
| --- | --- |
| `<api-origin>/openapi.json` | The machine-readable OpenAPI document |
| `<api-origin>/docs` | Swagger UI (interactive, try endpoints) |
| `<api-origin>/redoc` | ReDoc (alternative viewer) |

Locally: `http://localhost:9090/docs`.

## What it contains

- Every route under `/api/v1` with its method and path.
- **Request bodies** and **response schemas** derived from `app/models.py`
  (Pydantic) — exact field names, types, required flags.
- **Query parameters**, **path parameters**, auth requirements.
- Error contract conventions (FastAPI `detail`).

This is the **authoritative contract** — when in doubt, read it from
`/docs` rather than guessing from this documentation.

## How the frontend stays in sync

The mini program does **not** use a generated SDK at runtime. Instead, the repo
pins itself to the contract through checks (see
[Frontend → Testing](/frontend/testing)):

- `scripts/check-openapi-snapshot.mjs` — a committed **OpenAPI snapshot** is
  compared against the expected contract.
- `scripts/check-api-dtos.mjs` — `src/api/dto/*` (TypeScript DTOs) must match.
- `scripts/check-contract-fixtures.mjs` — fixtures match.

When the backend contract changes, a developer regenerates the snapshot:

```bash
pnpm openapi:update     # in the frontend repo
```

and commits the updated snapshot + DTOs together with the backend change. CI
then enforces parity.

## Generating a client (optional)

If you want a typed client for other consumers (e.g. a Node service, Postman,
or OpenAPI generators), you can:

1. Start the backend.
2. Download `openapi.json`.
3. Feed it to your favourite generator (e.g. `openapi-generator`, Postman
   import, or `openapi-typescript` for TS types).

The project's own mini program keeps hand-maintained DTOs + contract checks
instead, which keeps the compiled bundle small and explicit.

## Endpoint map

For a human-readable map of every endpoint with links to full call chains, see
[REST API Overview](/reference/rest-api).

## Next steps

- [REST API Overview](/reference/rest-api)
- [Data Model](/reference/data-model)
- [Configuration Reference](/reference/configuration)
