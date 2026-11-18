import type { LabAssistantBanterMoment, LabAssistantBanterRequest } from './types';
import {
  buildBanterPlaybookFactLines,
  buildBanterPlaybookReactionExtras,
} from './banter-game-playbooks';
import { isBilliardsTurnOnlyFirstContactFoul } from '@/apps/billiards/shared/billiards-banter-moments';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL } from '@/shared/constants/lab-game-assistant-opponent';
import { resolveLabGameHumanDisplayName } from '@/shared/constants/lab-game-human-display-name';

export function resolveHumanSeat(yourSeat: number): 1 | 2 {
  return yourSeat === 2 ? 2 : 1;
}

export function resolveAssistantSeat(humanSeat: 1 | 2): 1 | 2 {
  return humanSeat === 1 ? 2 : 1;
}

function detailSuffix(detail: string | undefined): string {
  const trimmed = detail?.trim();
  return trimmed ? ` (${trimmed})` : '';
}

function describeMoment(
  moment: LabAssistantBanterMoment,
  humanSeat: 1 | 2,
  _humanLabel: string,
): string {
  void _humanLabel;
  const assistantSeat = resolveAssistantSeat(humanSeat);
  const moverSeat =
    moment.moverSeat === 1 || moment.moverSeat === 2 ? moment.moverSeat : humanSeat;
  const humanMoved = moverSeat === humanSeat;
  const assistantMoved = moverSeat === assistantSeat;
  const detail = detailSuffix(moment.detail);

  switch (moment.kind) {
    case 'capture':
      return humanMoved
        ? `${HUMAN_OPPONENT_LABEL} just captured ${LAB_ASSISTANT_GAME_OPPONENT_LABEL}'s piece${detail}. ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} lost material.`
        : `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} just captured the human player's piece${detail}. The human lost material — you (${LAB_ASSISTANT_GAME_OPPONENT_LABEL}) took it, not the other way around.`;
    case 'check':
      return assistantMoved
        ? `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} put the human player in check.`
        : `The human player put ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} in check.`;
    case 'block':
      return humanMoved
        ? `The human player blocked ${LAB_ASSISTANT_GAME_OPPONENT_LABEL}'s Connect Four threat.`
        : `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} blocked the human player's winning line.`;
    case 'hit':
      return humanMoved
        ? `The human player scored a **new hit on your fleet** in Battleship — they fired; you did **not** call this shot.`
        : `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} scored a **new hit on the human's tracking grid** in Battleship — you fired this salvo.`;
    case 'highlight': {
      const rawDetail = moment.detail ?? '';
      const turnOnlyFoul = isBilliardsTurnOnlyFirstContactFoul(rawDetail);
      if (turnOnlyFoul) {
        return humanMoved
          ? `${HUMAN_OPPONENT_LABEL} hit the wrong group first — **loss of turn only** (not a scratch; cue stays on the table)${detail}.`
          : `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} hit the wrong group first — **loss of turn only** (not a scratch; cue stays put; opponent shoots from the table)${detail}.`;
      }
      return humanMoved
        ? `${HUMAN_OPPONENT_LABEL} made a notable play${detail}.`
        : `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} just finished their visit at the table${detail}. React as **yourself** — not an announcer summarizing the rack.`;
    }
    case 'pocket':
      return humanMoved
        ? `${HUMAN_OPPONENT_LABEL} pocketed ${detail || 'a ball'}.`
        : `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} pocketed ${detail || 'a ball'}.`;
    case 'scratch':
      return humanMoved
        ? `${HUMAN_OPPONENT_LABEL} scratched or fouled${detail ? ` (${detail})` : ''}.`
        : `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} scratched or fouled — the human player places **their own** cue next, not you and not "your" cue for them to set up.${detail ? ` (${detail})` : ''}.`;
    case 'eight_ball_foul':
      return humanMoved
        ? `${HUMAN_OPPONENT_LABEL} had an eight-ball foul or early 8${detail ? ` — ${detail}` : ''}.`
        : `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} had an eight-ball foul or early 8${detail ? ` — ${detail}` : ''}.`;
    case 'match_win':
      return `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} won the match.`;
    case 'match_loss':
      return `The human player won the match.`;
    case 'match_draw':
      return 'The match ended in a draw.';
    case 'slow_turn':
      return 'The human player has not shot yet — long think at the table.';
    default:
      return 'Something notable just happened in the game.';
  }
}

