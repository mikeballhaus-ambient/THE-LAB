# Word Tile app (`app-word-tile`)

**User guide:** [docs/apps/word-tile.md](../../../../docs/apps/word-tile.md)  
**Games platform:** [docs/platform/lab-games.md](../../../../docs/platform/lab-games.md)

## Layout

| Path | Role |
|------|------|
| `front-end/App.vue` | Lobby / mode / play routing, comms + pending match |
| `front-end/games/tile-word-grid/` | Board UI |
| `front-end/composables/` | Match, invites, catalog |
| `back-end/adapter.ts` | `GameServerAdapter` binding + the agent `structuralTool` declaration |
| `back-end/rules.ts` | Rules engine, board rendering, turn text, and the AI prompt |
| `back-end/catalog.ts` | `GameCatalogEntry[]` |
| `back-end/server.ts` | Kit wiring (`createMatchTables`, `registerGameAdapter`, …) |
| `back-end/words-en-core.txt` | Dictionary, read by `rules.ts` |
| `shared/` | Only what the browser *and* server import: types, socket events, board constants |
| `shared/tile-word-grid-board-premiums.ts` | Premium squares (browser renders them; server scores them) |
| `shared/tile-word-grid-constants.ts` | Letter values, bag, geometry (browser shows tile scores) |
| `shared/tile-word-grid-agent-move-schema.ts` | Zod schema for the `tile_word_grid_submit_move` tool |
| `shared/agent-tool.ts` | Structural-tool descriptor core registers |

**Nothing Word Tile-specific lives in `src/shared`.** The move schema and tool
descriptor are owned here; core imports them only to register the tool at boot
(`registerStructuralToolFromApp`). Enforced by
[`word-tile-boundary.test.ts`](../../../tests/apps/word-tile/word-tile-boundary.test.ts).

`back-end/` is the **same shape as every other catalogue game** — `adapter.ts` +
`rules.ts` + `catalog.ts` + `server.ts`. Word Tile is not a special case:

- **`adapter.ts`** binds the rules to the kit and declares a `structuralTool`
  block. That block is what makes this a structured-move game; the kit's agent
  loop does the retrying, so no bespoke agent module is needed.
- **`rules.ts`** holds everything game-specific: rules, board rendering, the
  turn text (`summarizeMove` / `attemptNote` wording), and the AI prompt.
- **`word-tile-legal-play-search.ts`** + **`word-tile-agent-legal-hints.ts`** enumerate
  dictionary-valid placements (same engine as the human “best play” hint). On **medium+**,
  `buildUserPrompt` injects a “Server-ranked legal plays” block in the user message; after
  rejections or anchor cycling, `buildAgentRetryUserHint` adds more. Hints are **not** auto-play
  (platform policy); the model must still call `tile_word_grid_submit_move`.

Board rendering sits beside `edgeNeighbours`, the char-neighbour rule the
validator already uses. `shared/` holds only what the browser and the server both
import.

The AI prompt surface is pinned by
[`word-tile-prompt-golden.test.ts`](../../../tests/apps/word-tile/word-tile-prompt-golden.test.ts)
against a fixture captured from the pre-refactor modules — regenerate it only for a
deliberate prompt change, via
[`capture-word-tile-prompt-golden.ts`](../../../scripts/capture-word-tile-prompt-golden.ts).

The match service, runs service, HTTP routes and Socket.IO registrar all come from the
shared kit (`@/shared/game-platform/server`); this app supplies only its rules adapter and
`WORD_TILE_CONFIG`. Socket events keep the `tw:*` names (`tw` = **tile word**).

**Port:** registry default **4102** Â· **Internal slug:** `word-tile`.

**Register on fresh DB:** `npx tsx src/scripts/register-word-tile-app-once.ts`

**Invites:** `appId` must be `app-word-tile`.
