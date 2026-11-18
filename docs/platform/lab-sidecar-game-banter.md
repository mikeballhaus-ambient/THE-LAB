# Lab Sidecar — vs–Lab Assistant game banter audit

Sidecar **table talk** is separate from in-game **move turns**. Pipeline: `createLabAssistantBanterHooks` → game `detectBanterMoment` → `buildLabGameBanterTurnUserContent` → optional `appendLabGameMatchSnapshotToPrompt`.

**Reference implementation:** billiards (`billiards-banter-moments.ts`, Billiards table flow in `format-lab-game-match-state-for-prompt.ts`). Do not regress billiards when extending other games.

## Audit matrix (catalog vs–AI games)

| Game | Moment detector | Prompt playbook | State / roster for banter | Notes |
|------|-----------------|-----------------|---------------------------|--------|
| Billiards | App-local (rich) | Inline in `build-banter-llm-prompt.ts` | Ball roster + table flow | **Reference** — keep as-is |
| Chess | `chess-banter-moments.ts` | `banter-game-playbooks.ts` | Chess piece roster | Capture/check ownership in Facts |
| Checkers | `detectors/checkers-tile-grid-banters.ts` | Playbook | Turn history + state JSON | Capture via piece count / keywords |
| Connect Four | `detectors/grid-games.ts` | Playbook | Grid in JSON | `block` moment |
| Tic-Tac-Toe | Match end only | Playbook | Grid in JSON | Thin mid-game moments |
| Battleship | `detectors/battleship.ts` | Playbook + hit ownership Facts | **Battleship tracking** + redacted JSON | **No coords / ship classes** in speech; human hit ≠ assistant shooter voice |
| Hangman | `detectors/hangman.ts` | Playbook | Strikes / guesses only | Never leak solution word |
| Poker Hold'em | `detectors/poker-holdem.ts` | Playbook | History + scores | No invented hole cards |
| Word tile | Score swing highlight | Playbook | Scores | Large play detail from history only |
| Blackjack | Match end only | Playbook | Table state | Seat-2 LLM tablemate; dealer scripted |

## Battleship (regression that motivated this doc)

When the **human** scores a hit on the enemy grid, banter must:

1. Treat **Who just moved** as the human — assistant reacts as the fleet that was **struck**.
2. Avoid grid coordinates and ship type names (destroyer, carrier, …) in the spoken line.
3. Never use shooter gloating ("Caught you on 3,3") for the opponent's salvo.

Implementation: `banter-game-playbooks.ts` (Battleship section), hit event copy in `describeMoment`, `formatBattleshipTrackingForPrompt`, and fleet redaction in `formatLabGameMatchStateSections`.

## Extending banter for a new game

1. Add `detectBanterMoment` in `src/shared/game-platform/lab-assistant-banter/detectors/` (or app-local if state is exotic).
2. Wire `App.vue` `onUpdate` hooks like existing catalog games.
3. Add rows to `PLAYBOOK_BY_GAME` in `banter-game-playbooks.ts` (unless the game is billiards-tier and needs inline prompt blocks).
4. If secrets live in `match.state`, add a roster or redacted JSON section in `format-lab-game-match-state-for-prompt.ts`.
5. Extend `src/tests/ci/shared/lab-game-banter-llm-prompt.test.ts` and game-specific detector tests.

See also: [lab-sidecar.md](lab-sidecar.md).