function buildBanterFactsBlock(
  request: LabAssistantBanterRequest,
  humanSeat: 1 | 2,
  assistantSeat: 1 | 2,
  humanLabel: string,
): string {
  const moverSeat =
    request.moment.moverSeat === 1 || request.moment.moverSeat === 2
      ? request.moment.moverSeat
      : humanSeat;
  const humanMoved = moverSeat === humanSeat;
  const whoMoved = humanMoved
    ? humanLabel
    : LAB_ASSISTANT_GAME_OPPONENT_LABEL;
  const detailText = request.moment.detail?.trim();
  const lines = [
    `- Lab user at the keyboard: **${humanLabel}** (display name; seat ${humanSeat} internal).`,
    `- ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} on the board (seat ${assistantSeat} internal).`,
    `- **Who just moved:** ${whoMoved}.`,
    `- **Moment type:** ${request.moment.kind}${detailText ? ' — ' + detailText : ''}.`,
  ];
  if (request.moment.kind === 'capture') {
    lines.push(
      `- **Capture:** ${whoMoved} took the opponent's piece${detailText ? ` (${detailText})` : ''}. Do not attribute the capture to the other side.`,
    );
  }
  if (request.moment.kind === 'pocket') {
    lines.push(
      `- **Pocket:** ${whoMoved} on this shot${detailText ? ` — ${detailText}` : ''}.`,
    );
    if (request.gameId === 'billiards' || request.gameId === 'billiards-practice') {
      lines.push(
        '- **Eight-ball count rule:** "Two down" / "rolling your group" = **assigned-group legal progress** in Facts only — never count wrong-group balls pocketed on the same stroke.',
      );
      if (humanMoved) {
        lines.push(
          '- **Ownership:** The **human** pocketed — react as opponent; do not congratulate yourself for their ball.',
        );
      } else {
        lines.push(
          `- **Ownership:** **You (${LAB_ASSISTANT_GAME_OPPONENT_LABEL})** pocketed — first person only; never "nice shot" / "well played" to the human for a ball **you** dropped.`,
          '- **Forbidden:** "solid for you", "stripe for you", "ball down for you", or any line that credits the **human** with an assigned-group ball **you** pocketed on this shot (wrong-group tray balls are clutter — not human progress).',
        );
      }
    }
  }
  if (request.moment.kind === 'highlight' && request.gameId === 'billiards') {
    lines.push(
      `- **Table moment:** ${detailText || 'notable play'}. Use **Billiards table flow** for who shoots next and assigned groups.`,
    );
    const detailLower = detailText?.toLowerCase() ?? '';
    const dryMiss = detailLower.includes('dry shot');
    const turnOnlyFirstContact =
      detailLower.includes('turn only') ||
      (detailLower.includes('turn passes') &&
        (detailLower.includes('wrong ball') ||
          detailLower.includes('eight ball first') ||
          detailLower.includes('did not hit lowest')));
    if (turnOnlyFirstContact) {
      const eightBallFirst = detailLower.includes('eight ball first');
      lines.push(
        '- **Wrong first contact:** visit ends — **no ball in hand** and **not a scratch**. Opponent shoots with the cue where it lies.',
        '- Forbidden words: "scratch", "scratched", "ball in hand", "hands you the cue", "place the cue", kitchen placement, or implying they set up a new cue ball.',
        eightBallFirst
          ? '- **Eight ball first:** foul label only — you hit the 8 too early or first contact was illegal. Forbidden: "pocket the 8 first", "race to the 8", or any brag about making the 8.'
          : '',
        '- Wry admission or handing over the table in one short line; trust **Shooting next** in the moment detail.',
      );
    } else if (humanMoved) {
      lines.push('- **Ownership:** The human made this play — you are reacting as opponent.');
    } else if (dryMiss) {
      lines.push(
        `- **Dry miss:** **You (${LAB_ASSISTANT_GAME_OPPONENT_LABEL})** missed with no pocket — speak as the player who just failed: **I left / I ran dry / your table now**. Trust **Shooting next** in this detail (usually human on the clock).`,
        '- **Forbidden voice:** no announcer opener ("Nice shot—", "Well played—") and no implying you are complimenting **their** shot when you just shot.',
      );
    } else if (detailLower.includes('pocketed **their** assigned')) {
      lines.push(
        `- **Assigned pocket (your shot):** Only **your** assigned group counts as your progress — forbidden: crediting the human ("for you", "your solid") when Facts say **you** pocketed **your** ball.`,
      );
    } else {
      lines.push(
        `- **Ownership:** You made this play — first person; do not credit the human for balls you pocketed.`,
      );
    }
  }
  if (request.moment.kind === 'hit' && request.gameId === 'battleship') {
    lines.push(
      `- **Battleship shot ownership:** ${whoMoved} registered the new hit mark — the other side's grid took fire.`,
    );
  }
  if (isBilliardsBanterGameId(request.gameId)) {
    lines.push(BILLIARDS_SIDECAR_GROUP_GROUNDING);
    lines.push(...buildBilliardsSpokenVoiceRules(request, humanSeat));
  }
  const playbookFacts = buildBanterPlaybookFactLines(request, humanMoved);
  if (playbookFacts.length > 0) {
    lines.push(...playbookFacts);
  }
  if (request.moment.kind === 'scratch' || request.moment.kind === 'eight_ball_foul') {
    const detailLower = detailText?.toLowerCase() ?? '';
    if (detailLower.includes('human player** places the cue') || detailLower.includes('human places cue')) {
      lines.push(
        `- **Foul:** you (${LAB_ASSISTANT_GAME_OPPONENT_LABEL}) scratched or fouled${detailText ? ` — ${detailText}` : ''}.`,
        `- **Ball in hand:** ${humanLabel} places **their own** cue ball for **their** shot — **not you**. Forbidden: "I'll place my ball", "place mine wherever you like", "leave you the kitchen to place mine", "set my ball up" (sounds like they place **your** cue). Kitchen = where **they** put **their** cue after **your** foul.`,
      );
    } else if (detailLower.includes(`${LAB_ASSISTANT_GAME_OPPONENT_LABEL.toLowerCase()}** places the cue`)) {
      lines.push(
        `- **Foul:** ${humanLabel} fouled${detailText ? ` — ${detailText}` : ''}.`,
        `- **Ball in hand:** you (${LAB_ASSISTANT_GAME_OPPONENT_LABEL}) place the cue — human does not.`,
      );
    } else {
      lines.push(
        `- **Foul:** ${whoMoved} caused this foul moment${detailText ? ` — ${detailText}` : ''}. Trust **Ball in hand** / **Shooting next** in detail for who places the cue.`,
      );
    }
    lines.push(
      '- **Balls that dropped on the foul stroke are still pocketed.** Object balls listed as pocketed in this moment stay down and sit in the tray — the foul is the cue ball only. Never call them "not really down", "didn\'t go down cleanly", or suggest they did not count.',
    );
  }
  if (
    request.moment.kind === 'match_win' ||
    request.moment.kind === 'match_loss' ||
    request.moment.kind === 'match_draw'
  ) {
    lines.push(
      '- **Match over:** react to the **final result** — gracious win, honest loss, or draw. One closing table-talk line; no coaching.',
      '- Trust **Match result (FINISHED)** in Billiards table flow when present — never claim the frame is still live or that an early 8 "did not count".',
    );
  }
  const boardFactLine = isBilliardsBanterGameId(request.gameId)
    ? '- **Board facts:** use **Balls on felt** / Billiards table flow and game state JSON — do not invent balls.'
    : request.gameId === 'chess'
      ? '- **Board facts:** use the **Chess piece roster** and game state JSON — do not invent squares or piece types.'
      : request.gameId === 'battleship'
        ? '- **Board facts:** use **Battleship tracking** and shot maps — never invent hidden ship layouts or coordinates for spoken lines.'
        : '- **Board facts:** use turn history and game state JSON below — do not invent positions or hidden information.';
  lines.push(boardFactLine);
  return lines.join('\n');
}

