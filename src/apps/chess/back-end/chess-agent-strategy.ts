import type { GameAgentDifficultyMechanics } from '@/shared/game-platform/difficulty-policy';

/** Chess fundamentals — every tier (system message). */
export const CHESS_STRATEGY_CORE = `CHESS FUNDAMENTS (all tiers):
- You receive the full board and a complete legal-move list each turn. Pick exactly one legal move.
- Never hang material: before moving, check whether your piece can be captured next turn for free or for insufficient compensation.
- King safety: do not open lines toward your king; when in doubt, improve king safety before chasing pawns.
- Piece activity: undeveloped pieces on the back rank are often worse than a modest pawn move that completes development.
- When ahead on material: restrict the enemy king, give checks when they help, and avoid stalemate (opponent with no legal moves while NOT in check is a draw).
- When behind: seek checks, captures, and threats; avoid passive shuffling that lets the opponent simplify to a won endgame.

TACTICAL MOTIFS (scan the position before choosing):
- Checks, captures, and threats to the enemy king or queen usually outrank quiet moves.
- Forks (one piece attacks two targets), pins, skewers, and discovered attacks are common — look for them in the legal list.
- If a move allows an immediate capture of your queen or rook, reconsider unless the trade wins tactically.

ONE-PLY OPPONENT REPLY (minimum thinking standard):
- For each candidate move in the legal list, ask: "What is my opponent's best reply?" (checks, captures, mate threats).
- Reject candidates that lose your queen, allow back-rank mate, or walk into a fork unless you gain more than you lose.`;

/** Per-tier depth — merged into the kit difficulty block (system message). */
export const CHESS_AGENT_STRATEGY_BY_TIER: GameAgentDifficultyMechanics = {
  easy: `CHESS PLAY (easy):
- Prefer simple developing moves and obvious recaptures.
- Take free pieces when the recapture is clearly safe.
- Avoid long forcing lines; one idea per move is enough.
- If several moves look fine, pick one that improves your least active piece.`,

  medium: `CHESS PLAY (medium):
- Open and middlegame: develop knights and bishops, connect rooks, contest the center when safe.
- Prefer captures that win material or remove an attacker; recapture toward the center when equal.
- Before submitting, eliminate any move that hangs a queen, rook, or bishop to an obvious capture.
- If you are in check, address it with the least weakening option (block, capture attacker, or king move).`,

  hard: `CHESS PLAY (hard):
- Apply the one-ply reply test to every candidate you seriously consider.
- Prefer forcing moves (check, capture, strong threat) when they improve your position or win material.
- Trade pieces when you are ahead; avoid unnecessary trades when behind unless they create counterplay.
- Endgame leaning: activate your king, push passed pawns, and cut off the enemy king when winning.
- Do not repeat moves without reason; improve your worst-placed piece if no tactic is available.`,

  boss: `CHESS PLAY (boss):
- Treat the legal-move list as a search space: rank moves before choosing.
- Priority order when multiple moves are legal:
  1) Immediate checkmate if any legal move delivers mate.
  2) Captures that win material (queen > rook > minor > pawn) after the one-ply reply test.
  3) Checks that improve your position or force the king to a worse square.
  4) Moves that create unavoidable threats (fork, pin, discovered attack) verified by one-ply reply.
  5) Improving the worst piece / restricting the enemy king when winning; active defense when losing.
- When winning (more material or clearly better position): keep the enemy king boxed but either in check or with at least one legal move until you deliver checkmate — never stalemate a winning position.
- When the opponent is in check, assume they play the best defense from the legal list you would face if roles were reversed.
- Do not play random pawn pushes or king shuffles if a forcing line exists in the legal list.`,
};

/** Short turn reminder appended to the user message on harder tiers. */
export const CHESS_USER_TURN_CHECKLIST: Partial<
  Record<'hard' | 'boss', string>
> = {
  hard: `Turn checklist: (1) mark any checks/captures in the legal list, (2) drop moves that hang queen/rook after one opponent reply, (3) choose the best remaining move.`,
  boss: `Turn checklist: rank legal moves using the boss priority order in the system message; verify each top candidate with a one-ply opponent reply before submitting the tool call.`,
};
