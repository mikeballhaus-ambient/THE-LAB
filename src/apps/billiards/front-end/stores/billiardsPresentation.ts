import { defineStore } from 'pinia';
import type { BilliardsLastShotReplay, BilliardsMatchState } from '../../shared/billiards-types';
import {
  billiardsOpponentPresentationKey,
  billiardsShouldDeferBanterForPresentation,
} from '../../shared/billiards-opponent-presentation-defer';
import { resolveOpponentReplayPreShot } from '../../shared/billiards-replay-pre-shot';
import {
  isBilliardsPendingOpponentShotReplay,
  shouldBilliardsReplayOpponentShot,
} from '../../shared/billiards-opponent-replay-sync';
import { computeSkippedOpponentShots } from '../../shared/billiards-presentation-jobs';
import { isBilliardsPendingOpponentPresentation } from '../../shared/billiards-player-turn-feed-defer';

export interface BilliardsIngestPayload {
  matchId: string | null;
  yourSeat: number;
  practiceMode: boolean;
  state: BilliardsMatchState;
}

export type BilliardsIngestResult = 'applied' | 'deferred';

export type BilliardsOpponentShotPresentationPhase = 'idle' | 'queued' | 'aim_pull' | 'rolling';
export type BilliardsOpponentPlacePresentationPhase = 'idle' | 'animating';

export interface BilliardsPresentationModel {
  matchId: string | null;
  yourSeat: number;
  practiceMode: boolean;
  authoritative: BilliardsMatchState | null;
  /** Layout baseline before the latest authoritative commit — pre-shot input for opponent replay. */
  baseline: BilliardsMatchState | null;
  lastConsumedShotReplay: number;
  lastConsumedCuePlaceIndex: number;
  presentedKeys: string[];
  opponentShotPhase: BilliardsOpponentShotPresentationPhase;
  opponentPlacePhase: BilliardsOpponentPlacePresentationPhase;
  /** Authoritative state received while the presentation executor is busy (latest wins). */
  pendingAuthoritative: BilliardsMatchState | null;
  presentationExecutorBusy: boolean;
  /** Collapsed feed lines for opponent strokes skipped during ingest deferral. */
  skippedFeedSummaries: string[];
  inFlightShotReplay: number | null;
  clientIsRolling: boolean;
}

export type BilliardsPresentationEvent =
  | { type: 'RESET'; matchId: string | null; yourSeat: number; practiceMode: boolean }
  | { type: 'AUTHORITATIVE_ARRIVED'; state: BilliardsMatchState }
  | { type: 'INGEST_DEFERRED'; state: BilliardsMatchState }
  | { type: 'BASELINE_COMMITTED'; state: BilliardsMatchState }
  | { type: 'OPPONENT_SHOT_REPLAY_STARTED'; shotsTaken: number }
  | { type: 'OPPONENT_SHOT_ROLL_STARTED' }
  | { type: 'OPPONENT_SHOT_REPLAY_ENDED' }
  | { type: 'OPPONENT_SHOT_REPLAY_FINISHED'; shotsTaken: number }
  | { type: 'OPPONENT_PLACE_STARTED'; historyIndex: number }
  | { type: 'OPPONENT_PLACE_ENDED' }
  | { type: 'PRESENTATION_KEY_ACKED'; key: string };

export function createInitialBilliardsPresentation(): BilliardsPresentationModel {
  return {
    matchId: null,
    yourSeat: 1,
    practiceMode: false,
    authoritative: null,
    baseline: null,
    lastConsumedShotReplay: -1,
    lastConsumedCuePlaceIndex: -1,
    presentedKeys: [],
    opponentShotPhase: 'idle',
    opponentPlacePhase: 'idle',
    pendingAuthoritative: null,
    presentationExecutorBusy: false,
    skippedFeedSummaries: [],
    inFlightShotReplay: null,
    clientIsRolling: false,
  };
}

function opponentReplayActive(phase: BilliardsOpponentShotPresentationPhase): boolean {
  return phase === 'aim_pull' || phase === 'rolling';
}

