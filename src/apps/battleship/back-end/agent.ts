import type { PlatformLlmToolFeedbackTurn } from '@/shared/types/platform-llm-completion';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { agentDifficultyLine, buildAgentSystemPrompt } from '@/shared/game-platform/difficulty-policy';
import {
  BATTLESHIP_SUBMIT_MOVE_TOOL_ID,
  BattleshipAgentMoveSchema,
} from '../shared/battleship-agent-move-schema';
import {
  BS_SIZE,
  coordKey,
  fleetSunk,
  isShipCell,
  opponentSeat,
  shipsAfloat,
  shipSunk,
  type BsSeat,
  type BsShotMap,
  type BsState,
} from './rules';
import {
  BATTLESHIP_AGENT_STRATEGY_BY_TIER,
  BATTLESHIP_STRATEGY_CORE,
  BATTLESHIP_USER_TURN_CHECKLIST,
} from './battleship-agent-strategy';

/** Battleship's only move: fire at one cell. Declared here (not in rules). */
export interface BsAgentMove {
  type: 'fire';
  row: number;
  col: number;
}

/**
 * Battleship's agent surface: prompt construction and shot grading.
 *
 * This is a fog-of-war game, so the prompt must be careful what it reveals: the
 * agent sees **its own fleet** (to reason about losses) and **only the shots it
 * has fired** at the enemy. It must never be told where enemy ships are.
 */

const TIER_TIPS: Record<GameDifficulty, string> = {
  easy: 'Fire at random unshot cells.',
  medium: 'Prefer cells adjacent to your previous hits.',
  hard: 'Track sunk ships and hunt the remaining ones systematically.',
  boss: 'Finish wounded ships first, then search efficiently.',
};

const AGENT_ROLE = `You are a Battleship opponent on an ${BS_SIZE}x${BS_SIZE} board.`;
const FLEET = 'Fleet sizes: 4, 3, 3, 2, 2 (five ships).';

const TOOL_CONTRACT = `OUTPUT CONTRACT (required every turn):
- Call the tool \`${BATTLESHIP_SUBMIT_MOVE_TOOL_ID}\` exactly once with {"row": <0-7>, "col": <0-7>}.
- Put the shot ONLY in the tool arguments — never in assistant text.
- Row 0 is the top edge, row 7 the bottom. Column 0 is the left edge.
- Fire only at cells on the ENEMY board that you have not already shot.
- You cannot see enemy ship positions — infer them from your hits and misses.
- If a previous attempt was rejected, the reason is given below.`;

/** Your own board: ships (`S`), enemy hits on you (`X`), their misses (`o`). */
function renderOwnBoard(state: BsState, seat: BsSeat): string {
  const incoming = state.shotsAt[seat === 1 ? 2 : 1] ?? {};
  const fleet = state.fleets[seat] ?? [];
  const lines: string[] = ['   0 1 2 3 4 5 6 7'];
  for (let r = 0; r < BS_SIZE; r += 1) {
    const cells: string[] = [];
    for (let c = 0; c < BS_SIZE; c += 1) {
      const key = coordKey(r, c);
      const shot = incoming[key];
      if (shot === 'hit') {
        cells.push('X');
      } else if (shot === 'miss') {
        cells.push('o');
      } else {
        cells.push(isShipCell(fleet, r, c) ? 'S' : '.');
      }
    }
    lines.push(`${r}  ${cells.join(' ')}`);
  }
  return lines.join('\n');
}

/** The enemy board as you know it: `.` unshot, `X` hit, `o` miss. */
function renderEnemyBoardKnown(shots: BsShotMap): string {
  const lines: string[] = ['   0 1 2 3 4 5 6 7'];
  for (let r = 0; r < BS_SIZE; r += 1) {
    const cells: string[] = [];
    for (let c = 0; c < BS_SIZE; c += 1) {
      const shot = shots[coordKey(r, c)];
      cells.push(shot === 'hit' ? 'X' : shot === 'miss' ? 'o' : '.');
    }
    lines.push(`${r}  ${cells.join(' ')}`);
  }
  return lines.join('\n');
}

function unshotCells(shots: BsShotMap): string[] {
  const out: string[] = [];
  for (let r = 0; r < BS_SIZE; r += 1) {
    for (let c = 0; c < BS_SIZE; c += 1) {
      if (!(coordKey(r, c) in shots)) {
        out.push(`${r},${c}`);
      }
    }
  }
  return out;
}

/** Adjacent-to-a-hit cells that are still unshot — the highest-value targets. */
function huntTargets(shots: BsShotMap): string[] {
  const out = new Set<string>();
  for (let r = 0; r < BS_SIZE; r += 1) {
    for (let c = 0; c < BS_SIZE; c += 1) {
      if (shots[coordKey(r, c)] !== 'hit') {
        continue;
      }
      for (const [dr, dc] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= BS_SIZE || nc >= BS_SIZE) {
          continue;
        }
        if (!(coordKey(nr, nc) in shots)) {
          out.add(`${nr},${nc}`);
        }
      }
    }
  }
  return [...out].sort();
}

