# MCP policy in production profile

When **`LAB_PRODUCTION_PROFILE=1`**, tool execution passes an extra gate in `mcp-utils.ts` → `evaluateMcpProductionPolicy()` (`src/backend/utils/mcp-production-enforcer.ts`).

## Role matrix (D-03)

| Category | Tools (examples) | Who can run |
|----------|------------------|-------------|
| Admin-only | `run_terminal_command`, `app_management_execute_raw` | `owner`, `admin` |
| Code / app change | `create_file`, `update_file_*`, `app_management_*` CRUD, `documentor_*` | `owner`/`admin` **or** member+ with **`user_app_permissions.canUpdate`** on target app |
| UI automation | `ui_automation_*` | All roles (persona tool allowlist still applies) |
| HTTP MCP | External streamable-http servers | All roles |
| Stdio MCP | User-configured stdio servers | **owner/admin**, or **approved allowlist** (Settings → request → admin approve) when `LAB_PRODUCTION_PROFILE=1` |

Target app id is resolved from tool params (paths under `src/apps/{app-id}/`, `app_management` `appId`, etc.).

## Related env

- `LAB_PRODUCTION_PROFILE=1` — enables this enforcer and `effectiveDeveloperMode()` → false for chat templates
- Not a substitute for persona tool allowlists or disabling dangerous MCP servers in Settings

## Tests

`src/tests/backend/mcp-production-enforcer.test.ts`

## Deploy verification

See [production-deploy-checklist.md](../operations/production-deploy-checklist.md) MCP section.
