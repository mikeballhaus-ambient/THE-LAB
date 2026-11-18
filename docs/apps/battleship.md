# Battleship

**Registry id:** `app-battleship` · **Port:** 4107

Play the AI or invite a friend from Lab Messages. Built on the shared game-platform kit.

## Playing

Two boards, fog of war respected:

- **Enemy waters** (top) — click a cell to fire. `.` unshot, `X` hit, `o` miss.
- **Your waters** (bottom) — your ships (`S`) plus incoming enemy fire.
- **Lobby** — pick a difficulty and **Play the AI**, or choose a teammate and **Send invite**.

## Fairness

`match.state` is **redacted per seat** by the adapter's `redactStateForSeat` hook, so the enemy fleet is not present in the payload at all. The board therefore cannot leak it — not by rendering, and not in DevTools.

## Vs AI

The opponent calls the tool `battleship_submit_move` with `row`/`col` on the **enemy** board. Its prompt shows its own fleet, the enemy board *as it knows it*, and recommends cells adjacent to previous hits. Rejected calls explain why (e.g. *"You already fired at (3,5)"*), then retry. No heuristic fallback.

## Invites

`useGameInvites` sends `game.invite` with `appId: app-battleship`; `game.match.ready` opens the match. See [lab-messaging.md](../platform/lab-messaging.md).

See [lab-games.md](../platform/lab-games.md).
