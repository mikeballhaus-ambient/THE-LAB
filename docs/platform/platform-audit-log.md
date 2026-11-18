# Platform audit log (rm-46 **5.5**)

Administrative changes are appended to **`platform_audit_log`** in the main SQLite database (`db/the_lab.db`).

## Categories

| Category | Examples |
|----------|----------|
| `user` | Role change, user delete (Settings / user management socket handlers) |
| `app` | App create, update, delete via **App Management** MCP tools |
| `mcp_server` | Add, update, remove, toggle MCP server configuration from Settings |

## Query (operator)

```sql
SELECT id, actor_user_id, category, action, target_type, target_id, created_at
FROM platform_audit_log
ORDER BY id DESC
LIMIT 50;
```

Details JSON is in **`details_json`** when present.

## Related

- Structured audit mirror events: enable **`LAB_STRUCTURED_LOGS=1`** (see **5.6**).
- Backup includes main DB via **`npm run backup:lab`**.