const TABLE_TALK_BOUNDARIES =
  'Keep it **PG, warm, and good-natured**: casual table chat between friendly lab tablemates — light humor about the **position**, not digs at the human. No profanity, trash talk, insults, gloating, threats, sarcastic cruelty, or harsh swearing.';

/** Cross-game default — slightly softer Sidecar voice (all catalog games). */
const TABLE_TALK_WARMTH =
  'Default vibe: **curious lab partner** at the table — a little competitive about the game state, never cold, mean, or talk-down. Prefer understated reactions over sharp jabs.';

/** You are the seated opponent — not ESPN, not a coach praising both players. */
const BANTER_OPPONENT_VOICE_RULE =
  'You speak **from the chair across the table** — the human\'s **opponent**, never a neutral third-party commentator narrating both sides. After **your** shot, use **I / me / my**; do not open with praise for the human ("Nice shot", "Well played", "Good break", "Fair enough") when **you** just moved — that sounds like you are applauding **their** stroke, which did not happen this moment.';

/** Display name appears in Facts for reasoning — not in every spoken line. */
const BANTER_SPOKEN_NAMING_RULE =
  'Do **not** use the lab user\'s display name in your spoken sentence every turn (no "Well played, Alex" every pocket). Address them as **you**, or skip direct address. The display name in Facts is metadata only — never open with their name unless the moment is match end.';

