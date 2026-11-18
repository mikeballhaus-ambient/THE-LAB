# Texas Hold'em

**Registry id:** `app-poker-holdem` · **Port:** 4108

Heads-up table using lab **Quarks** (play money — see [lab virtual bank](../platform/lab-virtual-bank.md)). Play the AI or invite a friend from Lab Messages. Built on the shared game-platform kit.

## Quarks betting

| Setting | Default |
|---------|---------|
| Small blind | 25 Quarks |
| Big blind | 50 Quarks |
| Minimum open bet | 50 Quarks |
| Minimum raise | 25 Quarks above the current bet |

Blinds post automatically when a hand starts (pot opens at 75 Quarks). On your turn you can **call**, **check** (when nothing to call), **bet**, **raise**, or **fold**. When both players have matched the current street bet, the **house** deals the next street (flop → turn → river) automatically. By default, pot math is **simulated** (lobby Quarks option off). Check **Play for Quarks** before starting to settle the hand against your real balance.

## Streets and showdown

Community cards are dealt in three steps (flop 3, turn 1, river 1). After the **river** and final betting round, the stronger five-card hand wins (or you win if the opponent folds). Showdown runs automatically once five board cards are down.

## Playing

- **Lobby** — pick a difficulty and **Play the AI**, or choose a teammate and **Send invite**.
- **Hand** — your two hole cards; the board fills flop → turn → river across turns.
- **Actions** — **Your action** box on the right, aligned with your hole cards. Only actions the server accepts are enabled.
- **Play guide** — aside panel (same layout as Chess “Player turns”) explains your legal options in plain language on your turn.

## Vs AI

The opponent uses `poker_submit_move` with `check`, `call`, `fold`, `bet`, or `raise`. Its prompt includes hole cards, board, pot, to-call, and legal actions.

## Invites

`useGameInvites` sends `game.invite` with `appId: app-poker-holdem`; `game.match.ready` opens the match. See [lab-messaging.md](../platform/lab-messaging.md).

See [lab-games.md](../platform/lab-games.md).
