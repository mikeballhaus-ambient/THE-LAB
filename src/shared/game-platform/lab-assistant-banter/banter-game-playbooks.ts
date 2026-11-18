/**
 * Vs–Lab Assistant Sidecar banter guardrails per catalog game (except billiards — those
 * rules stay inline in build-banter-llm-prompt.ts as the reference implementation).
 */
import type { LabAssistantBanterRequest } from './types';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL } from '@/shared/constants/lab-game-assistant-opponent';

const CHESS_PLAYBOOK = [
  '- **Chess:** verify piece type and square on the **Chess piece roster** — never invent material.',
  '- Captures/checks: only **Who just moved** scored or delivered check; react as the side that lost material or is in check.',
  '- Forbidden: naming squares you cannot verify; calling a capture the wrong player made.',
].join('\n');

const CHECKERS_PLAYBOOK = [
  '- **Checkers:** jumps and crowns come from turn history — trust **Who just moved**.',
  '- On capture: react as the player who **lost** a piece when the human captured, and as **you** when you captured (first person).',
  '- Do not describe board cells by invented coordinates.',
].join('\n');

const CONNECT_FOUR_PLAYBOOK = [
  '- **Connect Four:** mention columns or threats only if consistent with turn history.',
  '- **Block** moments: the mover stopped an immediate threat — credit them, not the other side.',
].join('\n');

const TIC_TAC_TOE_PLAYBOOK = [
  '- **Tic-Tac-Toe:** light remarks about the line or fork only — no invented empty squares.',
].join('\n');

const BATTLESHIP_PLAYBOOK = [
  '- **Battleship fog of war:** you only know what the human sees — shot marks on the tracking grid, not hidden enemy ship positions.',
  '- **Forbidden in spoken lines:** grid coordinates (e.g. "3,3", "B5"), compass-style cells, or naming ship classes (destroyer, carrier, cruiser) unless a ship is **publicly sunk** in match scores.',
  '- **Forbidden voice:** "Caught you on …" when the **human** just fired — that steals their shot. When the human hit **your** fleet, react as **you** taking damage (stung, good shot), not as if **you** called the cell.',
  '- When **you** hit: first person only ("that connected", "marking that one") — still **no** coordinates or ship guesses.',
].join('\n');

const HANGMAN_PLAYBOOK = [
  '- **Hangman:** never speak or spell the hidden word, length, or unrevealed letters — only how many strikes / letters guessed is public.',
  '- Guesser vs setter roles follow **Who just moved**; do not coach optimal guesses.',
].join('\n');

const POKER_PLAYBOOK = [
  '- **Texas Hold\'em:** no invented hole cards or board runouts — only what turn history and scores describe.',
  '- **Hole cards:** never name pocket ranks or suits in spoken banter ("aces", "kings", "ace-king", "pocket tens") for yourself or the human — holes are hidden until showdown.',
  '- **Bet sizes:** never quote a bet, raise, or all-in amount unless that exact line appears in turn history (e.g. "Raised to 200 Quarks").',
  '- **Forbidden:** announcing what you "will" do next — react only to actions already in history.',
  '- Vague table talk ("big hand", "scary board") is fine; do not claim specific made hands or hole-card strength.',
].join('\n');

const WORD_TILE_PLAYBOOK = [
  '- **Word tile:** big score swings in Facts are tile totals — do not invent words played off-board.',
  '- **Turn order:** alternate seats — after the human plays a word, **you** draw and plan the next play unless **Turn clock** says otherwise.',
  '- **Forbidden:** "your turn now" right after the human just scored — they already moved; you are up next.',
].join('\n');

const BLACKJACK_PLAYBOOK = [
  '- **Blackjack vs dealer:** you are seat-2 tablemate — dealer is house only; banter is mostly match-end unless a mid-hand moment exists.',
  '- Do not reveal dealer hole logic or your hidden cards beyond what the UI shows.',
].join('\n');

const PLAYBOOK_BY_GAME: Record<string, string> = {
  chess: CHESS_PLAYBOOK,
  checkers: CHECKERS_PLAYBOOK,
  'connect-four': CONNECT_FOUR_PLAYBOOK,
  'tic-tac-toe': TIC_TAC_TOE_PLAYBOOK,
  battleship: BATTLESHIP_PLAYBOOK,
  hangman: HANGMAN_PLAYBOOK,
  'poker-holdem': POKER_PLAYBOOK,
  'word-tile': WORD_TILE_PLAYBOOK,
  'tile-word-grid': WORD_TILE_PLAYBOOK,
  blackjack: BLACKJACK_PLAYBOOK,
};

export function buildBanterPlaybookFactLines(
  request: LabAssistantBanterRequest,
  humanMoved: boolean,
): string[] {
  const base = PLAYBOOK_BY_GAME[request.gameId];
  const lines: string[] = base ? [base] : [];

  if (request.gameId === 'battleship' && request.moment.kind === 'hit') {
    if (humanMoved) {
      lines.push(
        '- **Battleship hit (human shot):** the human registered a new hit on **your** fleet. React as **you** (`I` / `my ships`) taking fire — never first-person as if you fired the salvo.',
        '- Forbidden: coordinates, ship type names, or gloating as the shooter.',
      );
    } else {
      lines.push(
        `- **Battleship hit (your shot):** **You (${LAB_ASSISTANT_GAME_OPPONENT_LABEL})** registered a new hit on their tracking grid. Speak in first person as the shooter.`,
        '- Forbidden: thanking the human for **your** hit; naming their hidden ship layout.',
      );
    }
  }

  if (request.gameId === 'hangman' && request.moment.kind === 'highlight') {
    lines.push(
      '- **Hangman moment:** react to a new letter or strike — never leak the solution word.',
    );
  }

  if (request.gameId === 'connect-four' && request.moment.kind === 'block') {
    lines.push(
      `- **Block:** ${humanMoved ? 'The human blocked your threat.' : 'You blocked their threat.'} Credit the mover only.`,
    );
  }

  void humanMoved;
  return lines.filter((line) => line.length > 0);
}

export function buildBanterPlaybookReactionExtras(
  request: LabAssistantBanterRequest,
  humanMoved: boolean,
): string {
  if (request.gameId === 'battleship' && request.moment.kind === 'hit') {
    if (humanMoved) {
      return 'Battleship: one short line as the fleet commander who was **struck** — respect or wry pain, **not** shooter gloating and **no** grid coordinates or ship classes.';
    }
    return 'Battleship: one short **first-person** line about **your** shot connecting — still **no** coordinates or guessed ship names.';
  }
  if (request.gameId === 'hangman') {
    return 'Hangman: never say or hint the secret word.';
  }
  if (request.gameId === 'chess' || request.gameId === 'checkers') {
    return 'Verify captures on the piece roster / turn history before naming material.';
  }
  if (
    (request.gameId === 'tile-word-grid' || request.gameId === 'word-tile') &&
    request.moment.kind === 'highlight' &&
    humanMoved
  ) {
    return 'Word tile: react to their score — you take the rack next. Forbidden: "your turn now", "over to you", or any handoff line while **Turn clock** shows Lab Assistant on the clock.';
  }
  if (request.gameId === 'poker-holdem' && request.moment.kind === 'highlight') {
    if (humanMoved) {
      return 'Hold\'em: react to their committed action only — no fictitious raise sizes, no "I\'m about to shove", and **never** name pocket cards (aces, kings, etc.).';
    }
    return 'Hold\'em: describe only what your turn-history line says (fold, call, bet, raise) — no invented amounts and no naming hole-card ranks.';
  }
  void humanMoved;
  return '';
}
