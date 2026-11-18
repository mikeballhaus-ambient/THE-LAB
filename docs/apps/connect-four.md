# Connect Four

**Registry id:** `app-connect-four` · **Port:** 4106

Play the AI or invite a friend from Lab Messages. Built on the shared game-platform kit.

## Playing

- **Lobby** — pick a difficulty (`easy` / `medium` / `hard` / `boss`) and **Play the AI**, or choose a teammate and **Send invite**.
- **Board** — click a column number above the grid to drop a disc. Gravity and four-in-a-row are decided by the server; a winning line is highlighted from state.

## Vs AI

The opponent calls the tool `connect_four_submit_move` with a single `col` (0–6) — it chooses a **column**, never a row. Its prompt carries the board, open columns, and any immediate win/block column. Rejected calls explain why (e.g. *"Column 3 is full"*), then retry. No heuristic fallback.

## Invites

`useGameInvites` sends `game.invite` with `appId: app-connect-four`; `game.match.ready` opens the match. See [lab-messaging.md](../platform/lab-messaging.md).

See [lab-games.md](../platform/lab-games.md).