export function reduceBilliardsPresentation(
  current: BilliardsPresentationModel,
  event: BilliardsPresentationEvent,
): BilliardsPresentationModel {
  switch (event.type) {
    case 'RESET':
      return {
        ...createInitialBilliardsPresentation(),
        matchId: event.matchId,
        yourSeat: event.yourSeat,
        practiceMode: event.practiceMode,
      };
    case 'INGEST_DEFERRED': {
      const previousPending = current.pendingAuthoritative;
      let skippedFeedSummaries = current.skippedFeedSummaries;
      let presentedKeys = current.presentedKeys;
      let lastConsumedShotReplay = current.lastConsumedShotReplay;
      if (previousPending) {
        const skipped = computeSkippedOpponentShots(
          current.yourSeat,
          current.lastConsumedShotReplay,
          previousPending,
          event.state,
        );
        if (skipped) {
          skippedFeedSummaries = [...skippedFeedSummaries, skipped.summary];
          presentedKeys = [...presentedKeys, ...skipped.ackedKeys.filter((k) => !presentedKeys.includes(k))];
          lastConsumedShotReplay = Math.max(lastConsumedShotReplay, skipped.lastConsumedShotReplay);
        }
      }
      return {
        ...current,
        pendingAuthoritative: event.state,
        skippedFeedSummaries,
        presentedKeys,
        lastConsumedShotReplay,
      };
    }
    case 'AUTHORITATIVE_ARRIVED': {
      const authoritative = event.state;
      const baseline = current.baseline;
      let opponentShotPhase = current.opponentShotPhase;
      const pendingShotReplay = isBilliardsPendingOpponentShotReplay({
        practiceMode: current.practiceMode,
        yourSeat: current.yourSeat,
        state: authoritative,
        lastConsumedReplayShots: current.lastConsumedShotReplay,
        opponentReplayBusy: opponentReplayActive(current.opponentShotPhase),
        isRolling: current.clientIsRolling,
      });
      if (!current.practiceMode) {
        if (opponentShotPhase === 'idle' && pendingShotReplay) {
          opponentShotPhase = 'queued';
        } else if (opponentShotPhase === 'queued' && !pendingShotReplay) {
          opponentShotPhase = 'idle';
        }
      }
      return {
        ...current,
        authoritative,
        baseline,
        opponentShotPhase,
      };
    }
    case 'BASELINE_COMMITTED': {
      const inFlight =
        current.opponentShotPhase === 'aim_pull' || current.opponentShotPhase === 'rolling';
      let opponentShotPhase: BilliardsOpponentShotPresentationPhase = inFlight
        ? current.opponentShotPhase
        : 'idle';
      if (
        !inFlight &&
        current.opponentShotPhase === 'queued' &&
        isBilliardsPendingOpponentShotReplay({
          practiceMode: current.practiceMode,
          yourSeat: current.yourSeat,
          state: event.state,
          lastConsumedReplayShots: current.lastConsumedShotReplay,
          opponentReplayBusy: false,
          isRolling: current.clientIsRolling,
        })
      ) {
        opponentShotPhase = 'queued';
      }
      return {
        ...current,
        authoritative: event.state,
        baseline: event.state,
        opponentShotPhase,
      };
    }
    case 'OPPONENT_SHOT_REPLAY_STARTED':
      return {
        ...current,
        inFlightShotReplay: event.shotsTaken,
        opponentShotPhase: 'aim_pull',
      };
    case 'OPPONENT_SHOT_REPLAY_FINISHED':
      return {
        ...current,
        lastConsumedShotReplay: event.shotsTaken,
        inFlightShotReplay: null,
        opponentShotPhase: 'idle',
      };
    case 'OPPONENT_SHOT_ROLL_STARTED':
      return {
        ...current,
        opponentShotPhase: 'rolling',
      };
    case 'OPPONENT_SHOT_REPLAY_ENDED':
      return {
        ...current,
        opponentShotPhase: 'idle',
      };
    case 'OPPONENT_PLACE_STARTED':
      return {
        ...current,
        lastConsumedCuePlaceIndex: event.historyIndex,
        opponentPlacePhase: 'animating',
      };
    case 'OPPONENT_PLACE_ENDED':
      return {
        ...current,
        opponentPlacePhase: 'idle',
      };
    case 'PRESENTATION_KEY_ACKED': {
      if (current.presentedKeys.includes(event.key)) {
        return current;
      }
      return {
        ...current,
        presentedKeys: [...current.presentedKeys, event.key],
      };
    }
    default:
      return current;
  }
}

export interface BilliardsOpponentShotReplayPlan {
  run: boolean;
  preShot: BilliardsMatchState | null;
  replay: BilliardsLastShotReplay | null;
}

export function planBilliardsOpponentShotReplay(
  model: BilliardsPresentationModel,
  authoritative: BilliardsMatchState,
  isRolling: boolean,
): BilliardsOpponentShotReplayPlan {
  const replay = authoritative.lastShotReplay ?? null;
  const preShot = resolveOpponentReplayPreShot(model.baseline, authoritative, replay);
  const run = shouldBilliardsReplayOpponentShot({
    practiceMode: model.practiceMode,
    yourSeat: model.yourSeat,
    state: authoritative,
    preShot,
    lastConsumedReplayShots: model.lastConsumedShotReplay,
    opponentReplayBusy: opponentReplayActive(model.opponentShotPhase),
    opponentPlacementBusy: model.opponentPlacePhase === 'animating',
    isRolling,
  });
  return {
    run,
    preShot: run ? preShot : null,
    replay: run && replay ? replay : null,
  };
}

