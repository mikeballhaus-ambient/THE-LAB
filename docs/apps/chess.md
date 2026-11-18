# Chess

**Registry id:** `app-chess` · **Port:** 4104

Play the AI or invite a friend from Lab Messages. Built on the shared game-platform kit.

## Playing

- **Lobby** — pick a difficulty (`easy` / `medium` / `hard` / `boss`) and **Play the AI**, or choose a teammate and **Send invite**.
- **Board** — drag a piece to a highlighted square, or click your piece then a highlighted destination. The board uses themed squares and filled Unicode pieces (yours = accent, opponent = contrasting tone); it flips so your colour is at the bottom.
- **Legality** — check, mate, stalemate, **castling**, and pawn promotion are decided by the server. You choose queen/rook/bishop/knight on promotion; the AI may send `promotion` in its tool call. Move hints on the board match server rules.
- **Player turns** — shared [`PlayerTurnsPanel`](../../src/shared/game-platform/ui/PlayerTurnsPanel.vue) beside the board (sectioned-card layout per AGENTS.md rule 13); scrolls with the match and follows the latest move.

## Vs AI

The opponent calls the tool `chess_submit_move` with `fromRow`/`fromCol`/`toRow`/`toCol` (row 0 = rank 8, col 0 = file a). Its prompt carries the algebraic board, material, check/mate state and the **full legal-move list**; rejected calls name what was wrong, then retry. No heuristic fallback.

## Invites

`useGameInvites` sends `game.invite` with `appId: app-chess`; `game.match.ready` opens the match. See [lab-messaging.md](../platform/lab-messaging.md).

See [lab-games.md](../platform/lab-games.md).