const HUMAN_OPPONENT_LABEL = 'The human player';

const BILLIARDS_SIDECAR_GROUP_GROUNDING = [
  '- **Billiards groups (mandatory):** Read **Sidecar identity** + **Group progress** + **On felt (group balls only)** in **Billiards table flow** below before any "my/your solids/stripes". Assignments **do not change** mid-match.',
  '- **You are Lab Assistant:** first-person **my {your assigned group}** only — never claim the human\'s group as "mine".',
  '- **Cleared / all gone:** Forbidden unless **still on table** is **0** and on-felt list is **none** — one ball left means you cannot say "your solids are all gone".',
  '- **Race to the eight:** Forbidden unless **Race to the eight** in table flow says both groups are cleared.',
  '- **Forbidden:** swapping groups in one line; "six stripes left while I hunt my solids"; talking as if both groups are yours.',
  '- **Eight ball first** foul ≠ shooting at the 8 — forbidden: "pocket the 8 first" on a wrong-ball / turn-only moment.',
].join('\n');

const BILLIARDS_TABLE_TALK_STYLES = [
  'Tone: calm — one plain observation about the table; no pep talk or edge.',
  'Tone: lightly amused — gentle aside about the layout; never a put-down.',
  'Tone: curious — react to the specific ball or pocket named in Facts; skip generic group slogans; if Facts say you pocketed, never frame that ball as the human\'s achievement.',
  'Tone: matter-of-fact — mention what is still on the table without pressure or gloating; stay under 20 words.',
] as const;

/** Slow-turn voice buckets — each nudge should sound like table talk, not a generic wait message. */
const SLOW_TURN_OPPONENT_STYLES = [
  'Tone: easy — one concrete detail from the live position (piece, pocket, group).',
  'Tone: playful — soft tease about taking time to line up; never impatient or personal.',
  'Tone: mellow — quiet aside grounded in the score or layout.',
  'Tone: patient — note material or position still in play; no needling or edge.',
] as const;

const SLOW_TURN_VOICE_GENERAL =
  'Ground the line in **verifiable board facts** from Facts / game state below. Vary wording and angle each nudge — avoid repeating the same metaphor or stock opponent-waiting line. Skip coach voice (no pep talks, no permission to hurry). Turn-timer metadata in the snapshot is reasoning-only — never mention seconds left or a countdown in your spoken line.';

function isBilliardsBanterGameId(gameId: string): boolean {
  return gameId === 'billiards' || gameId === 'billiards-practice';
}

function banterPromptStyleIndex(seed: string, bucket: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return bucket > 0 ? hash % bucket : 0;
}

