/**
 * Shared agent instructions for catalogue game apps on the shared game-platform kit.
 *
 * One `block()` per app id. Games that share the same architecture use the template;
 * bespoke games (e.g. Blackjack) export a dedicated string. If a block diverges,
 * split it into its own file rather than adding conditionals here.
 */

function block(appId: string, title: string, slug: string, port: number): string {
  return `# App System Instructions: ${title}

## Overview

\`${appId}\` is a **hybrid** catalog game. UI: \`src/apps/${slug}/front-end/App.vue\`; app server on **\`props.serverUrl\`** (port **${port}**).

**Runs on the shared game-platform kit** (\`src/shared/game-platform/\`): the match engine, runs/leaderboards, HTTP routes and socket registrar all come from the kit. The app supplies only its rules adapter (\`back-end/adapter.ts\` + \`rules.ts\`), catalog entry and board UI. It does **not** implement its own match loop, invite flow or scoring.

## Vs-AI

The adapter declares a \`structuralTool\` block on \`createTurnBasedAdapter\`. The kit's agent loop owns retries, rejection feedback and temperature escalation; the app supplies the prompt (\`back-end/agent.ts\`) and the move schema (\`shared/{game}-agent-move-schema.ts\`). There is **no heuristic fallback** — an unusable reply errors the turn.

Difficulty is \`easy\` | \`medium\` | \`hard\` | \`boss\`; tier intent and the temperature table come from \`src/shared/game-platform/difficulty-policy.ts\`.

## PvP invites

Uses \`useGameInvites\` + \`GAME_APP_INVITE_REGISTRY\` — \`game.invite\` and \`game.match.ready\` envelopes; the platform resolves socket acks on the app port.

## UI

Lobby chrome comes from \`src/shared/game-platform/ui/\` (\`GameManagerLobby\`, \`GameModePicker\`, \`TurnTimerHud\`, \`PlayerTurnsPanel\`, …). The board is a **pure renderer** of \`match.state\`: it holds no game rules and never decides legality. Every move is submitted through \`useTurnBasedMatch().submitMove\`.

**Optional Quarks frame wager** (signed-in lobby): same tiers as Billiards — vs-AI stake follows difficulty (50 / 250 / 500 / 1000); PvP invite picks one of those amounts. Kit: \`src/shared/game-platform/catalog-match-wager.ts\` (\`withCatalogMatchWager\` on the adapter) and \`useCatalogGameWagerLobby\` wired through \`GameLobbyModePanel\` in \`App.vue\` (\`wagerQuarks\` in create/invite rules, settlement on \`virtualBankSettlements\`).

**Do not** reintroduce client-side rules (move validation, win detection, ship placement). A second source of truth drifts from the server, which is what actually adjudicates.

**Automation scope:** class \`${slug}-app\`. All interactive elements use \`useUniqueElementId()\`. DnD games use \`@vue-dnd-kit/core\`.

## Sidecar table talk (vs Lab Assistant)

Proactive banter uses \`createLabAssistantBanterHooks\` in \`useTurnBasedMatch\` and per-game \`detectBanterMoment\` under \`src/shared/game-platform/lab-assistant-banter/detectors/\`. Prompt guardrails: \`banter-game-playbooks.ts\` + \`build-banter-llm-prompt.ts\` (billiards is the reference depth). Agents debugging bad banter should fix **moment ownership** (who fired), **Facts/playbook lines**, and **state redaction** in \`format-lab-game-match-state-for-prompt.ts\` — not move-turn \`agent.ts\` prompts. User doc: \`docs/platform/lab-sidecar-game-banter.md\`.

User doc: \`docs/apps/${slug}.md\`.
`;
}

