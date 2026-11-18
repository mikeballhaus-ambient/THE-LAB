# CRM security and roles (Phase C)

CRM hybrid server routes currently **do not enforce THE-LAB platform roles** on entity admin, form bindings, or connector CRUD. Authentication for app servers follows the same pattern as other hybrid apps (open CORS in dev; no per-request `RoleManager` check yet).

## Planned (§7 architecture)

| Action | Intended role |
|--------|----------------|
| Edit entity definitions / delete custom entities | **admin** (owner/admin) |
| Change form bindings | **admin** |
| Create/edit/delete records via UI or connector | **member**+ |
| View records | **viewer**+ |

## Implementation notes for a future pass

1. Propagate lab session or API token from dashboard when calling `serverUrl` (port **3010**).
2. Add Fastify preHandler on `/api/entities/definitions` (POST/DELETE/PUT) and `/api/form-bindings`.
3. Keep connector open for Forms Builder submit only from trusted Forms Builder server origin, or use connector secrets.

Until then, treat CRM as **single-tenant / trusted lab environment** only.

See [crm-system-architecture.md §7](../../../plans/crm-app/crm-system-architecture.md#7-security-and-roles).
