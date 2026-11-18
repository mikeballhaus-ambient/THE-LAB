# Task list host-app scope (`app_id`)

Task lists can be owned by a THE-LAB host app via `task_lists.app_id`.

| `app_id` | Visible in Task List UI | Scoped API (`?appId=`) |
|----------|-------------------------|-------------------------|
| `NULL` / empty | Yes | No |
| `app-lab-crm` | No | `GET /api/app-scoped/task-lists?appId=app-lab-crm` |

## Migration

On server startup, `runTaskListDbBootstrap()` adds `app_id` if missing (see `back-end/db/bootstrap.ts`).

## Connectors (Forms Builder)

- Default connector traffic uses **native scope** (`app_id` null) — personal Task List forms unchanged.
- Optional header `X-Host-App-Id: app-lab-crm` for future CRM form submits (Track B).

## Manual QA (Track A)

```http
POST /api/app-scoped/task-lists
Content-Type: application/json

{ "appId": "app-lab-crm", "name": "CRM Tasks", "description": "Isolated list" }
```

```http
GET /api/app-scoped/task-lists?appId=app-lab-crm
GET /api/app-scoped/tasks?appId=app-lab-crm
```

Confirm the list does **not** appear in the Task List app UI or `GET /api/task-lists`.
