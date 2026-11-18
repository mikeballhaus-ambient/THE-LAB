# Solitaire app (`app-solitaire`)

**User guide:** [docs/apps/solitaire.md](../../../../docs/apps/solitaire.md)  
**Games platform:** [docs/platform/lab-games.md](../../../../docs/platform/lab-games.md)

## Layout

| Path | Role |
|------|------|
| `front-end/App.vue` | Shell, new game, win dialog |
| `front-end/games/klondike/` | Klondike board, dnd-kit card moves |
| `front-end/composables/useSolitaireSession.ts` | Socket + run submit |
| `back-end/entry.ts` / `server.ts` | Fastify + Socket.IO |
| `back-end/services/runs-service.ts` | Run persistence + personal bests |
| `shared/types/` | `SOLITAIRE_SOCKET_EVENTS`, `GameRunPayload` |
| `db/app-db-service.ts` | Per-app SQLite proxy |

**Port:** registry default **4101** · **Internal slug:** `solitaire` (never `app-solitaire` in DB host id or `AppDatabaseService`).

**Register on fresh DB:** `npx tsx src/scripts/register-solitaire-app-once.ts`
