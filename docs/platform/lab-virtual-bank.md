# Lab virtual bank (Quarks)

Platform-wide **play-money** balance for THE-LAB users — not real currency. The user-facing unit is **Quarks** (see naming below). Balances live in the **main** SQLite database (`lab_virtual_bank_accounts` + `lab_virtual_bank_ledger`), keyed by platform `users.id`.

## Currency display name (single source of truth)

**Change the lab-wide currency label in one file:**

[`src/shared/constants/lab-quarks-currency.ts`](../../src/shared/constants/lab-quarks-currency.ts)

- `LAB_QUARKS_CURRENCY` — `name`, `nameSingular`, badge label, toast title, ledger labels, disclaimer
- `formatLabQuarksAmount`, `formatLabQuarksDelta`, `formatLabQuarksDeltaWithBalance` — all user-facing amounts

API routes and tables keep the `virtual-bank` identifier; only **display copy** uses Quarks.

## Policy (defaults)

| Setting | Default |
|---------|---------|
| Opening balance | 10,000 Quarks |
| Daily allotment | 500 Quarks / UTC calendar day (tune `LAB_VIRTUAL_BANK_DAILY_ACCRUAL`) |
| Daily accrual cap | Skipped while balance ≥ 15,000 Quarks (`LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP`) |
| Offline catch-up | Up to 30 days accrue on next balance read |
| Overdraft | Allowed — balance may go negative |

Numeric policy constants: [`src/shared/types/lab-virtual-bank.ts`](../../src/shared/types/lab-virtual-bank.ts).

## Workflow Studio (login allotment)

The seeded graph **Platform: Quarks daily allotment on login** (`platform.auth.session.established`) orchestrates:

1. **`virtual_bank_get_wallet`** — read balance + `dailyAllotmentEligible` **without** posting accrual (safe for IF branches).
2. **`if_condition`** on `dailyAllotmentEligible`.
3. **`virtual_bank_credit_daily_allotment`** on the true branch (same ledger rules as `ensureAccountWithAccrual`).
4. **`show_user_toast`** — PrimeVue toast over `/lab-events` (offline users skip; fail-open).

`GET /api/platform/virtual-bank` still accrues on read as a v1 safety net when the workflow is disabled. Disable session publishing with `LAB_AUTH_SESSION_EVENTS=0`.

## HTTP API (platform `:3000`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/platform/virtual-bank` | Session / user JWT / app service + actor |
| GET | `/api/platform/virtual-bank/ledger?limit=25` | Same |
| POST | `/api/platform/virtual-bank/adjust` | **App service token only** |

Apps proxy GET routes via `/api/platform/virtual-bank` on the **app server** (same-origin).

## Apps — UI

- `useLabVirtualBank({ serverUrl })` — loads balance through the app proxy.
- `LabVirtualBankBadge` — header chip (wallet + Quark count).
- Toasts (via `useLabAppToast`):
  - **Daily allotment** — green toast on the **first balance read of each UTC day** when accrual credits (opening any app that calls `useLabVirtualBank`).
  - **Game / other deltas** — success when Quarks increase, error when they decrease (after refresh, e.g. match finished).

## Apps — server (game kit)

When a turn-based match **finishes**:

1. If `rules_json.practice` is true, **no ledger lines** (Blackjack / Hold'em practice tables — simulated Quarks in UI only).
2. If the adapter defines **`virtualBankSettlements`**, those ledger lines run (e.g. Hold'em pot transfer).
3. Else if `LAB_VIRTUAL_BANK_WIN_REWARDS` lists `appId:gameId`, the **human winner** gets a win bonus (Battleship, Chess, …).

Adjustments call the platform with the app service token (`applyLabVirtualBankAdjustment`).

## Optional frame wagers (catalog games)

Many turn-based catalog games (Chess, Checkers, Connect Four, Battleship, Word Tile, Billiards, …) support an **optional Quarks wager on the whole match** — separate from in-game betting (Hold'em blinds, Blackjack table bets).

- **Vs Lab Assistant:** stake tracks **difficulty** — easy **50**, medium **250**, hard **500**, boss **1000** Quarks (`catalogWagerStakeForDifficulty` in [`catalog-match-wager.ts`](../../src/shared/game-platform/catalog-match-wager.ts)).
- **Invite a friend:** inviter picks a stake from the same tier list (50 / 250 / 500 / 1000); the amount appears on the Lab Messages invite card before accept.
- **Settlement:** winner receives the stake; loser is debited (PvP debits both sides). Draws do not move frame wager Quarks. Server adapters wrapped with `withCatalogMatchWager` post ledger lines via `virtualBankSettlements`.
- **Lobby UI:** `useCatalogGameWagerLobby` + `GameLobbyModePanel` checkboxes in each app’s `App.vue`.

Hold'em and Blackjack keep their **practice / real-play table Quarks** opt-in; frame wager is an additional optional checkbox in the same lobby panel.

## Game UI hints (rm-68.5)

Purchasable **in-game overlay** assists — **not** Sidecar banter or LLM move advice. SKU matrix: [lab-quarks-hints.md](lab-quarks-hints.md).

| Piece | Detail |
|-------|--------|
| Ledger | `reasonCode: hint_purchase` |
| App route | `POST /api/game-hints/purchase` (`skuId`, `sourceRef`) — debits via platform `virtual-bank/adjust` |
| Client | `useLabGameHint` + `purchaseLabGameHint` |
| Pilot | Billiards `shot-path` (50 Quarks per shot attempt; practice free) |

## Lab activity credits (catalog apps)

Signed-in users earn **one-time** Quarks for participation. Amounts live in `LAB_ACTIVITY_QUARK_REWARDS` ([`lab-virtual-bank.ts`](../../src/shared/types/lab-virtual-bank.ts)). App servers call [`grantLabActivityQuarkReward`](../../src/shared/server/grant-lab-activity-quark-reward.node.ts) after a successful action; duplicates are skipped when the same `sourceRef` already exists for that user.

| Activity | App id | Default Quarks | Idempotency |
|----------|--------|----------------|-------------|
| Poll response | `app-polls-surveys` | 75 | Once per poll per user |
| Event RSVP | `app-event-rsvp` | 50 | Once per event per user |
| Quiz pass | `app-training-quizzes` | 100 | Once per quiz per user (first pass) |
| New suggestion | `app-suggestion-box` | 60 | Once per suggestion row |

Reason codes: `poll_reward` for polls; `activity_reward` for the others. Anonymous or unsigned actions do not credit.

## Shell UI

Signed-in users see **Quarks** + balance in **quick nav** (after Notifications). Click opens the **Quarks wallet** dialog (balance, daily allotment, recent ledger). Balance syncs from any `useLabVirtualBank` refresh. User-facing copy also appears in **About THE-LAB** → **Games & Quarks** (Quarks, wallet, **Play vs Lab Assistant**, Sidecar at the table, settlements).