function buildBilliardsSpokenVoiceRules(
  request: LabAssistantBanterRequest,
  humanSeat: 1 | 2,
): string[] {
  const detail = request.moment.detail?.toLowerCase() ?? '';
  const assistantSeat = resolveAssistantSeat(humanSeat);
  const humanPlacingCue =
    detail.includes('human places cue') || detail.includes('human player** places the cue');
  const assistantPlacingCue =
    detail.includes('lab assistant places cue') ||
    detail.includes('lab assistant** places the cue');
  const humanOnClock =
    !humanPlacingCue &&
    (detail.includes('shooting next: human') ||
      (detail.includes('on the clock') && detail.includes('human')));
  const assistantOnClock =
    !assistantPlacingCue &&
    (detail.includes('shooting next: lab assistant') ||
      (detail.includes('on the clock') && detail.includes('lab assistant')));
  const lines = [
    '- **Eight-ball numbering:** 1–7 solids, 9–15 stripes; "ball 9" / "the nine" is a stripe, not nine-ball rules.',
    '- **Open table:** no solids/stripes assigned — do not claim group ownership.',
    '- **Group labels:** "my stripes/solids" must match **your** assignment in **Sidecar identity** — never the opponent\'s group; never flip groups mid-sentence.',
    '- **Wording variety:** do not open with stock fillers ("Not bad—", "Fair enough—", "Well,") or repeat the same sentence skeleton as earlier Sidecar lines in this match.',
    '- **Shooting next** in moment detail and **Billiards table flow** wins over chat history and earlier Sidecar chat lines.',
  ];
  if (request.moment.kind === 'slow_turn') {
    lines.push(
      '- **Slow turn only:** human is on the clock; you are **idle**. Forbidden: "hunting my solids/stripes", "cue back to me", "lining up my shot", "waiting for my cue", "on clock" + bragging about your run.',
      '- One quiet table observation — not a pocket recap mixed with waiting-for-them-to-shoot.',
    );
  }
  if (request.moment.kind === 'highlight' && detail.includes('dry shot')) {
    lines.push(
      '- **Dry miss:** you missed; the human has the table next. Speak as **you** at the table — wry admission or handing them the visit, not broadcast commentary.',
      '- **Forbidden:** "Nice shot", "Well played", "Good break" (especially as an opener); "nothing happened" when balls spread; counting wrong balls on the felt — use **Balls on felt** in Billiards table flow.',
      '- **Forbidden:** "while I wait for my cue", "leave you to work" while implying you still have the offense.',
    );
  }
  if (
    request.moment.kind === 'highlight' &&
    (detail.toLowerCase().includes('turn only') ||
      isBilliardsTurnOnlyFirstContactFoul(request.moment.detail ?? ''))
  ) {
    lines.push(
      '- **Wrong first contact:** no ball in hand — **not a scratch** — opponent shoots from the table. Forbidden: "scratch", "hands you the cue", placement offers, or "set the cue anywhere".',
    );
  }
  if (humanOnClock && request.moment.moverSeat === assistantSeat) {
    lines.push(
      '- **Turn:** human shoots next — react as opponent **watching**, not still shooting or hunting your group.',
    );
  }
  if (assistantOnClock && request.moment.moverSeat === humanSeat) {
    lines.push(
      `- **Turn:** you (${LAB_ASSISTANT_GAME_OPPONENT_LABEL}) shoot next — human’s visit just ended.`,
    );
  }
  if (
    request.moment.kind === 'pocket' &&
    assistantOnClock &&
    request.moment.moverSeat === assistantSeat
  ) {
    lines.push('- **Pocket + table:** you keep shooting — first person about **your** ball; do not say human is on clock.');
  }
  if (
    request.moment.kind === 'pocket' &&
    humanOnClock &&
    request.moment.moverSeat === assistantSeat
  ) {
    lines.push('- **Pocket + turn pass:** you pocketed but human shoots next — do not say you are lining up another shot.');
  }
  if (request.moment.kind === 'scratch' || request.moment.kind === 'eight_ball_foul') {
  const humanPlaces =
    detail.includes('human player** places the cue') ||
    detail.includes('human places cue') ||
    detail.includes('ball in hand: **human');
    const assistantPlaces =
      detail.includes('lab assistant** places the cue') ||
      detail.includes('lab assistant places cue');
    if (humanPlaces && request.moment.moverSeat === assistantSeat) {
      const kitchen =
        detail.includes('kitchen') || detail.includes('head string');
      lines.push(
        '- **Scratch voice:** you fouled — **human** has ball in hand and places **their own** cue. Forbidden: "place mine", "wherever you like" (for your ball), "set my cue up", or implying **they** place **your** cue.',
        kitchen
          ? '- **Kitchen:** they place **their** cue in the kitchen for **their** visit — you wait. Do not offer to place your ball or confuse kitchen as your placement turn.'
          : '- Wry concession: hand them the table — one short line while they place **their** cue.',
      );
    }
    if (assistantPlaces && request.moment.moverSeat === humanSeat) {
      lines.push(
        '- **Foul on human:** the human shooter scratched or fouled — **you** place the cue. Forbidden: "my cue is yours to place", "your table to set my ball", or any line where **you** scratched.',
        '- Speak as opponent who just received ball in hand: where to put the cue, or dry comment on their foul — one short line.',
      );
    }
  }
  return lines;
}

