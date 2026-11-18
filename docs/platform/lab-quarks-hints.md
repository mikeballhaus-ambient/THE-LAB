# Lab Quarks — purchasable game hints (proposal)

**Programme:** [rm-68.5](../../plans/roadmap/rm-68.5-quarks-game-hints.md) · **Status:** **Owner-verified (2026-11-13)** — [closeout](../archive/programmes/rm-68.5/EXECUTOR-CLOSEOUT.md). Full matrix below; Solitaire `one-move` requires purchase to unlock overlay (per bounded-reveal rules).

This document lists **candidate UI overlay hints** per catalog game. Owner feedback should confirm SKUs, fairness, practice policy, and pricing before implementation.

## What counts as a Quarks hint

| In scope | Out of scope (do not sell) |
|----------|----------------------------|
| **Visual overlay** on the player’s UI for one bounded moment (until you act, one turn, one shot) | **Sidecar / Lab Assistant banter** ([lab-sidecar.md](lab-sidecar.md)) |
| Reveals derived from **rules the player could compute** or **their own match state** | **LLM opponent move** or hidden engine auto-play |
| Optional debit via **virtual bank** (`hint_purchase` ledger reason) | **Billiards agent AIM HINTS** in prompts, dev collider/grid toggles |
| Solo and PvP, with stricter gates for hidden information | Showing **opponent secret state** (fog-of-war boards, hole cards, ship positions) |

**Product rules (draft):**

1. **One purchase → one bounded reveal** (e.g. until shot fired, until one move placed, one decision in blackjack).
2. **PvP:** hints only on **your** turn / your aiming phase; never leak opponent secrets.
3. **`rules.practice` / practice tables:** **no Quarks debit** — still **tap purchase (or dev mock) to unlock** the overlay for that reveal (same as Street coach+ / basic strategy flash; align with [lab-game-quarks-practice](../../src/shared/constants/lab-game-quarks-practice.ts)).
4. **Pricing (draft tiers):** **25** (light), **50** (standard), **100** (heavy geometry / multi-cell reveal). Frame wagers remain 50–1000 via difficulty — hints sit **below** wagers.

## Hint archetypes

| Archetype | Example | Typical bound |
|-----------|---------|----------------|
| **A. Geometry path** | Billiards cue/object/bank path SVG | Until shot released or aim cancelled |
| **B. Legal-move highlight** | *(Reserved — not Chess/Checkers)* boards that do not already expose legality on select | Until one move submitted or turn ends |
| **C. One-ply threat** | Connect Four / Tic-Tac-Toe / **Chess / Checkers** “win or block” | One overlay; clears after move |
| **D. High-score play preview** | Word Tile: **one** legal placement that maximizes turn score for current rack + board | Overlay until you play, pass, or dismiss; does not submit |
| **E. Coach copy** | Hold’em: pot-odds band (not exact solver) | Panel refresh once per purchased street |
| **F. Inference from your shots** | Battleship: extend hunt line from **your** hit cluster | Until next shot |
| **G. Solitaire move flash** | One valid stock/tableau/foundation move outline | Until you move or cancel |

**Never:** engine search “best move”, full solution, opponent fog reveal, or submitting a move on the player’s behalf.

## Per-game matrix (proposal)

**Legend — Phase:** **P1** = rm-68.5 pilot; **P2** = second wave; **Defer** = not planned until owner requests; **Never** = conflicts with fairness policy.

