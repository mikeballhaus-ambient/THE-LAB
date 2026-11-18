import type { GameAgentDifficultyMechanics } from '@/shared/game-platform/difficulty-policy';
import type { GameDifficulty } from '@/shared/game-platform/types';

/** Pool fundamentals — every tier (system message). */
export const BILLIARDS_STRATEGY_CORE = `POOL FUNDAMENTALS (all tiers):
- You receive live ball coordinates on a 1000×500 table (origin top-left; x right, y down). Submit one shot via the structural tool each turn.
- Aim using angleDeg: 0° points toward the **right rail**, 90° toward the **bottom rail**. **AIM HINTS** include **pocket aimDeg** (ghost-ball line that sends the object toward a pocket) — submit that angle for cuts, not just center-hit toward the ball center.
- Follow **RECOMMENDED POCKET SHOT** unless a listed alternate has a clearly better leave; pair angleDeg with the suggested **power** band.
- Never submit a “habit” angle (especially 90° straight down) without matching cue and object-ball positions.
- Before shooting, pick **one primary object ball** and a **cue-ball leave** (where the cue should finish for the next shot).
- Avoid scratches: pocketing the cue ball gives the opponent ball in hand.
- From the kitchen: drive the cue **past the head string** before first contact — hitting from the kitchen without crossing is a foul (ball in hand).
- **Eight-ball profile:** after groups are assigned, first contact must be your group (not the 8, not the opponent's group). Pocket all balls in your group before legally pocketing the 8. Wrong object first → **turn only** (cue stays on table). Scratch and other serious fouls → opponent ball in hand.
- **Nine-ball profile:** balls 1–9 only; **hit the lowest numbered ball on the table first** each shot; legally pocket the 9 to win (combos allowed when the hit is legal).
- **Open practice:** fouls optional — no frame win rules.
- Read **Turn history** in the user message for what just happened (pockets, fouls, 8-ball endings).

TABLE GEOMETRY HINTS:
- Corner pockets sit near table corners; side pockets at mid-rails. Lines through object ball toward pocket center are a reasonable aim start.
- Thin cuts need less power; straight rolls can use moderate power with center-ball hit.
- **PATH OBSTRUCTIONS** in AIM HINTS name balls that block the cue path or the object roll to a pocket — never shoot those lines; pick a listed clear pocket shot or another ball.
- When several balls block a pocket, seek a safety or a soft roll that leaves the cue hidden.`;

export const BILLIARDS_AGENT_STRATEGY_BY_TIER: GameAgentDifficultyMechanics = {
  easy: `POOL PLAY (easy):
- Choose obvious balls near pockets; prefer straight rolls and **EASY MAKE** tags when listed.
- Use RECOMMENDED POCKET SHOT when listed; approximate angle is fine on cuts.
- Use modest power (0.25–0.55) unless the hint says otherwise.
- If no clear pocket, play a gentle safety that leaves the cue in the kitchen area or behind a cluster.`,

  medium: `POOL PLAY (medium):
- **Always read RECOMMENDED POCKET SHOT** and the EASY MAKE / MAKABLE counts — submit pocket aimDeg (not center-hit) on makable lines.
- Plan one object ball plus a simple cue leave for a follow-up.
- Control power on thin cuts; copy suggested power from hints when pocketing.
- After fouls, use ball in hand to improve cue position before submitting a shot.
- On ball in hand, read **PLACEMENT HINTS** and place the cue for the current layout — vary x,y each foul.`,

  hard: `POOL PLAY (hard):
- **EASY MAKE** and **MAKABLE** bullets are must-make geometry — submit RECOMMENDED angleDeg and power.
- Play position: think two shots ahead when a cluster is openable.
- Punish scratches and open tables by running an easy ball when available.
- On eight-ball: clear your group systematically; avoid touching the 8 until your group is gone.`,

  boss: `POOL PLAY (boss):
- Read **EASY MAKE** (all listed) and **Ranked clear pocket shots** — when you commit to a line, copy **pocket aimDeg** and power exactly (use Suggested tool args on RECOMMENDED when you agree).
- On cuts, center-hit at the object ball is wrong — only pocket aimDeg pockets the ball.
- On eight-ball: never shoot the 8 until your group is cleared; never pocket the 8 on the same stroke as a foul or scratch.
- When no pocket is listed, play a **legal safe**: hide the cue, leave the opponent long, or nudge a cluster without opening the 8.
- Treat each shot as high stakes: primary ball, pocket or safe, controlled cue leave.
- Priority order: (1) legally pocket in your group when table allows, (2) leave opponent bad, (3) break clusters without selling out the 8.
- When ahead on eight-ball, play to hide the cue; when behind, seek open runs or fouls that flip ball in hand.
- Never hook yourself on the 8 when your group balls remain.`,
};

export const BILLIARDS_USER_TURN_CHECKLIST: Partial<Record<GameDifficulty, string>> = {
  easy: `Turn checklist: (1) if **EASY MAKE** is listed, use that pocket aimDeg, (2) otherwise pick RECOMMENDED or a nearby makable bullet, (3) modest power.`,
  medium: `Turn checklist: (1) read EASY MAKE / MAKABLE summary, (2) submit RECOMMENDED pocket aimDeg unless an alternate is clearly better, (3) match suggested power.`,
  hard: `Turn checklist: (1) pocket any EASY MAKE / MAKABLE line via RECOMMENDED geometry, (2) verify legal object, (3) one tool call — no habit angles.`,
  boss: `Turn checklist: (1) eight-ball legality, (2) fire RECOMMENDED EASY MAKE/MAKABLE angleDeg+power when listed, (3) else best clear pocket or legal safe — minimal english.`,
};
