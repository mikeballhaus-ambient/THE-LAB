# Blackjack

Hybrid catalog game (`app-blackjack`, port **4117**). Uses the shared game-platform kit (matches, invites, Quarks ledger).

## Table model

| Mode | Who is at the table |
|------|---------------------|
| **Play vs Lab Assistant** | **You** (seat 1) + **Lab Assistant** (seat 2, LLM tablemate) + **dealer** (scripted house). Seat 2 uses `agentMode: 'llm'` and `blackjack_submit_move` — same lab providers as other vs-AI games. Your Quarks outcome is seat 1 only. |
| **Invite a friend** | **Heads-up PvP only** — you and **one** friend, each with a seat, plus the **same shared dealer**. No three-or-more-player tables yet. |

Dealer stands on soft 17. Player blackjack pays 3:2. Double on your first two cards only. **The dealer never splits** — only player seats 1 and 2 can split a matching pair (one split per seat per hand; each stack is played in order for the same base `bet`).

## Split

| Who | How |
|-----|-----|
| **You (seat 1)** | **Split** when `legalActions` includes it — matching first two cards, enough Quarks to cover a second stack. Play hand 1, then hand 2; net Quarks on your seat is the sum of both stacks vs the dealer. |
| **Lab Assistant tablemate (seat 2, vs AI)** | LLM on seat 2 via `agent.ts` + structural tool; **`chooseCompanionMove`** appears only as a **basic-strategy advisory** in the prompt (split logic uses **`shouldCompanionSplit`**). Agent turn stream plays each split stack before dealer settlement. |
| **Friend (seat 2, heads-up)** | Same split rules as you when it is their turn via **`submitMove`**. |

Split-even (one stack wins, one loses for the same amount) is **not** shown as a push — net zero on your seat is reported explicitly.

## Flow

- **Vs AI:** you act first (hit / stand / double / **split**), then the **Lab Assistant** on seat 2 acts (LLM; may **split** when it chooses), then the dealer resolves both player hands. Your ledger uses seat 1 only. If **both** of you lose vs the dealer, your Quark loss is **halved** (tablemate relief).
- **Heads-up:** seat 1 plays, then seat 2, then the dealer resolves **both** wagers. Match winner = better **net Quarks** on the hand vs the dealer.

## Quarks (lobby)

Default is **simulated** Quarks (`rules.practice` — no ledger). Check **Play for Quarks** to opt in before vs Lab Assistant or a friend invite; wins and losses then hit your wallet. Invites carry the inviter’s choice.

Lobby pattern matches Texas Hold'em (`GameLobbyModePanel`, Lab Messages invites, `useTurnBasedMatch`). Vs AI: `agentMode: 'llm'` on seat 2 (platform agent turn stream after you stand or bust).

## Card UI

Playing cards use shared **`LabPlayingCard`** (same chrome as Texas Hold'em).

## Verify

```bash
npm run test:path "blackjack-rules"
npx tsx src/scripts/register-game-apps-once.ts app-blackjack
```

Launch from the catalog after registration; server entry `src/apps/blackjack/back-end/entry.ts`.
