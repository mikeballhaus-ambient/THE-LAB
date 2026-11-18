# Persona allowed tools

Each persona’s MCP tool allowlist is defined in:

`src/backend/db/Persona/persona-tools-config.json`

On main database bootstrap/initialize, that file is read and permissions are seeded into SQLite.

## Regenerating the config

When new MCP tools are added to the platform, refresh the JSON manifest:

| Command | Effect |
|---------|--------|
| `npm run persona-tools-loader -- -b` | Build a **new** config file |
| `npm run persona-tools-loader -- -r` | **Regenerate** — adds new tools without overwriting existing allow/deny choices |

Script entry: `src/scripts/persona-tools-loader/persona-tools-config.ts`

After regenerating, restart the backend (or re-run persona DB init in dev) so personas pick up changes. Adjust per-persona toggles in **Settings → Personas** if needed.
