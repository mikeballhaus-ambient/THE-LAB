import { onUnmounted, ref } from 'vue';
import { billiardTrayRollDegreesFromDeltaPx } from '../../shared/billiard-roll-visual';
import { groupForBall } from '../../shared/billiards-rules';
import {
  type BilliardsMatchTrayContext,
  ballBelongsInEightBallMatchTray,
} from '../../shared/billiards-match-tray-progress';
import type { BilliardsAssignedGroup, BilliardsBall } from '../../shared/billiards-types';

/**
 * Tray packing is done in **pixels, not percentages**.
 *
 * A percentage step cannot make balls touch — the correct step depends on the rendered
 * track width and the ball diameter, so a fixed `7.5%` leaves a gap that changes with the
 * viewport. The track reports its width, and the rest positions are then derived from the
 * ball diameter so adjacent balls are exactly one diameter apart.
 */
/** Tray ball diameter — smaller than table chips so more pocketed balls fit (incl. wrong-group). */
export const BALL_DIAMETER_PX = 32;
/** Gap between the rightmost ball and the closed end of the trough. */
const TRAY_END_PAD_PX = 8;

/** 8-ball: full object rack (15) in case wrong-group balls land in your tray. */
export const BILLIARDS_EIGHT_BALL_TRAY_SLOTS = 15;
export const BILLIARDS_NINE_BALL_TRAY_SLOTS = 9;

export const BILLIARDS_TRAY_BALL_SIZE_REM = `${BALL_DIAMETER_PX / 16}rem`;

export function billiardsMatchTraySlotCount(profile: 'eight-ball' | 'nine-ball' | 'free'): number {
  return profile === 'nine-ball' ? BILLIARDS_NINE_BALL_TRAY_SLOTS : BILLIARDS_EIGHT_BALL_TRAY_SLOTS;
}

export function billiardsTrayTrackMinWidthPx(slotCount: number): number {
  return TRAY_END_PAD_PX * 2 + BALL_DIAMETER_PX * slotCount + 12;
}
/** Where a newly pocketed ball starts, before it rolls in. */
const TRAY_ENTRY_PCT = -4;

/**
 * A sunk ball must start rolling **as soon as the pocket commits**, not when the whole
 * table animation settles. Keep the settle lead tiny and stagger only the balls that
 * went down in the *same* batch — a match-global pocket counter made the 8th–10th
 * pocket of a frame wait 1.8–2.7 s before the tray moved at all.
 */
const POCKET_SETTLE_MS = 90;
const POCKET_STAGGER_MS = 140;
/**
 * Tray motion is **purely visual** (not sim physics): constant speed in px/s, linear interpolation.
 * Tweak `TRAY_VISUAL_SPEED_PX_PER_SEC` only — duration follows path length.
 */
const TRAY_VISUAL_SPEED_PX_PER_SEC = 200;
const TRAY_MOVE_DURATION_MIN_MS = 280;
const TRAY_MOVE_DURATION_MAX_MS = 3200;
/** Treat positions within this (pct) of entry as the entry chute (rolling path only). */
const ENTRY_PCT_EPS = 0.75;

export interface CollectedTrayBallView {
  id: string;
  number: number;
  positionPct: number;
  rolling: boolean;
  /**
   * Cumulative roll for CSS (`rotateZ`), driven by no-slip distance along the tray
   * (`Δθ = Δs / r` in px space) — markings stay locked to the sphere chrome.
   */
  rollAngleDeg: number;
}

interface TrayBallState extends CollectedTrayBallView {
  pocketOrder: number;
}