export function planBilliardsOpponentCuePlace(
  model: BilliardsPresentationModel,
  authoritative: BilliardsMatchState,
): boolean {
  if (model.practiceMode) {
    return false;
  }
  const placeReplay = authoritative.lastCuePlaceReplay;
  if (!placeReplay || placeReplay.seat === model.yourSeat) {
    return false;
  }
  if (placeReplay.historyIndex !== authoritative.turnHistory.length) {
    return false;
  }
  if (placeReplay.historyIndex === model.lastConsumedCuePlaceIndex) {
    return false;
  }
  if (
    opponentReplayActive(model.opponentShotPhase) ||
    model.opponentPlacePhase === 'animating'
  ) {
    return false;
  }
  return true;
}

export const useBilliardsPresentationStore = defineStore('billiardsPresentation', {
  state: (): BilliardsPresentationModel => createInitialBilliardsPresentation(),

  getters: {
    preShotBalls(state): BilliardsMatchState['balls'] | null {
      if (!state.authoritative) {
        return state.baseline?.balls ?? null;
      }
      const preShot = resolveOpponentReplayPreShot(
        state.baseline,
        state.authoritative,
        state.authoritative.lastShotReplay,
      );
      return preShot?.balls ?? null;
    },
    holdOpponentReplayFelt(state): boolean {
      if (state.practiceMode) {
        return false;
      }
      if (state.opponentShotPhase !== 'idle') {
        return true;
      }
      if (!state.authoritative) {
        return false;
      }
      return isBilliardsPendingOpponentShotReplay({
        practiceMode: state.practiceMode,
        yourSeat: state.yourSeat,
        state: state.authoritative,
        lastConsumedReplayShots: state.lastConsumedShotReplay,
        opponentReplayBusy: opponentReplayActive(state.opponentShotPhase),
        isRolling: state.clientIsRolling,
      });
    },
    pendingOpponentShotReplay(state): boolean {
      if (state.practiceMode || !state.authoritative) {
        return false;
      }
      return isBilliardsPendingOpponentShotReplay({
        practiceMode: state.practiceMode,
        yourSeat: state.yourSeat,
        state: state.authoritative,
        lastConsumedReplayShots: state.lastConsumedShotReplay,
        opponentReplayBusy: opponentReplayActive(state.opponentShotPhase),
        isRolling: state.clientIsRolling,
      });
    },
    /** Shot or cue-place replay the presentation pipeline still owes (excludes in-flight roll busy). */
    pendingOpponentPresentation(state): boolean {
      if (state.practiceMode || !state.authoritative) {
        return false;
      }
      return isBilliardsPendingOpponentPresentation({
        practiceMode: state.practiceMode,
        yourSeat: state.yourSeat,
        state: state.authoritative,
        lastConsumedShotReplay: state.lastConsumedShotReplay,
        lastConsumedCuePlaceIndex: state.lastConsumedCuePlaceIndex,
        opponentPlacePhase: state.opponentPlacePhase,
      });
    },
    opponentReplayBusy(state): boolean {
      return opponentReplayActive(state.opponentShotPhase);
    },
    opponentPlacementBusy(state): boolean {
      return state.opponentPlacePhase === 'animating';
    },
    opponentPresentationBusy(state): boolean {
      /** Active aim/roll/place only — `queued` waits on the presentation pipeline without blocking the shell. */
      return (
        opponentReplayActive(state.opponentShotPhase) ||
        state.opponentPlacePhase === 'animating'
      );
    },
    presentedKeySet(state): Set<string> {
      return new Set(state.presentedKeys);
    },
    shouldDeferBanter(state): (authoritative: BilliardsMatchState) => boolean {
      return (authoritative: BilliardsMatchState) => {
        if (state.practiceMode) {
          return false;
        }
        return billiardsShouldDeferBanterForPresentation(
          authoritative,
          state.yourSeat,
          new Set(state.presentedKeys),
        );
      };
    },
  },

  actions: {
    ingestAuthoritative(payload: BilliardsIngestPayload): BilliardsIngestResult {
      const { matchId, yourSeat, practiceMode, state } = payload;
      const matchIdChanged = matchId != null && matchId !== this.matchId;
      if (matchIdChanged) {
        this.$patch(
          reduceBilliardsPresentation(this.$state, {
            type: 'RESET',
            matchId,
            yourSeat,
            practiceMode,
          }),
        );
      } else {
        this.matchId = matchId ?? this.matchId;
        this.yourSeat = yourSeat;
        this.practiceMode = practiceMode;
      }

      if (practiceMode) {
        this.$patch({
          authoritative: state,
          pendingAuthoritative: null,
        });
        return 'applied';
      }

      if (this.presentationExecutorBusy) {
        this.$patch(reduceBilliardsPresentation(this.$state, { type: 'INGEST_DEFERRED', state }));
        return 'deferred';
      }

      this.$patch(reduceBilliardsPresentation(this.$state, { type: 'AUTHORITATIVE_ARRIVED', state }));
      return 'applied';
    },

    setPresentationExecutorBusy(busy: boolean): void {
      this.presentationExecutorBusy = busy;
    },

    flushPendingAuthoritative(): BilliardsIngestResult {
      const pending = this.pendingAuthoritative;
      if (!pending) {
        return 'applied';
      }
      this.pendingAuthoritative = null;
      if (this.presentationExecutorBusy) {
        this.$patch(reduceBilliardsPresentation(this.$state, { type: 'INGEST_DEFERRED', state: pending }));
        return 'deferred';
      }
      this.$patch(reduceBilliardsPresentation(this.$state, { type: 'AUTHORITATIVE_ARRIVED', state: pending }));
      return 'applied';
    },

    onAuthoritativeArrived(state: BilliardsMatchState): void {
      this.$patch(reduceBilliardsPresentation(this.$state, { type: 'AUTHORITATIVE_ARRIVED', state }));
    },

    commitBaseline(state: BilliardsMatchState): void {
      this.$patch(reduceBilliardsPresentation(this.$state, { type: 'BASELINE_COMMITTED', state }));
    },

    planOpponentShotReplay(
      authoritative: BilliardsMatchState,
      isRolling: boolean,
    ): BilliardsOpponentShotReplayPlan {
      return planBilliardsOpponentShotReplay(this.$state, authoritative, isRolling);
    },

    shouldReplayOpponentCuePlace(authoritative: BilliardsMatchState): boolean {
      return planBilliardsOpponentCuePlace(this.$state, authoritative);
    },

    setClientRollActive(isRolling: boolean): void {
      this.clientIsRolling = isRolling;
    },

    beginOpponentShotReplay(shotsTaken: number): void {
      this.$patch(
        reduceBilliardsPresentation(this.$state, {
          type: 'OPPONENT_SHOT_REPLAY_STARTED',
          shotsTaken,
        }),
      );
    },

    finishOpponentShotReplay(shotsTaken: number): void {
      this.$patch(
        reduceBilliardsPresentation(this.$state, {
          type: 'OPPONENT_SHOT_REPLAY_FINISHED',
          shotsTaken,
        }),
      );
    },

    beginOpponentShotRoll(): void {
      this.$patch(reduceBilliardsPresentation(this.$state, { type: 'OPPONENT_SHOT_ROLL_STARTED' }));
    },

    endOpponentShotReplay(): void {
      this.$patch(reduceBilliardsPresentation(this.$state, { type: 'OPPONENT_SHOT_REPLAY_ENDED' }));
    },

    /** Drop stale `queued` when server state no longer needs a shot replay. */
    clearOpponentShotQueueIfStale(authoritative: BilliardsMatchState): void {
      if (this.opponentShotPhase !== 'queued') {
        return;
      }
      const pending = isBilliardsPendingOpponentShotReplay({
        practiceMode: this.practiceMode,
        yourSeat: this.yourSeat,
        state: authoritative,
        lastConsumedReplayShots: this.lastConsumedShotReplay,
        opponentReplayBusy: false,
        isRolling: this.clientIsRolling,
      });
      if (!pending) {
        this.endOpponentShotReplay();
      }
    },

    beginOpponentCuePlace(historyIndex: number): void {
      this.$patch(
        reduceBilliardsPresentation(this.$state, {
          type: 'OPPONENT_PLACE_STARTED',
          historyIndex,
        }),
      );
    },

    endOpponentCuePlace(): void {
      this.$patch(reduceBilliardsPresentation(this.$state, { type: 'OPPONENT_PLACE_ENDED' }));
    },

    ackPresentationKey(key: string): void {
      this.$patch(reduceBilliardsPresentation(this.$state, { type: 'PRESENTATION_KEY_ACKED', key }));
    },

    ackPresentationForState(authoritative: BilliardsMatchState): void {
      const key = billiardsOpponentPresentationKey(authoritative, this.yourSeat);
      if (key) {
        this.ackPresentationKey(key);
      }
      const replay = authoritative.lastShotReplay;
      if (
        replay &&
        replay.seat !== this.yourSeat &&
        replay.shotsTaken === authoritative.shotsTaken &&
        this.lastConsumedShotReplay < replay.shotsTaken
      ) {
        this.$patch({ lastConsumedShotReplay: replay.shotsTaken });
      }
    },
  },
});
