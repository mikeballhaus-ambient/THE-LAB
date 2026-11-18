/**
 * App system instructions for Solitaire (seeded into apps.app_system_instructions).
 * Refreshed on backend init via AppsRepository.syncSeededAppSystemInstructions().
 *
 * Registry id: `app-solitaire` · internal slug: `solitaire` · hybrid · app port 4101.
 *
 * User-facing doc: docs/apps/solitaire.md · Platform: docs/platform/lab-games.md
 */

export const solitaireAppInstructions = `# App System Instructions: Solitaire

## Overview

Solitaire (\`app-solitaire\`) is a **hybrid** mini-game app. The Vue UI mounts in the Lab dashboard (\`src/apps/solitaire/front-end/App.vue\`) and plays **Klondike**. A dedicated Fastify app server (\`src/apps/solitaire/back-end/entry.ts\`) owns persistence and is reachable on the **app port** (\`props.serverUrl\`, registry default **4101**) — never the main backend **3000**.

Solo-only product (rm-53 Phase 02). No multiplayer, vs-AI, or **lab-wide leaderboard** — wins may update your **personal best** only.

**Outer automation scope:** class \`solitaire-app\`.

**Catalog (v1):**
| Game | Id | Mode | Score |
|------|----|------|-------|
| Klondike | \`klondike\` | Solo | \`time-lower\` — elapsed ms (primary), moves (secondary) |

## Data model

Per-app SQLite at \`src/apps/solitaire/db/the_lab.db\` (via \`AppDatabaseService.getInstance('solitaire')\`):

- \`solitaire_runs\` — one row per completed run (\`game_id\`, \`lab_user_id\` = **platform** \`users.id\`, \`primary_value\`, \`secondary_value\`, \`run_id\` unique).
- \`solitaire_personal_bests\` — best primary/secondary per \`lab_user_id\` + \`game_id\`.

Rows are keyed by the THE-LAB platform user id (JWT \`sub\`), not the per-app reserved \`users\` table.

## UI automation contract

- The Lab agent can drive the mounted board with \`ui_automation_discover_elements\` / \`ui_automation_element_action\` while a human plays — this is **not** an in-game AI opponent. Solitaire has **no** vs-AI or multiplayer mode in v1.
- All interactive elements (Draw, New game, stock, cards, dialog buttons) carry \`useUniqueElementId()\` ids so automation is reliable.
- Drag-and-drop uses \`@vue-dnd-kit/core\` only (cards = draggable, foundation/tableau zones = droppable). Prefer double-click cards to auto-send them to foundations.

## Transport

Socket.IO on the app server port — app-local events only (\`SOLITAIRE_SOCKET_EVENTS\`, \`src/apps/solitaire/shared/types/index.ts\`):

| Event | Direction | Purpose |
|-------|-----------|---------|
| \`solitaire:games:list\` | client → server (ack) | Catalog + caller personal best |
| \`solitaire:run:submit\` | client → server (ack) | Persist a completed Klondike run; returns \`{ accepted, personalBest }\` |

REST parity: \`GET /api/games\`, \`POST /api/games/:gameId/runs\`, \`GET /health\`.

Auth: Bearer user JWT on HTTP; \`auth.accessToken\` on the socket handshake (both resolved to the platform user id).

## Launch automation

\`ui_automation_discover_elements\` with \`contextArea: "app-list-container"\` (or catalog sidebar); click \`[data-appname="Solitaire"]\`. Scope subsequent actions to \`solitaire-app\`.

## Registry metadata

Change id, port, order, or \`isEnabled\` only via **App Management** — not ad-hoc SQL.
`;
