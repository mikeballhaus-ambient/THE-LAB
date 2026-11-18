import { computed, onBeforeUnmount, shallowRef } from 'vue';
import type { BilliardsBall, BilliardsMatchState, BilliardsShotPayload } from '../../shared/billiards-types';
import { ensureBilliardsRapier } from '../../shared/billiards-rapier-init';
import { emitBilliardsRollFrame } from '../../shared/billiards-roll-sync';
import { resolveShotForSimulation } from '../../shared/billiards-break-variance';
import {
  alignRollPosesToSettleBalls,
  mergeOpponentReplayRollFrame,
} from '../../shared/billiards-roll-authority';
import {
  beginBilliardsRollSession,
  billiardsRollSessionIsActive,
  createBilliardsRollSessionState,
  endBilliardsRollSession,
  isBilliardsRollSessionCurrent,
} from '../../shared/billiards-roll-session';
import {
  PHYSICS_STEP_MS,
  buildShotResultFromSession,
  createRapierShotSession,
  destroyRapierShotSession,
  isRapierShotAtRest,
  readBilliardsRollFrame,
  stepRapierShotSession,
  updateBilliardsRapierColliderDebugSnapshot,
  type BilliardsBallPose,
} from '../../shared/billiards-rapier-sim';

const MAX_STEPS_PER_FRAME = 5;
const MAX_TOTAL_STEPS = 28_000;
const VUE_PUBLISH_EVERY = 2;

export type BilliardsPlayShotRollOptions = {
  /** When true, `shot` already passed through `resolveShotForSimulation` (server `lastShotReplay`). */
  shotVarianceResolved?: boolean;
  /** Opponent replay: snap the roll end to server balls (client Rapier may diverge from Node). */
  settleBalls?: BilliardsBall[];
};

function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function useBilliardsRollAnimation() {
  const sessionState = createBilliardsRollSessionState();
  const isRolling = computed(() => billiardsRollSessionIsActive(sessionState));
  const animatedBalls = shallowRef<BilliardsBall[] | null>(null);
  const animatedPoses = shallowRef<BilliardsBallPose[] | null>(null);
  let cancelActiveRaf: (() => void) | null = null;

  onBeforeUnmount(() => {
    cancelActiveRaf?.();
    cancelActiveRaf = null;
  });

  async function playShotRoll(
    state: BilliardsMatchState,
    shot: BilliardsShotPayload,
    options?: BilliardsPlayShotRollOptions,
  ): Promise<void> {
    const rollToken = beginBilliardsRollSession(sessionState);
    const tokenIsCurrent = () => isBilliardsRollSessionCurrent(sessionState, rollToken);

    if (tokenIsCurrent()) {
      animatedBalls.value = null;
      animatedPoses.value = null;
    }
    await yieldToPaint();

    if (!tokenIsCurrent()) {
      endBilliardsRollSession(sessionState, rollToken);
      return;
    }

    try {
      await ensureBilliardsRapier();
    } catch {
      endBilliardsRollSession(sessionState, rollToken);
      return;
    }

    if (!tokenIsCurrent()) {
      endBilliardsRollSession(sessionState, rollToken);
      return;
    }

    const simShot = options?.shotVarianceResolved
      ? shot
      : resolveShotForSimulation(state, shot);
    let session: ReturnType<typeof createRapierShotSession>;
    const authoritySettle = options?.settleBalls;
    try {
      session = createRapierShotSession(state, simShot, {
        replaySettleBalls: authoritySettle,
      });
    } catch {
      if (tokenIsCurrent()) {
        animatedBalls.value = null;
        animatedPoses.value = null;
      }
      endBilliardsRollSession(sessionState, rollToken);
      return;
    }

    const publishRollFrame = (raw: { balls: BilliardsBall[]; poses: BilliardsBallPose[] }) => {
      if (!tokenIsCurrent()) {
        return;
      }
      if (!authoritySettle) {
        animatedBalls.value = raw.balls;
        animatedPoses.value = raw.poses;
        emitBilliardsRollFrame(raw.balls, raw.poses);
        return;
      }
      const merged = mergeOpponentReplayRollFrame(raw, authoritySettle);
      animatedBalls.value = merged.balls;
      animatedPoses.value = merged.poses;
      emitBilliardsRollFrame(merged.balls, merged.poses);
    };

    let frame = readBilliardsRollFrame(session, state);
    publishRollFrame(frame);

    let accumulator = 0;
    let lastTime = performance.now();
    let totalSteps = 0;
    let publishCounter = 0;

    await new Promise<void>((resolve) => {
      let rafId: number | null = null;
      const cancel = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        try {
          destroyRapierShotSession(session);
        } catch {
          /* session may already be gone */
        }
      };
      cancelActiveRaf = cancel;

      const finish = () => {
        cancelActiveRaf = null;
        endBilliardsRollSession(sessionState, rollToken);
        resolve();
      };

      const tick = (now: number) => {
        if (!tokenIsCurrent()) {
          cancel();
          finish();
          return;
        }
        const frameDelta = Math.min(28, now - lastTime);
        lastTime = now;
        accumulator += frameDelta;

        let stepsThisFrame = 0;
        while (accumulator >= PHYSICS_STEP_MS && stepsThisFrame < MAX_STEPS_PER_FRAME && totalSteps < MAX_TOTAL_STEPS) {
          stepRapierShotSession(session);
          accumulator -= PHYSICS_STEP_MS;
          stepsThisFrame += 1;
          totalSteps += 1;
        }

        if (stepsThisFrame > 0 || publishCounter % VUE_PUBLISH_EVERY === 0) {
          frame = readBilliardsRollFrame(session, state);
          if (publishCounter % VUE_PUBLISH_EVERY === 0) {
            publishRollFrame(frame);
          } else if (!authoritySettle) {
            if (tokenIsCurrent()) {
              emitBilliardsRollFrame(frame.balls, frame.poses);
            }
          } else if (tokenIsCurrent()) {
            const merged = mergeOpponentReplayRollFrame(frame, authoritySettle);
            emitBilliardsRollFrame(merged.balls, merged.poses);
          }
        }
        publishCounter += 1;

        if (isRapierShotAtRest(session) || totalSteps >= MAX_TOTAL_STEPS) {
          if (tokenIsCurrent()) {
            frame = readBilliardsRollFrame(session, state);
            const resolved = buildShotResultFromSession(session, state);
            const finalBalls = options?.settleBalls ?? resolved.balls;
            const finalPoses = authoritySettle
              ? alignRollPosesToSettleBalls(frame.poses, finalBalls)
              : frame.poses;
            animatedBalls.value = finalBalls;
            animatedPoses.value = finalPoses;
            emitBilliardsRollFrame(finalBalls, finalPoses);
            updateBilliardsRapierColliderDebugSnapshot(
              authoritySettle ?? resolved.balls,
            );
          }
          destroyRapierShotSession(session);
          finish();
          return;
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    });
  }

  function clearRollOverlay(): void {
    if (billiardsRollSessionIsActive(sessionState)) {
      return;
    }
    animatedBalls.value = null;
    animatedPoses.value = null;
  }

  return { isRolling, animatedBalls, animatedPoses, playShotRoll, clearRollOverlay, sessionState };
}
