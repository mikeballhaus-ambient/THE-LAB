import { describe, expect, test } from '@jest/globals';
import { buildLabGameBanterTurnUserContent } from '@/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt';
import { appendLabGameMatchSnapshotToPrompt } from '@/shared/game-platform/lab-assistant-banter/format-lab-game-match-state-for-prompt';

describe('buildLabGameBanterTurnUserContent', () => {
  test('human capture: opponent tone, not coach praise defaults', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'chess',
      matchId: 'm1',
      yourSeat: 1,
      humanDisplayName: 'Alex',
      moment: { kind: 'capture', moverSeat: 1, detail: 'queen' },
    });
    expect(text).toContain('Who just moved:** Alex');
    expect(text).toContain('The human player just captured Lab Assistant\'s piece');
    expect(text).toContain('Do **not** use the lab user\'s display name');
    expect(text).toContain('not a neutral coach');
  });

  test('assistant capture: first person, no congratulating human', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'chess',
      matchId: 'm1',
      yourSeat: 1,
      humanDisplayName: 'Alex',
      moment: { kind: 'capture', moverSeat: 2, detail: 'queen' },
    });
    expect(text).toContain('Who just moved:** Lab Assistant');
    expect(text).toContain('The human lost material');
    expect(text).toContain('Capture:** Lab Assistant');
    expect(text).toContain('first person');
    expect(text).toContain('Do **not** congratulate the human player for your own capture');
    expect(text).toContain('PG, warm, and good-natured');
    expect(text).toContain('curious lab partner');
  });

  test('human seat 2 check by human is labeled correctly', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'chess',
      matchId: 'm1',
      yourSeat: 2,
      humanDisplayName: 'Jordan',
      moment: { kind: 'check', moverSeat: 2 },
    });
    expect(text).toContain('**Jordan** (display name; seat 2 internal)');
    expect(text).toContain('Who just moved:** Jordan');
    expect(text).toContain('The human player put Lab Assistant in check');
  });

  test('slow_turn: table-grounded voice, general variety guidance', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'chess',
      matchId: 'match-abc',
      yourSeat: 1,
      humanDisplayName: 'Sam',
      moment: { kind: 'slow_turn', detail: 'ply-12' },
    });
    expect(text).toContain('has not shot yet this turn');
    expect(text).toContain('verifiable board facts');
    expect(text).toContain('The **human player** has not moved yet');
    expect(text).toContain('Avoid supportive tutor voice');
    expect(text).toMatch(/Tone: (easy|playful|mellow|patient)/);
  });

  test('slow_turn billiards: anchors on table flow', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'billiards',
      matchId: 'm-billiards',
      yourSeat: 1,
      moment: { kind: 'slow_turn', detail: 'ply-4' },
    });
    expect(text).toContain('Billiards table flow');
    expect(text).toContain('something on the felt');
    expect(text).toContain('you are **idle**');
    expect(text).toContain('Forbidden: "hunting my solids');
  });

  test('billiards dry miss highlight: first person, not slow-think waiting', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'billiards',
      matchId: 'm1',
      yourSeat: 1,
      moment: {
        kind: 'highlight',
        moverSeat: 2,
        detail: 'Lab Assistant shooter — dry shot — no balls pocketed; table still open',
      },
    });
    expect(text).toContain('Dry miss');
    expect(text).toContain('Shooting next**');
    expect(text).toContain('Forbidden voice');
    expect(text).toContain('Nice shot');
    expect(text).toContain('from the chair across the table');
    expect(text).toContain('not an announcer');
  });

  test('billiards human scratch: assistant places cue — forbid claiming assistant scratched', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'billiards',
      matchId: 'm1',
      yourSeat: 1,
      humanDisplayName: 'Alex',
      moment: {
        kind: 'scratch',
        moverSeat: 1,
        detail:
          'Human shooter — Scratch — ball in hand — pocketed 6, 15 (100% power) | Ball in hand: **Lab Assistant** places the cue ball (human fouled). | Shooting next: Lab Assistant places cue (ball in hand).',
      },
    });
    expect(text).toContain('Foul on human');
    expect(text).toContain('you (Lab Assistant) place the cue');
    expect(text).toContain('my cue is yours to place');
    expect(text).not.toContain('shoot next — human’s visit just ended');
  });

  test('billiards wrong ball turn-only: not scratch voice, no cue placement', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'billiards',
      matchId: 'm1',
      yourSeat: 1,
      moment: {
        kind: 'highlight',
        moverSeat: 2,
        detail:
          'Lab Assistant shooter — Wrong ball first — turn passes to opponent (38% power) | Foul type: wrong object first — **turn only** (no ball in hand; cue stays on table; **not a scratch**). | Shooting next: human player (on the clock).',
      },
    });
    expect(text).toContain('loss of turn only');
    expect(text).toContain('not a scratch');
    expect(text).toContain('Forbidden words: "scratch"');
    expect(text).toContain('hands you the cue');
    expect(text).not.toContain('Scratch voice');
    expect(text).not.toContain('places **their own** cue ball');
  });

  test('billiards assistant scratch: ball in hand belongs to human, not assistant voice', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'billiards',
      matchId: 'm1',
      yourSeat: 1,
      humanDisplayName: 'Alex',
      moment: {
        kind: 'scratch',
        moverSeat: 2,
        detail:
          'Scratch — ball in hand (55% power) | Ball in hand: **human player** places the cue ball (Lab Assistant fouled — assistant does **not** place). | Shooting next: human places cue (ball in hand).',
      },
    });
    expect(text).toContain('Alex places **their own** cue ball');
    expect(text).toContain('does **not** place');
    expect(text).toContain("I'll place my ball");
    expect(text).toContain('place mine wherever you like');
    expect(text).toContain('their own');
    expect(text).toContain('Scratch voice');
  });

  test('billiards pocket with turn pass: forbids hunting while human on clock', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'billiards',
      matchId: 'm1',
      yourSeat: 1,
      moment: {
        kind: 'pocket',
        moverSeat: 2,
        detail:
          'Lab Assistant shooter — Pocketed stripe 9. | Shooting next: human player (on the clock).',
      },
    });
    expect(text).toContain('human shoots next');
  });

  test('billiards facts include mandatory group grounding', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'billiards',
      matchId: 'm1',
      yourSeat: 1,
      moment: { kind: 'pocket', moverSeat: 2, detail: 'Pocketed stripe 10' },
    });
    expect(text).toContain('Billiards groups (mandatory)');
    expect(text).toContain('Race to the eight');
    expect(text).toContain('six stripes left while I hunt my solids');
    expect(text).toContain('Sidecar identity');
  });

  test('billiards assistant pocket: ownership facts forbid nice-shot praise for human', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'billiards',
      matchId: 'm1',
      yourSeat: 1,
      humanDisplayName: 'Alex',
      moment: {
        kind: 'pocket',
        moverSeat: 2,
        detail: 'Lab Assistant shooter — Pocketed this shot: solids 7. solids for seat 2: 1/7 pocketed.',
      },
    });
    expect(text).toContain('Who just moved:** Lab Assistant');
    expect(text).toContain('Lab Assistant pocketed');
    expect(text).toContain('never "nice shot"');
    expect(text).toContain('first person');
    expect(text).toContain('no "nice shot on 7"');
  });

  test('battleship human hit: opponent voice, no shooter coords or ship classes', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'battleship',
      matchId: 'm-bs',
      yourSeat: 1,
      humanDisplayName: 'Alex',
      moment: { kind: 'hit', moverSeat: 1 },
    });
    expect(text).toContain('Who just moved:** Alex');
    expect(text).toContain('they fired; you did **not** call this shot');
    expect(text).toContain('Forbidden in spoken lines:** grid coordinates');
    expect(text).toContain('never first-person as if you fired');
    expect(text).toContain('fleet commander who was **struck**');
  });

  test('battleship assistant hit: first person shooter, still no coords', () => {
    const text = buildLabGameBanterTurnUserContent({
      gameId: 'battleship',
      matchId: 'm-bs',
      yourSeat: 1,
      moment: { kind: 'hit', moverSeat: 2 },
    });
    expect(text).toContain('Who just moved:** Lab Assistant');
    expect(text).toContain('you fired this salvo');
    expect(text).toContain('first person as the shooter');
    expect(text).toContain('still **no** coordinates');
  });

  test('tile-word-grid human highlight: snapshot turn clock shows assistant next', () => {
    const base = buildLabGameBanterTurnUserContent({
      gameId: 'tile-word-grid',
      matchId: 'm-tw',
      yourSeat: 1,
      moment: { kind: 'highlight', moverSeat: 1, detail: '20' },
    });
    const text = appendLabGameMatchSnapshotToPrompt(base, {
      gameId: 'tile-word-grid',
      matchId: 'm-tw',
      status: 'active',
      opponentKind: 'ai',
      difficulty: 'medium',
      yourSeat: 1,
      currentSeat: 2,
      scores: { 1: 20, 2: 0 },
      turnRemainingMs: 60_000,
      turnHistoryLength: 1,
      turnHistory: [{ seat: 1, summary: 'Played EUCCNE for 20' }],
      lastTurn: { seat: 1, summary: 'Played EUCCNE for 20' },
      state: { scores: { 1: 20, 2: 0 } },
    });
    expect(text).toContain('Turn clock (authoritative)');
    expect(text).toContain('On the clock now:** Lab Assistant');
    expect(text).toContain('Word tile:');
    expect(text).toContain('your turn now');
  });

  test('slow_turn style cue rotates with ply detail', () => {
    const a = buildLabGameBanterTurnUserContent({
      gameId: 'chess',
      matchId: 'm1',
      yourSeat: 1,
      moment: { kind: 'slow_turn', detail: 'ply-3' },
    });
    const b = buildLabGameBanterTurnUserContent({
      gameId: 'chess',
      matchId: 'm1',
      yourSeat: 1,
      moment: { kind: 'slow_turn', detail: 'ply-19' },
    });
    expect(a).not.toBe(b);
  });
});
