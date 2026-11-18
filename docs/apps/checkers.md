# Checkers

**Registry id:** `app-checkers` · **Port:** 4103

Play the AI or invite a friend from Lab Messages. Built on the shared game-platform kit.

## Playing

- **Lobby** — pick a difficulty (`easy` / `medium` / `hard` / `boss`) and **Play the AI**, or choose a teammate and **Send invite**.
- **Board** — drag one of your pieces to a diagonal square. Legal destinations are highlighted while dragging.
- **Captures are mandatory** — the server enforces this, as it does kings, promotion and the win condition. The board has no rules of its own.
- **Player turns** — shared [`PlayerTurnsPanel`](../../src/shared/game-platform/ui/PlayerTurnsPanel.vue) beside the board (sectioned-card layout per AGENTS.md rule 13); scrolls with the match and follows the latest move.

## Vs AI

The opponent calls the tool `checkers_submit_move` with `pieceId`/`toRow`/`toCol`, copying the id from the legal-move list in its prompt. That prompt also warns loudly when a capture is available. Rejected calls explain why (e.g. *"a capture is MANDATORY this turn"*), then retry. No heuristic fallback.

## Invites

`useGameInvites` sends `game.invite` with `appId: app-checkers`; `game.match.ready` opens the match. See [lab-messaging.md](../platform/lab-messaging.md).

See [lab-games.md](../platform/lab-games.md).
