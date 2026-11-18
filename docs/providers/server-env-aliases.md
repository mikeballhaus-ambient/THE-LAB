# Server environment naming (IMPLEMENTATION-PLAN 1.28)

Some backend modules read **`VITE_*` prefixed variables** for historical reasons (shared with frontend build). Prefer the non-`VITE_` alias when setting production env.

| Purpose | Preferred (server) | Also read |
|---------|-------------------|-----------|
| Context7 (when used from backend MCP) | `CONTEXT7_API_KEY` | `VITE_CONTEXT7_API_KEY` (see context7 MCP server) |

**Code references**

- Deploy checklist: [production-deploy-checklist.md](../operations/production-deploy-checklist.md)

Set both aliases during migration if older compose files only define `VITE_*` keys.
