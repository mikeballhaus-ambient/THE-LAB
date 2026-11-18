# Neural Memory MCP (optional)

Optional Cursor MCP server for **cross-session recall** (`nmem_*` tools). Not required for THE-LAB development.

**Setup:** `pip install neural-memory`; enable **mcp-neuralmemory** in Cursor MCP settings (see [.env.example](../../.env.example) if applicable).

**Usage:** If enabled, agents may call `nmem_recap` / `nmem_recall` at session start and `nmem_remember` after significant decisions. **Repo docs win** when memory and markdown disagree — update `IMPLEMENTATION-TRACKER.md` or `AGENT-HANDOFF.md` for programme state.

**Authority for programmes:** `plans/{feature-id}/IMPLEMENTATION-PLAN.md` and `IMPLEMENTATION-TRACKER.md`, indexed from [AGENT-HANDOFF.md](../../AGENT-HANDOFF.md).