| App | Registry id | Proposed SKU | Hint (player-facing name) | Archetype | What the UI shows | When allowed | Practice | Draft cost | Phase | Fairness / notes |
|-----|-------------|--------------|---------------------------|-----------|-------------------|--------------|----------|------------|-------|------------------|
| **Billiards** | `app-billiards` | `shot-path` | **Shot path preview** | A | Geometric cue → first object contact, banks, dashed object chain ([`billiard-shot-hint-paths.ts`](../../src/apps/billiards/shared/billiard-shot-hint-paths.ts)) — not Rapier truth | Your shot window; not while balls rolling | Free | 50 | **P1** | Exists today always-on; product gate is the reference pilot. |
| **Chess** | `app-chess` | `win-block` | **Win or block+** | C | **One** from→to highlight: mate, block mate, **legal capture**, block opponent one-ply capture, else quiet suggest — [`chess-win-block-hint.ts`](../../src/apps/chess/shared/chess-win-block-hint.ts). Selection dots unchanged when dragging. | Your turn only | Free | 50 | **P2** | One-ply only; no engine search. |
| **Checkers** | `app-checkers` | `win-block` | **Win or block+** | C | **One** from→to highlight: win jump, block opponent win, **your legal jump** when captures exist, block opponent one-ply jump, else quiet suggest — [`checkers-win-block-hint.ts`](../../src/apps/checkers/shared/checkers-win-block-hint.ts). | Your turn only | Free | 50 | **P2** | Jumps prioritized over quiet slides; one ply only. |
| **Connect Four** | `app-connect-four` | `threat-column` | **Threat check** | C | Highlight **one** column that wins next **or** blocks opponent win (single-ply from public grid) | Your turn only | Free | 50 | **P2** | No multi-ply solver. |
| **Tic-Tac-Toe** | `app-tic-tac-toe` | `win-block` | **Win or block** | C | Outline square that completes line or blocks opponent | Your turn only | Free | 25 | **P2** | Trivial game; hint is teaching-only. |
| **Battleship** | `app-battleship` | `hunt-line` | **Hunt helper** | F | On **your firing grid**, suggest next cell along axis from your unsunk hit cluster (no opponent ship data) | Your shot phase | Free | 50 | **P2** | Must not mark cells only known via cheating; inference from **your** hits only. |
| **Hangman** | `app-hangman` | `safe-letter` | **Safe letter nudge** | D* | One letter in the word via `POST /api/game-hints/safe-letter` after purchase | Guesser, vs-AI | Free | 25 | **P2** | Server reads match state; keyboard highlight only. |
| **Word Tile** | `app-word-tile` | `best-play` | **Best play** | D | **One** legal word + tile positions that earns the **most points this turn** for your rack and the visible board (premiums + cross-words via [`totalTurnScore`](../../src/apps/word-tile/back-end/rules.ts)). UI ghosts the placement and shows the word + point total. | Your turn only | Free | 50 | **P2** | Local search over legal plays only — not full-game lookahead; opponent rack hidden; player still places tiles manually. |
| **Texas Hold'em** | `app-poker-holdem` | `street-coach` | **Street coach+** | E | Pot odds + coarse hand strength band; **augments** existing free [`HoldemPlayHintsPanel`](../../src/apps/poker-holdem/front-end/components/HoldemPlayHintsPanel.vue) | Your betting turn | Practice: unlock via purchase (no Quarks debit); wager match debits | 50 | **P2** | Reveal only after unlock; separate from in-hand pot/blinds. |
| **Blackjack** | `app-blackjack` | `basic-strategy` | **Basic strategy flash** | E | One **Hit/Stand/Double/Split** recommendation for current hand (rules table, not card counting) | Your decision on **one** hand | Free in practice | 25 | **P2** | Seat 2 LLM tablemate unchanged; hint is human-only chrome. |
| **Solitaire** | `app-solitaire` | `one-move` | **Hint: one move** | G | Classic “one valid move” (stock flip, tableau, foundation) | Any time in solo deal | Free (solo sink) | 25 | **P2** | Pure spend sink; no PvP. |

\* Hangman archetype is light text + letter reveal — still UI-bound, not chat.

### Explicitly excluded from Quarks hints

| App / surface | Why |
|---------------|-----|
| All vs–Lab Assistant **move** turns | Opponent already uses LLM + tools; selling “best move” duplicates policy violations. |
| **Poker** hole cards / **Battleship** enemy grid | Hidden information. |
| **Billiards** `BILLIARDS_SHOW_DEV_TOOLS`, collider wireframe, dev grid | Internal only. |
| **Forms Builder / CRM / …** | Not catalog games; activity Quarks use [lab-virtual-bank.md](lab-virtual-bank.md) activity credits instead. |

