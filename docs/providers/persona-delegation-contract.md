# Persona delegation contract (SOT sketch — 1.20)

**Status:** Field alignment reference for in-process `PersonaManagerUtils` (default path).

## Activate flow (high level)

```mermaid
sequenceDiagram
  participant Agent as Chat / MCP adapter
  participant PM as persona_manager_activate_persona
  participant Utils as PersonaManagerUtils
  participant WF as Fastify /workflow/activate-persona
  participant IO as Socket.IO dashboard

  Agent->>PM: tool call (targetPersona, message, todos…)
  PM->>Utils: activatePersona(...)
  alt todos requested
    Utils->>Utils: todo_list_create_list + todo_list_add_todo_item
    Utils->>IO: NEW_SESSION_REQUEST + TODO_LIST_UPDATED
  end
  Utils->>WF: in-process handler (or direct utils when opted in)
  WF->>IO: session + persona events
  Utils-->>Agent: MCPToolResponse
```

## Core fields (activate)

| Field | MCP manifest | PersonaManagerUtils | Notes |
|-------|--------------|---------------------|-------|
| `targetPersona` | required | required | Chat persona name |
| `messageToAgent` / user message | required | maps to session placeholder | |
| `originatingSessionId` | required | required | Parent session |
| `todoListId` / `todoListName` | optional | optional | Triggers split todo tools |
| `todoItemId` / `todoItem` / `todoItemData` | optional | maps to `itemId` / `item` / `itemData` for `todo_list_add_todo_item` | |

## Response flow

See `persona_manager_response_persona` and `/workflow/response-persona` — must use the same session/chat IDs returned from activate (**1.21**).

## Related

- [mcp-internal-review.md](../../plans/the-lab-optimization/mcp-internal-review.md)
- `src/backend/mcp/mcp-servers/persona/utils/persona-manager-utils.ts`