export const checkersAppInstructions = block('app-checkers', 'Checkers', 'checkers', 4103);
export const chessAppInstructions = block('app-chess', 'Chess', 'chess', 4104);
export const hangmanAppInstructions = block('app-hangman', 'Hangman', 'hangman', 4105);
export const connectFourAppInstructions = block('app-connect-four', 'Connect Four', 'connect-four', 4106);
export const battleshipAppInstructions = block('app-battleship', 'Battleship', 'battleship', 4107);
export const pokerHoldemAppInstructions = block('app-poker-holdem', "Texas Hold'em", 'poker-holdem', 4108);
export const ticTacToeAppInstructions = block('app-tic-tac-toe', 'Tic-Tac-Toe', 'tic-tac-toe', 4109);

export const blackjackAppInstructions = `# App System Instructions: Blackjack

## Overview

\`app-blackjack\` is a **hybrid** catalog game. UI: \`src/apps/blackjack/front-end/App.vue\`; app server on **\`props.serverUrl\`** (port **4117**).

**Runs on the shared game-platform kit** — match engine, invites, Quarks ledger via \`virtualBankSettlements\`. Rules live in \`back-end/rules.ts\`. **Dealer = house rules** (hit to 17, scripted in \`finalizeHand\`) — the dealer **never splits**; only player seats 1 and 2 may split. **Vs dealer:** seat 2 is the **Lab Assistant** (\`agentMode: 'llm'\`, \`back-end/agent.ts\`, \`blackjack_submit_move\`) — two hands vs the same dealer; your Quarks outcome is seat 1 only. **Heads-up PvP:** two humans, same dealer.

## Modes

- **Vs dealer (AI match):** you + **Lab Assistant** on seat 2 vs the shared dealer; you act first, then the LLM tablemate (\`agentMoveAsync\`), then the house settles. If you **both** lose, your Quark loss is halved. Lobby **Play vs Lab Assistant**.
- **Heads-up PvP:** **one friend only** — two human seats, shared dealer; seat 1 then seat 2, then dealer settlement. Lobby **Invite a friend** + \`useGameInvites\`. Multi-player (>2 humans) is **not** implemented yet.

Turn order uses \`activeSeat\` + \`nextSeatAfterMove\` (\`headsUp\` when \`opponentKind === 'human'\`). After you finish seat 1, \`match-service\` streams **LLM agent turns** for seat 2 (\`adapter.agentMoveAsync\` / \`agent.ts\`) until seat 2 is done, then the dealer resolves.

## Split (seats 1 and 2 only)

- **When:** \`legalActions\` includes \`split\` only on the **first two cards of the active stack**, matching ranks, **one split per seat per hand**, and enough Quarks to match the original \`bet\` on the new stack (\`committed[seat]\` doubles).
- **Play order:** After split, \`splitHands[seat]\` holds two stacks; \`activeHandIndex\` walks hand 1 then hand 2 (hit/stand/double per stack). Turn history logs \`Split — {2×bet} Quarks total\`.
- **Settlement:** \`settleSeatStacks\` sums win/loss per stack into \`seatDelta[seat]\`. Vs dealer, your ledger uses **seat 1 net only**; split-even (one win + one loss) is **not** a push.
- **Lab Assistant tablemate:** When \`activeSeat === 2\`, the model chooses hit/stand/double/split via \`blackjack_submit_move\`. \`chooseCompanionMove\` is surfaced in the user prompt as a **basic-strategy advisory** only (split hints use \`shouldCompanionSplit\`). The agent turn stream applies moves until both split stacks are done.
- **Heads-up friend:** Seat 2 human uses the same \`split\` action via \`submitMove\` when it is their turn.

## UI

Lobby: \`GameLobbyModePanel\` (same pattern as Texas Hold'em). Table: \`BlackjackTableSurface\` + \`LabPlayingCard\` (shared kit card chrome). Moves only via \`useTurnBasedMatch().submitMove\`. Split hands render as separate stacks for **you** and the **Lab Assistant tablemate** (\`playerHandViews\`).

User doc: \`docs/apps/blackjack.md\`.
`;