export function useBilliardsCollectedTray() {
  const trayBalls = ref<TrayBallState[]>([]);
  const knownPocketedIds = new Set<string>();
  let nextPocketOrder = 0;
  const animFrames = new Map<string, number>();
  const animTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  let trackWidthPx = 640;

  const ballRadiusPx = BALL_DIAMETER_PX / 2;

  /** No-slip roll (degrees) for centre moving from `fromPct` to `toPct` along the track. */
  function rollDegreesAlongTray(fromPct: number, toPct: number): number {
    const deltaPx = ((toPct - fromPct) / 100) * trackWidthPx;
    return billiardTrayRollDegreesFromDeltaPx(deltaPx, ballRadiusPx);
  }

  /**
   * A ball that **enters** at `TRAY_ENTRY_PCT` and rolls to `finalSlotPct` picks up
   * `rollDegreesAlongTray(TRAY_ENTRY_PCT, finalSlotPct)` on the shell. Choose initial
   * `rollAngleDeg` as the negative of that total so at rest in the slot the art reads upright
   * (0° mod 360) with no post-hoc correction.
   */
  function initialRollAngleDegForEntryPath(finalSlotPct: number): number {
    return -rollDegreesAlongTray(TRAY_ENTRY_PCT, finalSlotPct);
  }

  function isFromTrayEntry(fromPct: number): boolean {
    return Math.abs(fromPct - TRAY_ENTRY_PCT) < ENTRY_PCT_EPS;
  }

  /** Centre of slot `slotIndex`, measured from the closed right end of the trough. */
  function restPositionPct(slotIndex: number): number {
    const centerFromRight =
      TRAY_END_PAD_PX + BALL_DIAMETER_PX / 2 + slotIndex * BALL_DIAMETER_PX;
    const x = trackWidthPx - centerFromRight;
    const halfBallPct = (BALL_DIAMETER_PX / 2 / trackWidthPx) * 100;
    const pct = (x / trackWidthPx) * 100;
    return Math.max(halfBallPct, Math.min(100 - halfBallPct, pct));
  }

  function trayMoveDurationMs(fromPct: number, toPct: number): number {
    const deltaPx = (Math.abs(toPct - fromPct) / 100) * trackWidthPx;
    if (deltaPx <= 0) {
      return TRAY_MOVE_DURATION_MIN_MS;
    }
    const ms = (deltaPx / TRAY_VISUAL_SPEED_PX_PER_SEC) * 1000;
    return Math.min(TRAY_MOVE_DURATION_MAX_MS, Math.max(TRAY_MOVE_DURATION_MIN_MS, ms));
  }

  function cancelAnim(id: string): void {
    const timeout = animTimeouts.get(id);
    if (timeout != null) {
      clearTimeout(timeout);
      animTimeouts.delete(id);
    }
    const frame = animFrames.get(id);
    if (frame != null) {
      cancelAnimationFrame(frame);
      animFrames.delete(id);
    }
  }

  function reset(): void {
    for (const timeout of animTimeouts.values()) {
      clearTimeout(timeout);
    }
    animTimeouts.clear();
    for (const frame of animFrames.values()) {
      cancelAnimationFrame(frame);
    }
    animFrames.clear();
    knownPocketedIds.clear();
    nextPocketOrder = 0;
    trayBalls.value = [];
  }

  function animateBallTo(id: string, targetPct: number, delayMs: number): void {
    cancelAnim(id);

    const run = (): void => {
      animTimeouts.delete(id);
      const entry = trayBalls.value.find((b) => b.id === id);
      if (!entry) {
        return;
      }
      const fromPct = entry.positionPct;
      const duration = trayMoveDurationMs(fromPct, targetPct);
      /** Only the path from the entry chute uses visible roll; packed-slot shuffles slide upright. */
      const useTrayRoll = isFromTrayEntry(fromPct);
      /** Pre-biased at spawn so entry roll + this bias ends at 0° in the final slot. */
      const initialRollDeg = entry.rollAngleDeg;
      entry.rolling = true;
      const animStart = performance.now();

      const tick = (now: number) => {
        const t = Math.min(1, (now - animStart) / duration);
        const nextPct = fromPct + (targetPct - fromPct) * t;
        if (useTrayRoll) {
          const rolledFromStart = rollDegreesAlongTray(fromPct, nextPct);
          entry.rollAngleDeg = initialRollDeg + rolledFromStart;
        }
        entry.positionPct = nextPct;

        if (t < 1) {
          animFrames.set(id, requestAnimationFrame(tick));
        } else {
          entry.positionPct = targetPct;
          animFrames.delete(id);
          entry.rolling = false;
          if (useTrayRoll) {
            entry.rollAngleDeg = initialRollDeg + rollDegreesAlongTray(fromPct, targetPct);
          }
        }
      };
      animFrames.set(id, requestAnimationFrame(tick));
    };

    if (delayMs <= 0) {
      run();
    } else {
      animTimeouts.set(id, setTimeout(run, delayMs));
    }
  }

  /** Snap every resting ball to its packed slot (no animation). */
  function repackResting(): void {
    trayBalls.value.forEach((ball, index) => {
      if (ball.rolling) {
        return;
      }
      ball.positionPct = restPositionPct(index);
      ball.rollAngleDeg = 0;
    });
  }

  function setTrackWidth(px: number): void {
    if (!Number.isFinite(px) || px <= 0) {
      return;
    }
    const changed = Math.abs(px - trackWidthPx) > 0.5;
    trackWidthPx = px;
    if (changed) {
      repackResting();
    }
  }

  /** Returns `true` only when this call actually inserted a new tray ball. */
  function registerPocketedBall(
    ball: Pick<BilliardsBall, 'id' | 'number'>,
    batchIndex = 0,
  ): boolean {
    if (ball.number <= 0 || knownPocketedIds.has(ball.id)) {
      return false;
    }
    if (trayBalls.value.some((existing) => existing.number === ball.number)) {
      return false;
    }
    knownPocketedIds.add(ball.id);
    const pocketOrder = nextPocketOrder;
    nextPocketOrder += 1;

    const finalSlotPctAtRegister = restPositionPct(trayBalls.value.length);

    trayBalls.value.push({
      id: ball.id,
      number: ball.number,
      positionPct: TRAY_ENTRY_PCT,
      rolling: false,
      rollAngleDeg: initialRollAngleDegForEntryPath(finalSlotPctAtRegister),
      pocketOrder,
    });
    trayBalls.value.sort((a, b) => a.pocketOrder - b.pocketOrder);

    const total = trayBalls.value.length;
    const newIndex = total - 1;

    // Everything already resting shifts one slot left to make room.
    for (let i = 0; i < newIndex; i += 1) {
      const existing = trayBalls.value[i];
      if (!existing) {
        continue;
      }
      const target = restPositionPct(i);
      if (Math.abs(existing.positionPct - target) < 0.15) {
        existing.positionPct = target;
        existing.rollAngleDeg = 0;
        continue;
      }
      animateBallTo(existing.id, target, 60);
    }

    const newest = trayBalls.value[newIndex];
    if (newest) {
      const delay = POCKET_SETTLE_MS + batchIndex * POCKET_STAGGER_MS;
      const targetPct = restPositionPct(newIndex);
      newest.rollAngleDeg = initialRollAngleDegForEntryPath(targetPct);
      animateBallTo(newest.id, targetPct, delay);
    }
    return true;
  }

  function syncPocketedFromBalls(
    balls: BilliardsBall[] | null | undefined,
    options?: {
      pocketedBySeat?: number;
      assignedGroup?: BilliardsAssignedGroup | null;
      traySeat?: number;
      matchTrayContext?: BilliardsMatchTrayContext;
      /** Shooter seat while roll physics runs (8-ball eight before `pocketedBySeat` is stamped). */
      impliedPocketSeat?: number | null;
    },
  ): void {
    if (!balls) {
      return;
    }
    const eligible = balls.filter((ball) => {
      if (options?.matchTrayContext && options.traySeat != null) {
        if (options.matchTrayContext.rulesProfile === 'eight-ball') {
          return ballBelongsInEightBallMatchTray(
            ball,
            options.traySeat,
            options.assignedGroup,
            options.matchTrayContext,
            options.impliedPocketSeat,
          );
        }
      }
      if (!ball.pocketed || ball.number <= 0 || ball.number === 8) {
        return false;
      }
      if (options?.assignedGroup != null) {
        return groupForBall(ball.number) === options.assignedGroup;
      }
      if (options?.pocketedBySeat != null) {
        return ball.pocketedBySeat === options.pocketedBySeat;
      }
      return true;
    });
    const keepIds = new Set(eligible.map((ball) => ball.id));
    for (const trayBall of trayBalls.value) {
      if (keepIds.has(trayBall.id)) {
        continue;
      }
      knownPocketedIds.delete(trayBall.id);
      cancelAnim(trayBall.id);
    }
    if (trayBalls.value.some((ball) => !keepIds.has(ball.id))) {
      trayBalls.value = trayBalls.value.filter((ball) => keepIds.has(ball.id));
      repackResting();
    }
    const seenIds = new Set<string>();
    const dedupedEligible = eligible.filter((ball) => {
      if (seenIds.has(ball.id)) {
        return false;
      }
      seenIds.add(ball.id);
      return true;
    });
    /** Stagger only the balls that went down together in this sync pass. */
    let batchIndex = 0;
    for (const ball of dedupedEligible) {
      if (registerPocketedBall(ball, batchIndex)) {
        batchIndex += 1;
      }
    }
  }

  onUnmounted(() => {
    reset();
  });

  return {
    trayBalls,
    reset,
    setTrackWidth,
    syncPocketedFromBalls,
  };
}