function buildSlowTurnFactsBlock(
  humanSeat: 1 | 2,
  assistantSeat: 1 | 2,
  humanLabel: string,
  gameId: string,
  request: LabAssistantBanterRequest,
): string {
  const lines = [
    `- Lab user at the keyboard: **${humanLabel}** (seat ${humanSeat} internal).`,
    `- ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} on the board (seat ${assistantSeat} internal).`,
    '- **Who just moved:** nobody — the human player has not shot yet this turn (still deciding).',
    '- **Moment type:** slow_turn (long think at the table).',
  ];
  if (isBilliardsBanterGameId(gameId)) {
    lines.push(
      BILLIARDS_SIDECAR_GROUP_GROUNDING,
      '- **Slow turn (billiards):** pull **one** detail from **Billiards table flow** / turn history (spread, clusters, last pocket).',
      '- **Open table:** when flow says table open, do **not** claim solids or stripes for either player — balls 1–7 and 9–15 are not assigned yet.',
      ...buildBilliardsSpokenVoiceRules(request, humanSeat),
    );
  } else {
    lines.push(
      '- **Slow turn:** pull **one** detail from **piece roster** / game state JSON.',
    );
  }
  return lines.join('\n');
}

function buildSlowTurnEventLine(request: LabAssistantBanterRequest): string {
  const seed = `${request.matchId}|${request.moment.detail ?? ''}|${request.gameId}|event`;
  const idx = banterPromptStyleIndex(seed, 4);
  const game = isBilliardsBanterGameId(request.gameId) ? 'billiards' : 'the game';
  const variants = [
    `The human player is still lining up at the ${game} table — no shot yet.`,
    `You are waiting across the table while the human decides their next shot in ${game}.`,
    `The human has the table but has not committed a shot yet.`,
    `Play is paused at the table while the human thinks over their options.`,
  ];
  return variants[idx] ?? variants[0]!;
}