export function buildUserPrompt(
  state: BsState,
  seat: number,
  difficulty: GameDifficulty,
  options?: { lastRejection?: string },
): string {
  const mySeat = seat as BsSeat;
  const shots = state.shotsAt[mySeat] ?? {};
  const myFleet = state.fleets[mySeat] ?? [];
  const myShots = Object.keys(shots).length;
  const hits = Object.values(shots).filter((v) => v === 'hit').length;
  const afloat = shipsAfloat(myFleet, state.shotsAt[seat === 1 ? 2 : 1] ?? {});
  const unshot = unshotCells(shots);
  const targets = huntTargets(shots);

  const lines = [
    agentDifficultyLine(difficulty, TIER_TIPS),
    '',
    `You are seat ${seat}. ${FLEET}`,
    '',
    'YOUR board (S = your ship, X = enemy hit on you, o = enemy miss on you):',
    renderOwnBoard(state, mySeat),
    `Your ships still afloat: ${afloat} of ${myFleet.length}.`,
    '',
    'ENEMY board as you know it (. = not yet shot, X = your hit, o = your miss):',
    renderEnemyBoardKnown(shots),
    `Shots fired: ${myShots}, hits: ${hits}.`,
    `Unshot cells remaining: ${unshot.length}.`,
  ];

  if (targets.length) {
    lines.push(
      `Recommended: fire adjacent to a hit — ${targets.slice(0, 12).join(' ')}${targets.length > 12 ? ' …' : ''}`,
    );
  }

  // Own-ship loss detail: which of YOUR ships are already sunk (useful for strategy).
  const sunkOwn = myFleet.filter((s) =>
    shipSunk(s, state.shotsAt[seat === 1 ? 2 : 1] ?? {}),
  );
  if (sunkOwn.length) {
    lines.push(`Your sunk ships: ${sunkOwn.map((s) => s.id).join(', ')}.`);
  }

  if (options?.lastRejection) {
    lines.push('', `Your previous attempt was REJECTED: ${options.lastRejection}`);
  }

  const checklist =
    difficulty === 'hard' || difficulty === 'boss'
      ? BATTLESHIP_USER_TURN_CHECKLIST[difficulty]
      : undefined;
  if (checklist) {
    lines.push('', checklist);
  }

  lines.push('', TOOL_CONTRACT);
  return lines.join('\n');
}

/** Assembled system prompt for a tier. */
export function buildSystemPrompt(difficulty: GameDifficulty): string {
  return buildAgentSystemPrompt({
    baseRules: `${AGENT_ROLE}\n\n${TOOL_CONTRACT}\n\n${BATTLESHIP_STRATEGY_CORE}`,
    difficulty,
    gameMechanicsByTier: BATTLESHIP_AGENT_STRATEGY_BY_TIER,
  });
}

/** Grade a shot; throws with a model-facing reason when illegal. */
export function gradeAgentMove(raw: unknown, state: BsState, seat: number): BsAgentMove {
  const parsed = BattleshipAgentMoveSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `Invalid arguments: ${issue?.message ?? 'expected {"row": 0-7, "col": 0-7}.'}`,
    );
  }
  const { row, col } = parsed.data;

  const mySeat = seat as BsSeat;
  const opponent = opponentSeat(mySeat);
  const lost = fleetSunk(state.fleets[mySeat] ?? [], state.shotsAt[opponent] ?? {});
  const won = fleetSunk(state.fleets[opponent] ?? [], state.shotsAt[mySeat] ?? {});
  if (lost || won) {
    throw new Error('The game is already over — no further shots are possible.');
  }
  if (row < 0 || row >= BS_SIZE || col < 0 || col >= BS_SIZE) {
    throw new Error(`Cell (${row},${col}) is off the board. Use row and col from 0 to ${BS_SIZE - 1}.`);
  }
  const shots = state.shotsAt[mySeat] ?? {};
  if (coordKey(row, col) in shots) {
    const previous = shots[coordKey(row, col)];
    throw new Error(
      `You already fired at (${row},${col}) — it was a ${previous}. Choose a cell you have not targeted.`,
    );
  }
  return { type: 'fire', row, col };
}

/** Model-facing hint appended to a rejected tool result. */
export function toolResultHint(error: string): string | undefined {
  if (error.includes('already fired')) {
    return 'Target a `.` cell on the enemy board shown in the first user message — `.` means not yet shot.';
  }
  if (error.includes('off the board')) {
    return `Coordinates must be 0-${BS_SIZE - 1}. Row 0 is the top edge.`;
  }
  return 'Fire at an unshot cell on the ENEMY board. Board and turn are unchanged.';
}

/** Extra nudge on retry. */
export function retryUserHint(context: {
  lastRejection: string;
  priorTurns: readonly PlatformLlmToolFeedbackTurn[];
}): string {
  return (
    `Attempt ${context.priorTurns.length + 1} rejected: ${context.lastRejection} ` +
    'Pick a cell marked `.` on the enemy board and fire again.'
  );
}

/** Player-facing note while the AI is thinking. */
export function attemptNote(_toolArguments: string, error: string): string {
  return `Tried an illegal shot — ${error}`;
}
