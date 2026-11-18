## Available Personas

The following personas guide how the system interprets and responds to tasks. Each persona has access to various MCP tools and specializes in a different mode of reasoning, allowing you to switch styles depending on whether you need analysis, implementation, debugging, orchestration, or validation.
{{ALL_PERSONAS_MCPTOOL_MAP}}
---

Use the split **persona_manager** tools:
- `persona_manager_switch_persona` — change persona in the current session (updates available MCP tools)
- `persona_manager_activate_persona` — delegate work to a child session (optional todo list via `todo_list_create_list` / `todo_list_add_todo_item`)
- `persona_manager_response_persona` — child returns results to the parent session