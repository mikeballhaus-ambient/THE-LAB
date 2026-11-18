import type { GameServerAdapter } from './types';

type ClockState = {
  continueTurnSeat?: unknown;
  phase?: string;
  ballInHand?: boolean;
  ballInHandSeat?: number | null;
};

function seatFromUnknown(value: unknown): 1 | 2 | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (n === 1) {
    return 1;
  }
  if (n === 2) {
    return 2;
  }
  return null;
}

/**
 * Who holds the shot clock after `applyMove`. Billiards (and similar games) store
 * `continueTurnSeat` on the applied state — prefer that over generic alternation
 * when the adapter returns a stale toggle.
 */
export function resolveMatchClockSeat(
  state: unknown,
  adapter: GameServerAdapter | null,
  move: unknown,
  moverSeat: number,
): number {
  const s = state as ClockState;
  const fromAdapter = adapter?.nextSeatAfterMove?.(state, move, moverSeat, state) ?? null;
  const adapterSeat = seatFromUnknown(fromAdapter);
  const phase = typeof s.phase === 'string' ? s.phase : '';
  const ballInHand = Boolean(s.ballInHand);

  if (phase === 'place_cue') {
    return seatFromUnknown(s.ballInHandSeat) ?? adapterSeat ?? (moverSeat === 1 ? 2 : 1);
  }

  /**
   * Competitive aim: `continueTurnSeat` is written on every shot outcome. Ball-in-hand uses
   * `place_cue` — a stale `ballInHand: true` on `aim` must not ignore `continueTurnSeat`.
   */
  if (phase === 'aim') {
    const balls = (state as { balls?: Array<{ number?: number; pocketed?: boolean }> }).balls;
    if (Array.isArray(balls) && balls.length > 0) {
      const cueLive = balls.some((b) => b.number === 0 && !b.pocketed);
      if (!cueLive) {
        const bih = seatFromUnknown(s.ballInHandSeat);
        if (bih != null) {
          return bih;
        }
        return moverSeat === 1 ? 2 : 1;
      }
    }
    const cont = seatFromUnknown(s.continueTurnSeat);
    if (cont != null) {
      return cont;
    }
  }

  if (ballInHand) {
    const bih = seatFromUnknown(s.ballInHandSeat);
    if (bih != null) {
      return bih;
    }
  }

  if (adapterSeat != null) {
    return adapterSeat;
  }

  return moverSeat === 1 ? 2 : 1;
}
