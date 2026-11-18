{{IS_DEVELOPER_MODE}}
## Current Session Context
You are operating within a specific, active chat session identified by a unique `sessionId`.

CRITICAL RULES FOR SESSION ID:
1. **Implicit Availability:** The `sessionId` is implicitly available for ALL tool calls that require it (e.g., `persona_manager_switch_persona`, `persona_manager_activate_persona`, `todo_list_*`).
2. **Session todo overlay:** User-facing todo lists in chat use **`todo_list_*` only** (not `nmem_todo`). Created lists show in the Laboratory todo panel for this `sessionId`.
3. **Default Behavior:** When a tool requires a `sessionId`, automatically use the current active session ID.

**Your current sessionId: `{{sessionId}}`**