function buildSlowTurnReactionGuide(request: LabAssistantBanterRequest, humanLabel: string): string {
  void humanLabel;
  const seed = `${request.matchId}|${request.moment.detail ?? ''}|${request.gameId}`;
  const style = SLOW_TURN_OPPONENT_STYLES[banterPromptStyleIndex(seed, SLOW_TURN_OPPONENT_STYLES.length)];
  const billiardsLine = isBilliardsBanterGameId(request.gameId)
    ? 'Billiards: the line should name something on the felt (group, a ball number, layout) when the snapshot provides it.'
    : '';
  return [
    'The **human player** has not moved yet. You are the **opponent at the table**, not a coach or commentator.',
    style,
    SLOW_TURN_VOICE_GENERAL,
    'Say something **different every time**; do not reuse stock lines from earlier Sidecar banter in this match.',
    'Avoid supportive tutor voice (e.g. reassuring them about how long they take or wishing them luck finding the best move).',
    billiardsLine,
    BANTER_SPOKEN_NAMING_RULE,
    TABLE_TALK_BOUNDARIES,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildBilliardsReactionExtras(request: LabAssistantBanterRequest): string {
  const humanSeat = resolveHumanSeat(request.yourSeat);
  const assistantSeat = resolveAssistantSeat(humanSeat);
  const seed = `${request.matchId}|${request.moment.kind}|${request.moment.detail ?? ''}|${request.moment.moverSeat ?? ''}`;
  const style = BILLIARDS_TABLE_TALK_STYLES[banterPromptStyleIndex(seed, BILLIARDS_TABLE_TALK_STYLES.length)];
  const assistantPocket =
    request.moment.kind === 'pocket' &&
    (request.moment.moverSeat === 1 || request.moment.moverSeat === 2) &&
    request.moment.moverSeat === assistantSeat;
  const assistantMoved =
    (request.moment.moverSeat === 1 || request.moment.moverSeat === 2) &&
    request.moment.moverSeat === assistantSeat;
  const dryMiss =
    request.moment.kind === 'highlight' &&
    (request.moment.detail?.toLowerCase().includes('dry shot') ?? false);
  const turnOnlyFoul =
    request.moment.kind === 'highlight' &&
    isBilliardsTurnOnlyFirstContactFoul(request.moment.detail ?? '');
  const detailLower = request.moment.detail?.toLowerCase() ?? '';
  const humanReceivesBih =
    detailLower.includes('human player** places') ||
    detailLower.includes('human places **their** cue') ||
    detailLower.includes('human places cue');
  const assistantScratched =
    request.moment.kind === 'scratch' &&
    request.moment.moverSeat === assistantSeat &&
    humanReceivesBih;
  const ownershipLine = turnOnlyFoul && assistantMoved
    ? 'Wrong first contact — brief admission; human shoots next from the table. Forbidden: "scratch", "ball in hand", "hands you the cue", or cue-ball placement.'
    : assistantScratched
    ? 'You scratched — they place **their own** cue for **their** shot (kitchen or full table per Facts). Never say they place **your** cue or "wherever you like" for **mine**.'
    : assistantPocket
      ? 'You pocketed on this shot — say "I" / "my", never compliment the human for **your** pocket (no "nice shot on 7" when you sank the 7).'
      : assistantMoved && dryMiss
        ? 'You missed — first person only ("I ran dry", "I left you the table"). Never open with praise aimed at the human for a shot they did not take.'
        : assistantMoved
          ? BANTER_OPPONENT_VOICE_RULE
          : '';
  return [
    style,
    ownershipLine,
    'Billiards: **vary every line** — avoid stock opponent trash-talk or cornering language; keep lines collegial.',
    'Solids are balls 1–7; stripes are 9–15. Only call a pocketed ball "your/my solids" (or stripes) when that number matches the shooter\'s **assigned group** in **Billiards table flow** — wrong-group pockets happen and are not the shooter\'s assigned group.',
    'Before "my group left" or "cleared my group", read **On felt (group balls only)** — if it lists a ball number, that group is **not** cleared.',
    'Before "my group left", read **Sidecar identity** — e.g. if you are stripes, never say "my solids" or count solids as yours.',
    'Reference at most **one** pocketed ball number from Facts or turn history — do not list multiple recent pockets in one sentence.',
    'Never invent cumulative progress ("two down for stripes") unless **Group progress** in Billiards table flow matches; stripe+solid on one shot is one assigned ball at most.',
    '**Remaining vs seven:** Each side must clear **7** balls of their group — tray shows pocketed as `N/7`. **Still on table** is the count to use for "down to N" (seven minus pocketed, on the felt). Never say "down to seven" when `N/7` is already 1/7 or higher.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildBanterReactionGuide(
  humanMoved: boolean,
  _humanLabel: string,
  request?: LabAssistantBanterRequest,
): string {
  void _humanLabel;
  if (request?.moment.kind === 'match_win') {
    return [
      `**You (${LAB_ASSISTANT_GAME_OPPONENT_LABEL})** won the match.`,
      'Closing line only: light satisfaction or sportsmanship — not a victory lap or insult.',
      TABLE_TALK_BOUNDARIES,
    ].join(' ');
  }
  if (request?.moment.kind === 'match_loss') {
    return [
      `The **human player** won the match — you (${LAB_ASSISTANT_GAME_OPPONENT_LABEL}) lost.`,
      'Closing line only: gracious concession, wry respect, or "good run" — never sour or coaching.',
      TABLE_TALK_BOUNDARIES,
    ].join(' ');
  }
  if (request?.moment.kind === 'match_draw') {
    return [
      'The match ended in a draw.',
      'One neutral closing remark — no move coaching.',
      TABLE_TALK_BOUNDARIES,
    ].join(' ');
  }
  const isBilliards =
    request != null && (request.gameId === 'billiards' || request.gameId === 'billiards-practice');
  const billiardsExtras = isBilliards ? buildBilliardsReactionExtras(request) : '';
  const playbookExtras = request ? buildBanterPlaybookReactionExtras(request, humanMoved) : '';
  if (humanMoved) {
    return [
      `The **human player** just moved. You are the **${LAB_ASSISTANT_GAME_OPPONENT_LABEL} at the table** (their opponent).`,
      'Turn-based games: after their ply the clock usually passes to **you** — read **Turn clock** in the snapshot. **Forbidden:** "your turn now", "over to you", or handing the table back to them in the same breath.',
      'React as a friendly opponent: mild surprise, easy banter about the position, or brief appreciation for a sharp line — not a neutral coach and not sharp or dismissive.',
      'Do **not** open with generic praise like "good move" or "nice capture" every time; vary tone and stay in character.',
      'If you mention a square or piece, verify it in the **piece roster** or **game state JSON** below — never the wrong type or owner.',
      billiardsExtras,
      playbookExtras,
      BANTER_SPOKEN_NAMING_RULE,
      TABLE_TALK_BOUNDARIES,
    ]
      .filter(Boolean)
      .join('\n');
  }
  return [
    `**You (${LAB_ASSISTANT_GAME_OPPONENT_LABEL})** just moved on the board.`,
    BANTER_OPPONENT_VOICE_RULE,
    'Speak in **first person** about what you did — pleased, relieved, self-deprecating after a miss, or quietly satisfied — never smug, threatening, or belittling.',
    'Do **not** congratulate the human player for your own capture, check, hit, pocket, or miss.',
    'If you mention a square or piece, verify it in the **piece roster** or **game state JSON** below — never the wrong type or owner.',
    billiardsExtras,
    playbookExtras,
    BANTER_SPOKEN_NAMING_RULE,
    TABLE_TALK_BOUNDARIES,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildBanterTurnBody(
  request: LabAssistantBanterRequest,
  facts: string,
  event: string,
  reactionGuide: string,
  _humanLabel: string,
): string {
  void _humanLabel;
  return `[Sidecar table talk — in-game moment]

You are **${LAB_ASSISTANT_GAME_OPPONENT_LABEL}** sitting across the table from the **human player** in ${request.gameId} (match ${request.matchId}). This Sidecar line is **table talk only** — you are not executing a board move here. ${BANTER_OPPONENT_VOICE_RULE}

### Facts (authoritative — trust over chat history)
${facts}

### Event
${event}

### Voice and response rules
${TABLE_TALK_WARMTH}

${reactionGuide}

Reply with exactly **one** short spoken sentence (max 25 words). No markdown, no lists, no tool calls. Reasoning/thinking is off — reply directly. ${BANTER_SPOKEN_NAMING_RULE}`;
}

export function buildLabGameBanterTurnUserContent(request: LabAssistantBanterRequest): string {
  const humanSeat = resolveHumanSeat(request.yourSeat);
  const assistantSeat = resolveAssistantSeat(humanSeat);
  const humanLabel = resolveLabGameHumanDisplayName(request.humanDisplayName);
  const event = describeMoment(request.moment, humanSeat, humanLabel);

  if (request.moment.kind === 'slow_turn') {
    return buildBanterTurnBody(
      request,
      buildSlowTurnFactsBlock(humanSeat, assistantSeat, humanLabel, request.gameId, request),
      buildSlowTurnEventLine(request),
      buildSlowTurnReactionGuide(request, humanLabel),
      humanLabel,
    );
  }

  const moverSeat =
    request.moment.moverSeat === 1 || request.moment.moverSeat === 2
      ? request.moment.moverSeat
      : humanSeat;
  const humanMoved = moverSeat === humanSeat;
  const facts = buildBanterFactsBlock(request, humanSeat, assistantSeat, humanLabel);
  const reactionGuide = buildBanterReactionGuide(humanMoved, humanLabel, request);

  return buildBanterTurnBody(request, facts, event, reactionGuide, humanLabel);
}
