# Lab catalog games

THE-LAB ships **standalone hybrid game apps** in the app catalog (tag **games**). Each app has its own Vue UI in the dashboard and a dedicated Fastify server on an **app port** (`4000–4999`), not the main backend on **3000**.

Time Wasters (`app-time-wasters`) was retired in rm-53 phase 04.

## Catalog games

| Registry id | App | Port | User guide |
|-------------|-----|------|------------|
| `app-solitaire` | Solitaire | **4101** | [Solitaire](../apps/solitaire.md) |
| `app-word-tile` | Word Tile | **4102** | [Word Tile](../apps/word-tile.md) |
| `app-checkers` | Checkers | **4103** | [Checkers](../apps/checkers.md) |
| `app-chess` | Chess | **4104** | [Chess](../apps/chess.md) |
| `app-hangman` | Hangman | **4105** | [Hangman](../apps/hangman.md) |
| `app-connect-four` | Connect Four | **4106** | [Connect Four](../apps/connect-four.md) |
| `app-battleship` | Battleship | **4107** | [Battleship](../apps/battleship.md) |
| `app-poker-holdem` | Texas Hold'em | **4108** | [Poker](../apps/poker-holdem.md) |
| `app-tic-tac-toe` | Tic-Tac-Toe | **4109** | [Tic-Tac-Toe](../apps/tic-tac-toe.md) |

**Greenfield MVP (4103–4109):** local two-player (or solo puzzle) play on one screen; full PvP invites and vs-AI match services follow Word Tile patterns in later hardening passes.

**Kit:** `src/shared/game-platform/` · user-facing copy in [lab-game-assistant-opponent.ts](../../src/shared/constants/lab-game-assistant-opponent.ts)

**Launch:** Apps workspace → catalog → launch. Requires `member`+ (viewers cannot launch).

**Theming:** `lab-*` tokens on all surfaces — [platform-theming.md](platform-theming.md).

**DnD:** `@vue-dnd-kit/core` for Checkers, Chess, and any drag-based boards.

## Architecture (shared patterns)

```text
Dashboard (Vite)                    App server (hybrid)
─────────────────                   ───────────────────
App.vue  props.serverUrl  ──HTTP──►  Fastify routes (/health, /api/…)
Lab Sidecar / Assistant             Per-app SQLite under src/apps/{slug}/db/
```

| Concern | Where |
|---------|--------|
| Friend invites (full) | Word Tile + `GAME_APP_INVITE_REGISTRY` — [lab-messaging.md](lab-messaging.md#game-invites-hybrid-game-apps) |
| Vs-AI (LLM) | Word Tile — `word-tile.tile-word-grid.agent-turn` |
| Agent instructions | `apps.app_system_instructions` — [app-system-instructions.md](app-system-instructions.md) |

## Operators

| Task | Command |
|------|---------|
| Link `games` tag on new DB | `npx tsx src/scripts/ensure-greenfield-game-catalog-tags.ts` |
| Re-wire MVP UI after template | `node src/scripts/implement-greenfield-games.mjs` |
| Sync folders | `npm run dev` / `sync-app-dirs` |

Per-app guides: [docs/apps/](../apps/).
