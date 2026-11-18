# Word Tile

**Registry id:** `app-word-tile` · **Catalog tag:** games · **Type:** hybrid (UI + app server)

Turn-based **word placement** on a shared board (Scrabble-style premiums). Play **vs AI** (LLM opponent) or **vs a friend** (invite over Lab **Messages**). Default app server port **4102**.

## Launch

1. Sign in (required for multiplayer, scores, and vs-AI).
2. Launch **Word Tile** from the games catalog.
3. The **lobby** offers **Play the AI** or **Invite a friend** (section cards).

## Lobby

- **Play the AI:** Choose difficulty and start a match against the lab AI.
- **Invite a friend:** Pick a teammate and send a Lab Messages invite; the match opens when they accept.

### Vs AI

1. Pick a difficulty (**Easy**, **Medium**, **Hard**, **Boss**) and click **Play the AI**.
2. The app creates a match on the app server; the AI takes turns via the platform LLM (you do not chat with the AI in Laboratory — moves are structural tool calls on the server).
3. Each turn has a **timer** (default five minutes per turn unless configured on the server).

### Vs friend

1. Pick a teammate from the roster (users visible via platform presence / lab user list).
2. The app sends a **`game.invite`** envelope on your DM channel with `appId: app-word-tile`.
3. Your friend accepts from **Messages**; THE-LAB can open Word Tile and load the match (`game.match.ready`).
4. While waiting, you can **cancel** the outgoing invite from the lobby.

Invites and match-ready notifications use the same **Messages** transport as human DMs — not Laboratory AI chat. Details: [lab-messaging.md](../platform/lab-messaging.md#game-invites-hybrid-game-apps).

## During a match

- Place tiles from your rack onto the board; submit a valid word to end your turn.
- **Pass**, **exchange** letters, or **resign** when the rules allow (in-game controls).
- **Back to lobby** returns to the catalog view (confirm if a match is in progress).
- When the match ends, a result modal shows win/loss/draw and final scores.

## Scores and head-to-head

- Finished runs can update **personal bests** (stored per platform user id).
- Human vs human results can contribute to **head-to-head** stats between two lab users for this game.

## Lab Assistant and automation

- Scope UI automation to **`word-tile-app`** (not the retired `time-wasters-app` class).
- Views: **`lobby`** → **`play`**. Lobby layout ids use prefixes such as `tw-lobby-*` (legacy naming from the Time Wasters extract).
- Drag letter tiles and board cells with **vue-dnd-kit** only.

## Technical reference (operators)

| Item | Value |
|------|--------|
| UI entry | `src/apps/word-tile/front-end/App.vue` |
| Server entry | `src/apps/word-tile/back-end/entry.ts` |
| Game id | `tile-word-grid` |
| Socket protocol | Legacy `tw:*` event names on the **app** port |
| Invite registry | `GAME_APP_INVITE_REGISTRY['app-word-tile']` |
| Agent purpose | `word-tile.tile-word-grid.agent-turn` |
| Internal slug / DB | `word-tile` → `src/apps/word-tile/db/the_lab.db` |

Legacy DM payloads that reference **`app-time-wasters`** are mapped to Word Tile when accepting invites.

See [lab-games.md](../platform/lab-games.md) for architecture shared with Solitaire and future game apps.