## Word Tile — `best-play` (P2)

- **Compute:** Enumerate legal placements for the current rack (same validation as submit); score each with `totalTurnScore` (letter values, DL/TL/DW/TW, cross-words formed).
- **Tie-break:** shortest word, then lexicographic — deterministic, no randomness.
- **UI:** Highlight cells + rack mapping for the top-scoring play; label e.g. `QUIET — 42 pts`. Overlay clears on submit, pass, or new turn.
- **Boundaries:** One purchase → one suggestion for **this** turn state. Does not search opponent responses or bag contents. Acceptable “optimizer for this turn” — distinct from vs-AI policy (human-only UI assist).

## Billiards pilot detail (P1)

Matches engineering notes in [`billiards-app-instructions`](../../src/backend/db/Apps/app-instructions/billiards-app-instructions.ts):

- **Control:** `useLabGameHint` + `shotPathHint.showOverlay` in [`BilliardsTable.vue`](../../src/apps/billiards/front-end/components/BilliardsTable.vue) — **off** until purchase (practice always on).
- **UX:** [`LabGameHintPurchaseButton`](../../src/shared/game-platform/ui/LabGameHintPurchaseButton.vue) in table aside; dev mock beside it when enabled.
- **Ledger:** `sourceRef` like `hint:app-billiards:shot-path:match:{matchId}:seat:{seat}:shot:{seq}` for idempotency per shot.
- **PvP:** purchase only when `canShoot` for local seat.

## Open questions for owner

1. **Prices:** Keep draft 25 / 50 / 100 or align all board games to 25?
2. **Practice:** Free hints for all games in practice, or billiards-only free preview?
3. **Hold’em:** Upgrade existing free panel vs separate paid SKU — or **never** charge (coach stays free)?
4. **Hangman:** Ship in P2 or defer until lexicon performance reviewed? (**Word Tile `best-play`** — owner approved score-max hint.)
5. **Billiards P1:** Per-**shot** purchase vs per-**frame** unlock?

## Development — mock hint purchase

Build and QA without debiting Quarks:

| Layer | Behavior |
|-------|----------|
| **Client** | [`LabGameHintDevMockButton`](../../src/shared/game-platform/ui/LabGameHintDevMockButton.vue) — visible when [`isLabGameHintDevMockEnabled()`](../../src/shared/game-platform/lab-game-hint-dev-mock.ts) is true (Vite **dev** by default). Calls `useLabGameHint().mockPurchaseHint()` — **no HTTP**. |
| **Opt out (dev)** | `VITE_LAB_GAME_HINT_DEV_MOCK=0` in `.env` |
| **Staging QA** | `VITE_LAB_GAME_HINT_DEV_MOCK=1` on a production build |
| **Server mock route (T1)** | `LAB_GAME_HINT_DEV_MOCK=1` on app server only when testing purchase API without ledger; **never** when `LAB_PRODUCTION_PROFILE=1` |

Every game that ships a paid hint should mount the dev mock button beside the real purchase control while rm-68.5 is in flight. **Billiards** wires it in `BilliardsTable.vue` (competitive matches only; practice uses free overlay via `practiceMode`).

## After approval

1. Add `hint_purchase` to [`lab-virtual-bank.ts`](../../src/shared/types/lab-virtual-bank.ts) and platform SKU registry in [`lab-game-hints.ts`](../../src/shared/game-platform/lab-game-hints.ts).
2. Finish `useLabGameHint().purchaseHint()` app route + platform adjust.
3. Wire **Billiards `shot-path`** production purchase control; track in [rm-68.5 tracker](../../plans/rm-68.5/IMPLEMENTATION-TRACKER.md).

## References

- [lab-virtual-bank.md](lab-virtual-bank.md)
- [lab-games.md](lab-games.md)
- [docs/apps/billiards.md](../apps/billiards.md)
- Programme plan: [rm-68.5-quarks-game-hints.md](../../plans/roadmap/rm-68.5-quarks-game-hints.md)
