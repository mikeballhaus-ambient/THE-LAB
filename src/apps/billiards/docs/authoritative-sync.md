# Billiards — authoritative client / server sync

## Source of truth

| Data | Authority |
|------|-----------|
| Ball positions, pocketed flags, phase, turn seat | **Server match state** (`props.state` / SQLite `state_json`) |
| Shot legality & final layout | Server `simulateShot` + rules adapters |
| Break variance | `physicsVarianceSeed` on state + `resolveShotForSimulation` (deterministic on server + client) |

The client **never** invents layout. It may run a **preview** Rapier roll only while physics is actively running or while a **human** shot awaits server ack.

## Felt rendering (`billiards-felt-layout.ts`)

- **Authoritative:** `props.state.balls` whenever preview mode is `off`.
- **Preview (`live`):** `animatedBalls` only while `isRolling` or `awaitingHumanShotAck` with overlay data present.
- **Opponent replay hold:** while `isBilliardsPendingOpponentShotReplay` (or `opponentReplayBusy` before roll), felt uses `lastShotReplay.preShotBalls` or a committed human-preview baseline — **not** post-shot `props.state.balls` — so the server layout does not flash before aim/roll replay. Pre-shot clone is **not** used for chrome (turn, phase, BIH).

Pre-shot layout is always the input to `playShotRoll(preShot, shot)`; the hold only bridges the one frame (and aim-pull window) before Rapier preview is live.

## Shots

1. `stampShotWithAuthoritativeCue` — cue center on payload + pre-shot layout (`billiards-shot-stamp.ts`).
2. **Human (competitive):** emit `shot` move **before** `playShotRoll` so server sim runs in parallel; clear preview on `shotsTaken` ack.
3. **Opponent replay:** server state **already applied**; do not set `awaitingHumanShotAck`. Replay builds pre-shot from `lastShotReplay.preShotBalls` (and `lastCuePlaceReplay.prePlaceBalls` for ball-in-hand). `lastShotReplay` carries the **post–`resolveShotForSimulation`** payload with `shotVarianceResolved: true`; client `playShotRoll` must **not** apply break variance twice or replay physics will disagree with server fouls.

## Opponent presentation

- Client **`useBilliardsPresentationStore`** (`front-end/stores/billiardsPresentation.ts`) ingests each authoritative payload via `ingestAuthoritative({ matchId, yourSeat, practiceMode, state })` and runs a **single job queue** (`shot` | `place` with `preShotBalls` / `prePlaceBalls`). Derived `presentationStatus` gates `canShoot`, opponent replay hold, and ball-in-hand chrome.
- Chrome (phase, kitchen, BIH) always reads **server state** (`props.state` / match), not a deferred clone.
- `lastShotReplay` drives aim/pull animation; effective shot includes break variance. Roll overlays use tokenised sessions so superseded strokes abandon without writing stale poses.

## Match delivery (vs Lab Assistant and PvP)

Every competitive client applies updates through **one** path: `useTurnBasedMatch` → `applyAuthoritativeMatch` → `shouldApplyMatchViewRevision` (`MatchView.stateRevision` / SQLite `state_version`). Inbound channels:

| Channel | When |
|---------|------|
| Own `matchMove` ack | After your shot or placement |
| `matchState` push | Opponent's move (AI or human) |
| `refreshMatch` | Turn timer expiry / shot-ack watchdog |
| `matchAgentDone` | Lab Assistant finished a turn |

Stale snapshots (older `stateRevision`) are dropped; equal revision is treated as idempotent. **Human PvP** uses the same replay and ordering rules as vs AI — there is no second client sync implementation.

## When preview differs from server

Client Rapier may diverge slightly from Node server stepping. On server ack, preview is **discarded** — user sees authoritative balls only.

Opponent replay uses `settleBalls`: Rapier pocket capture only commits when the server also pocketed that ball; frames strip client-only pockets and promote server-pocketed balls into the sink zone once the preview reaches the throat. Final 3D poses snap to server coordinates for balls left on the felt. **Match pocket trays** follow `animatedBalls` during opponent rolls (same live tray animation as human shots); only aim/pull defers tray sync. Long term: optional frame replay from server or locked RNG audit trail.
