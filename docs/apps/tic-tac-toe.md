# Tic-Tac-Toe

**Registry id:** `app-tic-tac-toe` · **Port:** 4109

Play the AI or invite a friend from Lab Messages. Built on the shared game-platform kit.

## Playing

- **Lobby** — pick a difficulty (`easy` / `medium` / `hard` / `boss`) and **Play the AI**, or choose a teammate and **Send invite**.
- **Board** — click an empty cell. The board renders `match.state`; the server validates every move.
- **Winning line** — highlighted from state, not computed client-side.

## Vs AI

The opponent calls the tool `tic_tac_toe_submit_move` with the cell index. Its prompt carries the board, both players' moves, the empty cells, and any immediate win/block threat. Rejected calls come back with the exact reason (e.g. *"Cell 4 is already occupied by X"*) and the model retries — there is no heuristic fallback.

## Invites

`useGameInvites` sends `game.invite` with `appId: app-tic-tac-toe`; `game.match.ready` opens the match. See [lab-messaging.md](../platform/lab-messaging.md).

See [lab-games.md](../platform/lab-games.md).
