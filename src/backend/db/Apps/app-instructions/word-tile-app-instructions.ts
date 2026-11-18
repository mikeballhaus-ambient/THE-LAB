/**
 * App system instructions for Word Tile (seeded into apps.app_system_instructions).
 * Registry id: `app-word-tile` Â· internal slug: `word-tile` Â· hybrid Â· default port 4102.
 *
 * User-facing doc: docs/apps/word-tile.md Â· Platform: docs/platform/lab-games.md
 */

export const wordTileAppInstructions = `# App System Instructions: Word Tile

## Overview

Word Tile (\`app-word-tile\`) is a **hybrid** turn-based word game (rm-53 Phase 03). UI: \`src/apps/word-tile/front-end/App.vue\`. App server: \`src/apps/word-tile/back-end/entry.ts\` on **\`props.serverUrl\`** (registry default **4102**), not main backend **3000**.

**Catalog (v1):** one game â€” \`tile-word-grid\` (vs AI with LLM agent, or vs friend via lab-comms invites).

**Outer automation scope:** class \`word-tile-app\`.

## Views

| View | When | Key UI |
|------|------|--------|
| \`lobby\` | Default | \`GameModePicker\` (\`lab-form-section\` AI / invite cards; \`game-lobby-*\` id prefixes) |
| \`play\` | Active match | \`GamePlayShell\` + \`TileWordGridGame\` |

\`backToLobby\` from shell returns to lobby; may prompt if match in progress.

## Multiplayer and invites

- Outgoing invites: \`useWordTileInvites\` sends lab-comms \`game.invite\` with **\`appId: app-word-tile\`**.
- Incoming accept/decline: Messages shell uses \`GAME_APP_INVITE_REGISTRY\` â†’ socket acks \`tw:invite:accept\` / \`tw:invite:decline\` on the **app** port.
- Match ready: \`game.match.ready\` + \`game-pending-match\` opens app and loads match via \`useTurnBasedMatch\`.
- Envelope \`appId\` is always \`app-word-tile\`.

Human-readable invite flow: \`docs/platform/lab-messaging.md\` (game invites section).

## Vs-AI

- Server resolves agent moves via \`back-end/adapter.ts\`, which declares a \`structuralTool\` block on \`createTurnBasedAdapter\`. The kit's \`src/shared/game-platform/agent-loop.ts\` owns the retry engine (request → validate → feed the rejection back → retry → throw; no heuristic fallback); \`back-end/rules.ts\` supplies the prompt, tool grading and stuck-detection.
- Platform purpose: \`word-tile.tile-word-grid.agent-turn\`.
- Structural tool: \`tile_word_grid_submit_move\` (schema in \`src/shared/game-platform/\` â€” core does not import this app).

Difficulty: \`easy\` | \`medium\` | \`hard\` | \`boss\` on match create. Tier intent and the temperature table come from \`src/shared/game-platform/difficulty-policy.ts\`; the opponent persona, tool contract and tile mechanics live in \`back-end/rules.ts\`.

## Transport

Socket.IO on app port â€” legacy \`tw:*\` names (\`TW_SOCKET_EVENTS\` in \`shared/types/socket-events.ts\`). Ephemeral match sync may also use platform \`comms:match:state\` for PvP view updates.

REST: \`back-end/routes/api-routes.ts\` (parity/tests); primary UI path is sockets.

## Data

Per-app SQLite: \`src/apps/word-tile/db/the_lab.db\` via \`AppDatabaseService.getInstance('word-tile')\`.

Tables include \`tw_matches\`, \`tw_runs\`, \`tw_personal_bests\`, \`tw_invites\` (TW-era names retained). Identity = platform \`users.id\`.

## UI automation contract

- All interactive elements use \`useUniqueElementId()\` (PrimeVue \`:pt\` root \`id\`, native \`:id\`).
- Drag-and-drop for tiles/cells: **\`@vue-dnd-kit/core\` only**.
- Launch: \`ui_automation_element_action\` on catalog \`[data-appname="Word Tile"]\`; scope in-app to \`word-tile-app\`.
- Mode picker: \`GameModePicker\` on the lobby (\`tw-lobby-layout\`).

## Sidecar

In apps workspace, \`useLabSidecar().setContext\` can expose active view (\`lobby\` / \`play\`) and \`gameId\` when implementing richer context â€” follow patterns in \`docs/platform/lab-sidecar.md\`.

## Registry metadata

Change id, port, order, or \`isEnabled\` only via **App Management** â€” not ad-hoc SQL.
`;
