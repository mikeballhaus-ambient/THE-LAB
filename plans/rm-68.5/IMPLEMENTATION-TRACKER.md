# rm-68.5 — Implementation tracker

**Plan:** [../roadmap/rm-68.5-quarks-game-hints.md](../roadmap/rm-68.5-quarks-game-hints.md)  
**Started:** 2026-11-12 (after **rm-68** closeout)

| Id | Task | Status |
|----|------|--------|
| T0 | **Per-game hint matrix** — owner review | ✅ [lab-quarks-hints.md](../../docs/platform/lab-quarks-hints.md) |
| T1 | Platform hint purchase + ledger `hint_purchase` | ✅ route + adjust + tests |
| T2 | Shared client composable (purchase → unlock) | ✅ `useLabGameHint` + client + dev mock |
| T3 | Billiards: gate shot-path UI overlay | ✅ purchase + practice free |
| T4 | User doc | ✅ lab-quarks-hints.md + virtual-bank § |
| T5 | Second game archetype + solitaire SKU | ✅ full matrix incl. Hangman + Hold'em |
| T6 | Owner verify + CI tests | ✅ owner 2026-11-13 (incl. Solitaire); CI hint tests |

### Owner sign-off — Quarks hints (UI overlay)

| App | SKU | Owner | Date |
|-----|-----|-------|------|
| Chess | `win-block` | Mike | 2026-11-13 |
| Checkers | `win-block` | Mike | 2026-11-13 |
| Hangman | `safe-letter` | Mike | 2026-11-13 |
| Billiards | `shot-path` | Mike | 2026-11-13 |
| Connect Four | `threat-column` | Mike | 2026-11-13 |
| Battleship | `hunt-line` | Mike | 2026-11-13 |
| Texas Hold'em | `street-coach` | Mike | 2026-11-13 |
| Tic-Tac-Toe | `win-block` | Mike | 2026-11-13 |
| Blackjack | `basic-strategy` | Mike | 2026-11-13 |
| Solitaire | `one-move` | Mike | 2026-11-13 |
| Word Tile | `best-play` | — | shipped; optional spot-check |

**Notes**

- UI overlay hints only — not Sidecar banter, not agent AIM HINTS, not dev collider/grid.
- `POST /api/game-hints/purchase` on each game server that sells hints (Billiards registers today).

## Pre-PR

- [x] `npm run test:pipeline` (owner batch @ closeout 2026-11-13)

**Programme closed** — [EXECUTOR-CLOSEOUT.md](../../docs/archive/programmes/rm-68.5/EXECUTOR-CLOSEOUT.md)
