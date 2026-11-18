/**
 * Vs-AI difficulty policy — shared across every turn-based catalogue game.
 *
 * ## Product contract (agent opponents)
 *
 * Vs-AI matches exist so lab owners can pit **their chosen LLM** against a human.
 * The opponent **decides** each move via the platform agent turn (structural tool or
 * graded prose) — not a hidden rules engine playing for them.
 *
 * - **Difficulty is guidance, not an algorithm.** Easy tiers allow mistakes, simpler
 *   plans, and higher sampling temperature; boss tiers add richer per-game strategy
 *   and tighter temperature so the model *tries* to play sharply — the human can still
 *   win on easy/medium when the model ignores hints.
 * - **Every vs-AI game** should ship tiered strategy: at minimum {@link agentDifficultyLine}
 *   tips + {@link BASE_GUIDANCE}; prefer {@link buildAgentSystemPrompt} with
 *   {@link GameAgentDifficultyMechanics} (see chess / word-tile) and turn-level context
 *   in `buildUserPrompt`.
 * - **Optional local search** (minimax, hunt lists, etc.) may appear in the user prompt
 *   as **ranked hints only** — never as auto-played moves. Catalog adapters must not
 *   wire `chooseSearchMove` for normal vs-AI; that hook is for benchmarks/scripted modes.
 *
 * **Blackjack vs dealer:** seat 2 is still an LLM tablemate like other catalog games; only the
 * **house dealer** is scripted in rules (`finalizeHand`). `chooseCompanionMove` is advisory text
 * in the seat-2 agent prompt — not auto-play.
 *
 * A difficulty tier has two halves:
 *
 * 1. **Generic intent** — what "easy" vs "boss" means for *any* opponent. This is
 *    the same everywhere, so it lives here rather than being restated per app.
 * 2. **Game tip** — the one or two sentences that only make sense for this game
 *    ("captures are mandatory", "finish wounded ships first"). Apps supply this;
 *    richer games add full per-tier mechanics via {@link buildAgentSystemPrompt}.
 *
 * Sampling temperature is part of the policy too. It used to be duplicated as
 * `difficulty === 'boss' ? 0.1 : 0.3` in seven adapters, which silently collapsed
 * easy/medium/hard into one identical temperature. {@link AGENT_DIFFICULTY_TEMPERATURE}
 * is the calibrated table — Word Tile's, the only set that was actually tuned.
 */
import type { GameDifficulty } from './types';

/**
 * Sampling temperature per tier. Lower = more deterministic / more clinical play.
 * Easy is deliberately loose so the model varies its choices; boss is tight.
 */
export const AGENT_DIFFICULTY_TEMPERATURE: Record<GameDifficulty, number> = {
  easy: 0.38,
  medium: 0.22,
  hard: 0.15,
  boss: 0.1,
};

/**
 * Platform agent completions: narrow nucleus only.
 * Do not set repeat_penalty / frequency_penalty — they punish JSON/tool argument
 * tokens (repeated `"`, `row`, `col`) and cause letter-cycling on the same cells.
 */
export const DEFAULT_AGENT_LLM_SAMPLING = { top_p: 0.86 } as const;

/** Generic tier intent — identical for every game. */
const BASE_GUIDANCE: Record<GameDifficulty, string> = {
  easy: `DIFFICULTY TIER: EASY
- Play like a casual opponent: favour safe, simple, readable decisions over optimal play.
- Avoid rare or high-risk lines unless they are clearly correct.
- Keep reasoning short (one reasonable plan, minimal lookahead).
- Intent: the human should often win with modest effort.`,

  medium: `DIFFICULTY TIER: MEDIUM
- Play like a competent hobbyist: solid fundamentals, few unforced errors.
- Balance progress with safety; punish obvious mistakes but not every micro-edge.
- Choose good moves, not necessarily the global best every turn.
- Intent: a fair match — winning requires attention, not perfection.`,

  hard: `DIFFICULTY TIER: HARD
- Play competitively: maximise expected advantage each decision within the rules given.
- Prefer stronger lines when choosing between legal options of similar risk.
- Minimise idle or wasteful actions unless strategically justified.
- Intent: the human must play well to win.`,

  boss: `DIFFICULTY TIER: BOSS
- Play near-optimally: treat each decision as high stakes.
- Aggressively pursue the best feasible outcome.
- Only take passive actions when no constructive line exists.
- Intent: punishing; mistakes should cost the human the game.`,
};

/** Per-tier game-specific tips. Any tier may be omitted. */
export type GameDifficultyTips = Partial<Record<GameDifficulty, string>>;

/** Temperature for a tier. */
export function agentTemperature(difficulty: GameDifficulty): number {
  return AGENT_DIFFICULTY_TEMPERATURE[difficulty];
}

/**
 * The difficulty block for a game's user prompt: the game's own tip (if any)
 * followed by the generic tier intent.
 */
export function agentDifficultyLine(
  difficulty: GameDifficulty,
  tips?: GameDifficultyTips,
): string {
  const tip = tips?.[difficulty]?.trim();
  return tip ? `${tip}\n\n${BASE_GUIDANCE[difficulty]}` : BASE_GUIDANCE[difficulty];
}

/** Generic tier intent alone, when a game has no tip for the tier. */
export function baseDifficultyGuidance(difficulty: GameDifficulty): string {
  return BASE_GUIDANCE[difficulty];
}

/** Standard user-message line pointing the model at the system difficulty block. */
export function formatDifficultyUserLine(difficulty: GameDifficulty, gameId?: string): string {
  const game = gameId ? ` (game: ${gameId})` : '';
  return `Match difficulty tier: ${difficulty}${game}. Behavior is defined in the system message (tier + any game mechanics).`;
}

/** Optional per-tier appendix merged into the tier guidance. */
export type GameAgentDifficultyMechanics = Partial<Record<GameDifficulty, string>>;

export interface BuildAgentSystemPromptOptions {
  /** Role, output schema, and rules for this game. */
  baseRules: string;
  difficulty: GameDifficulty;
  /** Optional per-tier appendix (defaults to no mechanics). */
  gameMechanicsByTier?: GameAgentDifficultyMechanics;
  /** Optional single appendix applied at every tier. */
  gameMechanicsForAllTiers?: string;
}

export function buildAgentDifficultySection(
  difficulty: GameDifficulty,
  gameMechanics?: GameAgentDifficultyMechanics,
  gameMechanicsForAllTiers?: string,
): string {
  const parts: string[] = [BASE_GUIDANCE[difficulty]];

  const tierMechanics = gameMechanics?.[difficulty]?.trim();
  if (tierMechanics) {
    parts.push(`GAME MECHANICS (${difficulty}):\n${tierMechanics}`);
  }

  const allTiers = gameMechanicsForAllTiers?.trim();
  if (allTiers) {
    parts.push(`GAME MECHANICS:\n${allTiers}`);
  }

  return parts.join('\n\n');
}

/** Assembled system prompt. */
export function buildAgentSystemPrompt(options: BuildAgentSystemPromptOptions): string {
  const difficultyBlock = buildAgentDifficultySection(
    options.difficulty,
    options.gameMechanicsByTier,
    options.gameMechanicsForAllTiers,
  );
  return `${options.baseRules}\n\n---\n${difficultyBlock}`;
}
