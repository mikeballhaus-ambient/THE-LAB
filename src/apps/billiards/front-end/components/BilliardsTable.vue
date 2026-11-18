<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, toRaw, useTemplateRef, watch, watchEffect } from 'vue';
import { storeToRefs } from 'pinia';
import { makeDroppable, useDnDProvider } from '@vue-dnd-kit/core';
import type { IDragEvent } from '@vue-dnd-kit/core';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type {
  BilliardsAssignedGroup,
  BilliardsBall,
  BilliardsLastCuePlaceReplay,
  BilliardsLastShotReplay,
  BilliardsMatchState,
  BilliardsPlacementZone,
} from '../../shared/billiards-types';
import {
  HEAD_STRING_Y,
  TABLE_HEIGHT,
  TABLE_WIDTH,
  DEFAULT_PULL_POWER,
  BALL_RADIUS,
} from '../../shared/billiards-types';
import { canPlaceBallAt } from '../../shared/billiards-layout';
import { billiardBallVisual } from '../../shared/billiard-ball-visual';
import { pullPowerFromGripPoint } from '../../shared/cue-geometry';
import { useLabAppToast } from '@/shared/composables/useLabAppToast';
import { useLabGameHint } from '@/shared/game-platform/composables/useLabGameHint';
import { buildBilliardsShotPathHintSourceRef } from '@/shared/game-platform/lab-game-hint-source-ref';
import { LAB_GAME_HINT_SKU_BILLIARDS_SHOT_PATH } from '@/shared/game-platform/lab-game-hints';
import { LabGameHintAsideControls } from '@/shared/game-platform/ui';
import {
  STAGE_VIEW_BOX,
  tablePointFromStageClientRect,
  tablePointToStagePercent,
  tableSizeToStagePercentHeight,
  tableSizeToStagePercentWidth,
} from '../../shared/table-stage-layout';
import {
  computeBilliardsShotHintPaths,
  findFirstContactObjectBall,
} from '../../shared/billiard-shot-hint-paths';
import { isRiskyFirstContactTarget } from '../../shared/billiards-aim-target-rules';
import { groupForSeat, lowestLiveBallNumber, tableIsOpen } from '../../shared/billiards-rules';
import BilliardsBallChip from './BilliardsBallChip.vue';
import BilliardsTableChrome from './BilliardsTableChrome.vue';
import BilliardsCueAim from './BilliardsCueAim.vue';
import BilliardsBallInHandStageRail from './BilliardsBallInHandStageRail.vue';
import BilliardsCueEnglishSection from './BilliardsCueEnglishSection.vue';
import BilliardsTrayBall from './BilliardsTrayBall.vue';
import BilliardsSpareCue from './BilliardsSpareCue.vue';
import BilliardsCollectedBallTray from './BilliardsCollectedBallTray.vue';
import BilliardsMatchPocketTrays from './BilliardsMatchPocketTrays.vue';
import BilliardsNineBallObjectTray from './BilliardsNineBallObjectTray.vue';
import { formatEightBallTrayProgress } from '../utils/billiards-match-tray-progress';
import { frameStatusLineForSeat } from '../../shared/billiards-turn-summary-display';
import { billiardsOpponentPresentationKey } from '../../shared/billiards-opponent-presentation-defer';
import { stampShotWithAuthoritativeCue } from '../../shared/billiards-shot-stamp';
import {
  billiardsRollPreviewMode,
  resolveFeltBallsForRender,
} from '../../shared/billiards-felt-layout';
import { useBilliardsPresentationStore } from '../stores/billiardsPresentation';
import {
  isKitchenAimHeadStringFoul,
  kitchenAimFoulTargetBall,
  shotRequiresKitchenHeadStringCross,
} from '../../shared/billiards-kitchen-shot';
import {
  isHumanBallInHandPlacement,
  resolveBilliardsEffectivePlacementZone,
} from '../../shared/billiards-rules';
import BilliardsTable3D from './BilliardsTable3D.vue';
/** TEMPORARY dev overlay — remove with the grid once the cushion points are settled. */
import BilliardsDevGrid from './BilliardsDevGrid.vue';
import { useBilliardsRollAnimation } from '../composables/useBilliardsRollAnimation';
import { useBilliardsCollectedTray } from '../composables/useBilliardsCollectedTray';
import {
  animateCuePlaceDrag,
  spareCueDragOriginTablePoint,
} from '../composables/useBilliardsCuePlaceDragAnimation';
import { BILLIARDS_MATCH_ASIDE_CHROME_KEY } from '../billiards-match-aside-chrome';
import {
  animateOpponentAimToShot,
  animateOpponentPullBack,
  opponentCuePlaceDragDurationMs,
  pauseBeforeOpponentCuePlace,
  pauseBeforeOpponentShotRelease,
} from '../composables/useBilliardsOpponentCueAnimation';
import {
  BILLIARDS_ACK_WATCHDOG_MS,
  serverShotsTakenAdvanced,
  shotAckClearsAfterStateAdvance,
} from '../../shared/billiards-shot-ack';
import { bumpBilliardsSyncDevCounter } from '../../shared/billiards-sync-dev-counters';
import { registerBilliardsRollFrameSyncConsumer } from '../../shared/billiards-roll-sync';
import { shouldDeferBilliardsOpponentPresentationUi } from '../../shared/billiards-player-turn-feed-defer';

const props = defineProps<{
  state: BilliardsMatchState;
  disabled?: boolean;
  /** Solo practice — layout edits, end practice, no turn gating. */
  practiceMode?: boolean;
  /** Seat for competitive matches — used to replay opponent shots. */
  yourSeat?: number;
  opponentDisplayName?: string;
  /** When false (vs match), english renders on the stage chrome above the felt. */
  cueEnglishAside?: boolean;
  /** Competitive match id — presentation ingest resets when this changes. */
  matchId?: string | null;
  /** App server base URL for Quarks hint purchase. */
  serverUrl?: string;
  /** Vs match — gating from `App.vue` (turn, phase, presentation). */
  showMatchCueEnglish?: boolean;
  matchCueEnglishDisabled?: boolean;
  matchCueEnglishHint?: string;
  /** Stuck human shot ack — refresh authoritative match (no wall-clock unlock). */
  onAckWatchdogRefresh?: () => void | Promise<void>;
}>();

const emit = defineEmits<{
  move: [payload: Record<string, unknown>];
  /** Vs opponent aim / roll replay — defer Sidecar banter until idle. */
  opponentPresentationBusy: [busy: boolean];
  /** Opponent replay metadata present but no animation will run (already shown, blocked, or skipped). */
  opponentPresentationAck: [];
  /** Local roll or awaiting server ack — lock english pad for this shot. */
  shotInteractionBusy: [busy: boolean];
  hintPurchased: [];
}>();

const { generateUniqueId } = useUniqueElementId();
const toast = useLabAppToast();

const playfieldRef = useTemplateRef<HTMLElement>('playfieldRef');
const feltRef = useTemplateRef<HTMLElement>('feltRef');
const dndProvider = useDnDProvider();

const aimAngleRad = ref(0);
const pullPower = ref(DEFAULT_PULL_POWER);
const englishX = defineModel<number>('englishX', { default: 0 });
const englishY = defineModel<number>('englishY', { default: 0 });

const shotPathHint = useLabGameHint({
  skuId: LAB_GAME_HINT_SKU_BILLIARDS_SHOT_PATH,
  serverUrl: computed(() => props.serverUrl ?? ''),
  practiceMode: () => props.practiceMode === true,
  buildSourceRef: () =>
    buildBilliardsShotPathHintSourceRef({
      matchId: props.matchId ?? 'solo',
      seat: props.yourSeat ?? 1,
      shotAttempt: props.state.shotsTaken + 1,
    }),
  onPurchased: () => emit('hintPurchased'),
});
const {
  showOverlay: shotPathShowOverlay,
  unlocked: shotPathUnlocked,
  purchasing: shotPathPurchasing,
  devMockEnabled: shotPathDevMockEnabled,
  sku: shotPathSku,
  mockPurchaseHint,
  consumeUnlock: consumeShotPathHint,
  purchaseHint: purchaseShotPathHint,
  lastError: shotPathPurchaseError,
} = shotPathHint;

async function onPurchaseShotPathHint(): Promise<void> {
  const ok = await purchaseShotPathHint();
  if (!ok && shotPathPurchaseError.value) {
    toast.add({
      severity: 'error',
      summary: 'Hint purchase',
      detail: shotPathPurchaseError.value,
      life: 5000,
    });
  }
}

/** Dev-only overlays — flip locally when tuning physics; hidden in product UI. */
const BILLIARDS_SHOW_DEV_TOOLS = false;

/** Dev/testing: Three.js wireframe overlay — felt, cushions, and ball sphere colliders (always on top). */
const showColliderDebug = ref(false);
/** Dev/testing: 10-unit reference grid in table coordinates, for reading positions off the table. */
const showDevGrid = ref(false);
/** Dev/testing: hide SVG rail bumpers to inspect collider debug or pocket geometry. */
const showRailBumpers = ref(true);

const { isRolling, animatedBalls, animatedPoses, playShotRoll, clearRollOverlay } =
  useBilliardsRollAnimation();
const pendingOverlaySettle = ref(false);

function settleRollOverlay(): void {
  if (isRolling.value) {
    pendingOverlaySettle.value = true;
    return;
  }
  pendingOverlaySettle.value = false;
  clearRollOverlay();
}

watch(isRolling, (rolling, wasRolling) => {
  presentationStore.setClientRollActive(rolling);
  if (!rolling && pendingOverlaySettle.value) {
    settleRollOverlay();
  }
  tryClearRollOverlay();
  if (wasRolling && !rolling && !props.practiceMode) {
    scheduleOpponentPresentationDrain();
  }
});
const {
  trayBalls: practiceTrayBalls,
  reset: resetPracticeTray,
  setTrackWidth: setPracticeTrayWidth,
  syncPocketedFromBalls: syncPracticeTrayFromBalls,
} = useBilliardsCollectedTray();
const {
  trayBalls: humanMatchTrayBalls,
  reset: resetHumanMatchTray,
  setTrackWidth: setHumanMatchTrayWidth,
  syncPocketedFromBalls: syncHumanMatchTrayFromBalls,
} = useBilliardsCollectedTray();
const {
  trayBalls: opponentMatchTrayBalls,
  reset: resetOpponentMatchTray,
  setTrackWidth: setOpponentMatchTrayWidth,
  syncPocketedFromBalls: syncOpponentMatchTrayFromBalls,
} = useBilliardsCollectedTray();

/** `shotsTaken` before the in-flight shot — overlay clears when server passes this. */
const rollOverlayBaselineShots = ref(0);
/** Block another shot until the server applies the last one (avoids stale physics snapshots). */
const awaitingShotAck = ref(false);

let ackWatchdogTimer: ReturnType<typeof setTimeout> | null = null;

function clearAckWatchdog(): void {
  if (ackWatchdogTimer !== null) {
    clearTimeout(ackWatchdogTimer);
    ackWatchdogTimer = null;
  }
}

function scheduleAckWatchdog(): void {
  clearAckWatchdog();
  ackWatchdogTimer = setTimeout(() => {
    void (async () => {
      bumpBilliardsSyncDevCounter('ackTimeout', BILLIARDS_SHOW_DEV_TOOLS);
      await props.onAckWatchdogRefresh?.();
      if (
        awaitingShotAck.value &&
        !shotAckClearsAfterStateAdvance(
          true,
          rollOverlayBaselineShots.value,
          props.state.shotsTaken,
        )
      ) {
        scheduleAckWatchdog();
      }
    })();
  }, BILLIARDS_ACK_WATCHDOG_MS);
}

function handleShotRejected(): void {
  bumpBilliardsSyncDevCounter('shotRejected', BILLIARDS_SHOW_DEV_TOOLS);
  clearAckWatchdog();
  awaitingShotAck.value = false;
  clearRollOverlay();
}

defineExpose({ handleShotRejected });

watch(awaitingShotAck, (waiting) => {
  if (waiting) {
    scheduleAckWatchdog();
  } else {
    clearAckWatchdog();
  }
});

let unregisterRollFrameTraySync: (() => void) | null = null;

onBeforeUnmount(() => {
  clearAckWatchdog();
  unregisterRollFrameTraySync?.();
});

const presentationStore = useBilliardsPresentationStore();
const {
  holdOpponentReplayFelt,
  preShotBalls,
  opponentPresentationBusy: storeOpponentPresentationBusy,
  opponentReplayBusy,
  opponentPlacementBusy,
} = storeToRefs(presentationStore);

/** Human local roll/settle — exclude opponent replay rolls (separate busy signal). */
const humanRollOverlayActive = computed(
  () =>
    Boolean(animatedBalls.value) &&
    !opponentReplayBusy.value &&
    !opponentPlacementBusy.value,
);

const shotInteractionBusy = computed(
  () => isRolling.value || awaitingShotAck.value || humanRollOverlayActive.value,
);
const opponentPlacementPreview = ref<{ x: number; y: number; legal: boolean } | null>(null);
const opponentAimAngleRad = ref(0);
const opponentPullPower = ref(DEFAULT_PULL_POWER);
const replayCueBall = ref<BilliardsBall | null>(null);

/** Authoritative match state for chrome and rules (always server). */
const displayState = computed((): BilliardsMatchState => props.state);

const awaitingHumanShotAck = awaitingShotAck;

const rollPreviewMode = computed(() =>
  billiardsRollPreviewMode({
    hasAnimatedBalls: Boolean(animatedBalls.value),
    isRolling: isRolling.value,
    awaitingHumanShotAck: awaitingHumanShotAck.value || humanRollOverlayActive.value,
  }),
);

const useRollPhysicsOverlay = computed(() => rollPreviewMode.value === 'live');

watch(
  storeOpponentPresentationBusy,
  (busy) => {
    emit('opponentPresentationBusy', busy);
  },
  { immediate: true },
);

watch(
  shotInteractionBusy,
  (busy) => {
    emit('shotInteractionBusy', busy);
  },
  { immediate: true },
);

/** Drop target = playfield box only (not the padded chrome) so spare-cue release hits the droppable. */
const { isDragOver } = makeDroppable(playfieldRef, {
  events: {
    onDrop: (event: IDragEvent) => {
      handleTableDrop(event);
    },
  },
});

const authoritativeHasCueOnTable = computed(() =>
  props.state.balls.some((b) => b.number === 0 && !b.pocketed),
);

/** Human ball-in-hand — place from spare cue / table click (not the old cue on the felt). */
const humanMustPlaceCueBall = computed(() =>
  isHumanBallInHandPlacement(props.state, props.yourSeat ?? 1),
);

/** Server may enter place_cue before opponent scratch replay finishes — hold BIH chrome until then. */
const deferHumanBallInHandChrome = computed(
  () =>
    !props.practiceMode &&
    humanMustPlaceCueBall.value &&
    (storeOpponentPresentationBusy.value ||
      opponentReplayBusy.value ||
      opponentPlacementBusy.value ||
      presentationStore.pendingOpponentShotReplay),
);

const humanBallInHandUiActive = computed(
  () => humanMustPlaceCueBall.value && !deferHumanBallInHandChrome.value,
);

const hideCueForHumanBallInHand = computed(
  () => humanMustPlaceCueBall.value && !authoritativeHasCueOnTable.value,
);

/** Server says place_cue but still lists a cue ball — hide it until placement (incl. during opponent replay). */
const hideStaleCueDuringHumanBallInHand = computed(
  () => humanMustPlaceCueBall.value && authoritativeHasCueOnTable.value,
);

/** Authoritative layout for UI chrome; use displayState so scratch/BIH chrome waits for opponent replay. */
const hasCueOnTable = computed(() => {
  if (hideCueForHumanBallInHand.value || hideStaleCueDuringHumanBallInHand.value) {
    return false;
  }
  return displayState.value.balls.some((b) => b.number === 0 && !b.pocketed);
});

const omitCueFromFelt = computed(
  () =>
    opponentPlacementBusy.value ||
    hideCueForHumanBallInHand.value ||
    hideStaleCueDuringHumanBallInHand.value ||
    (props.state.phase === 'place_cue' && !hasCueOnTable.value),
);

const renderedVisibleBalls = computed(() =>
  resolveFeltBallsForRender({
    authoritativeBalls: props.state.balls,
    previewBalls: animatedBalls.value,
    previewMode: rollPreviewMode.value,
    omitCueBall: omitCueFromFelt.value,
    opponentReplayHoldBalls: preShotBalls.value,
    holdOpponentReplayFelt: holdOpponentReplayFelt.value,
  }),
);

/** Server layout for cue aim — never the roll-overlay clone (can lag behind felt after agent breaks). */
function authoritativeCueBall(): BilliardsBall | null {
  return props.state.balls.find((b) => b.number === 0 && !b.pocketed) ?? null;
}

const cueBall = computed(() => {
  if (humanMustPlaceCueBall.value) {
    if (hideCueForHumanBallInHand.value || hideStaleCueDuringHumanBallInHand.value) {
      return null;
    }
  }
  if (props.state.phase === 'place_cue' && !authoritativeHasCueOnTable.value) {
    return null;
  }
  return authoritativeCueBall();
});

const cueAimRemountKey = computed(() => {
  const cue = authoritativeCueBall();
  if (!cue) {
    return 'no-cue';
  }
  return `${props.state.shotsTaken}:${cue.x.toFixed(1)}:${cue.y.toFixed(1)}`;
});

function defaultAimTowardFootSpot(cue: BilliardsBall): number {
  const targetX = TABLE_WIDTH * 0.72;
  const targetY = TABLE_HEIGHT * 0.5;
  return Math.atan2(targetY - cue.y, targetX - cue.x);
}

function syncHumanCueAimToAuthoritativeCue(): void {
  if (!canShoot.value || props.disabled || opponentReplayBusy.value) {
    return;
  }
  const cue = authoritativeCueBall();
  if (!cue) {
    return;
  }
  aimAngleRad.value = defaultAimTowardFootSpot(cue);
  pullPower.value = DEFAULT_PULL_POWER;
}

function isSpareCueDragActive(): boolean {
  if (dndProvider.state.value !== 'dragging' || displayState.value.phase !== 'place_cue' || hasCueOnTable.value) {
    return false;
  }
  const first = dndProvider.entities.draggingMap.values().next().value as
    | { data?: unknown | (() => unknown) }
    | undefined;
  if (!first) {
    return false;
  }
  const raw = typeof first.data === 'function' ? first.data() : first.data;
  return (raw as { role?: string } | undefined)?.role === 'spare-cue';
}

const spareCueDisabled = computed(
  () =>
    (Boolean(props.disabled) && !humanBallInHandUiActive.value) ||
    displayState.value.phase !== 'place_cue' ||
    hasCueOnTable.value ||
    !humanBallInHandUiActive.value,
);

const hasObjectBallOnTable = computed(() =>
  displayState.value.balls.some((ball) => !ball.pocketed && ball.number > 0),
);

const canStartPractice = computed(
  () =>
    displayState.value.phase === 'setup' &&
    !displayState.value.layoutLocked &&
    hasObjectBallOnTable.value,
);

const canDragBalls = computed(() => {
  if (isRolling.value) {
    return false;
  }
  if (humanBallInHandUiActive.value && displayState.value.phase === 'place_cue') {
    return true;
  }
  if (props.disabled) {
    return false;
  }
  if (displayState.value.phase === 'setup') {
    return true;
  }
  return false;
});

const canShoot = computed(
  () =>
    !humanMustPlaceCueBall.value &&
    !isRolling.value &&
    !awaitingShotAck.value &&
    !opponentReplayBusy.value &&
    !opponentPlacementBusy.value &&
    !animatedBalls.value &&
    !props.disabled &&
    Boolean(authoritativeCueBall()) &&
    props.state.phase === 'aim' &&
    props.state.layoutLocked,
);

const showOpponentCue = computed(
  () => opponentReplayBusy.value && replayCueBall.value != null && !isRolling.value,
);

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function replayOpponentCuePlace(replay: BilliardsLastCuePlaceReplay): Promise<void> {
  const from = spareCueDragOriginTablePoint(replay.placementZone);
  opponentPlacementPreview.value = { ...from, legal: true };
  try {
    await pauseBeforeOpponentCuePlace();
    await animateCuePlaceDrag(
      from,
      { x: replay.x, y: replay.y },
      (point) => {
        opponentPlacementPreview.value = { ...point, legal: true };
      },
      opponentCuePlaceDragDurationMs(),
    );
    await delayMs(160);
  } finally {
    presentationStore.endOpponentCuePlace();
    opponentPlacementPreview.value = null;
  }
}

async function replayOpponentShot(
  preShot: BilliardsMatchState,
  replay: BilliardsLastShotReplay,
): Promise<void> {
  const cue = preShot.balls.find((b) => b.number === 0 && !b.pocketed);
  if (!cue) {
    presentationStore.finishOpponentShotReplay(replay.shotsTaken);
    presentationStore.ackPresentationForState(props.state);
    emit('opponentPresentationAck');
    return;
  }
  replayCueBall.value = { ...cue };
  opponentPullPower.value = 0;
  const fromAngle = opponentAimAngleRad.value;
  const stamped = stampShotWithAuthoritativeCue(preShot, {
    angleRad: replay.angleRad,
    power: replay.power,
    englishX: replay.englishX,
    englishY: replay.englishY,
  });
  try {
    const presentationSeed = replay.angleRad + replay.power * 3.7 + replay.shotsTaken * 0.01;
    await animateOpponentAimToShot(
      (rad) => {
        opponentAimAngleRad.value = rad;
      },
      fromAngle,
      replay.angleRad,
      presentationSeed,
    );
    await animateOpponentPullBack(
      (power) => {
        opponentPullPower.value = power;
      },
      replay.power,
      presentationSeed,
    );
    await pauseBeforeOpponentShotRelease();
    replayCueBall.value = null;
    opponentPullPower.value = DEFAULT_PULL_POWER;
    presentationStore.beginOpponentShotRoll();
    const authoritativeBalls = structuredClone(toRaw(props.state.balls)) as BilliardsBall[];
    await playShotRoll(stamped.state, stamped.shot, {
      shotVarianceResolved: replay.shotVarianceResolved === true,
      settleBalls: authoritativeBalls,
    });
    clearRollOverlay();
    syncPocketTraysFromBalls(authoritativeBalls);
  } finally {
    clearRollOverlay();
    replayCueBall.value = null;
    opponentPullPower.value = DEFAULT_PULL_POWER;
    if (showMatchPocketTrays.value) {
      syncPocketTraysFromBalls(props.state.balls);
    }
  }
}

const shotPathHints = computed(() => {
  if (!shotPathShowOverlay.value || !canShoot.value || !cueBall.value || isRolling.value) {
    return null;
  }
  return computeBilliardsShotHintPaths(
    { x: cueBall.value.x, y: cueBall.value.y },
    aimAngleRad.value,
    renderedVisibleBalls.value,
  );
});

const shotPathHintCueSegments = computed(() => {
  const h = shotPathHints.value;
  if (!h) {
    return [];
  }
  if (h.cueStrokeSegments.length > 0) {
    return [h.cueStrokeSegments[0]!];
  }
  return h.cueStroke ? [h.cueStroke] : [];
});

const shotPathHintObjectSegments = computed(() => shotPathHints.value?.objectChain ?? []);

const shotPathHintObjectStrokeColor = computed(() =>
  kitchenAimHeadStringFoul.value
    ? 'var(--lab-chat-log-error)'
    : 'color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 72%, var(--lab-general-text))',
);

const showIllegalFirstContactHighlights = computed(
  () =>
    props.practiceMode === false &&
    displayState.value.rulesProfile !== 'free' &&
    canShoot.value &&
    Boolean(cueBall.value) &&
    !isRolling.value,
);

const kitchenAimHeadStringFoul = computed(() => {
  if (!showIllegalFirstContactHighlights.value || !cueBall.value) {
    return false;
  }
  return isKitchenAimHeadStringFoul(
    displayState.value,
    { x: cueBall.value.x, y: cueBall.value.y },
    aimAngleRad.value,
    renderedVisibleBalls.value,
  );
});

/** Eight-ball: ring on first illegal contact along aim. Nine-ball: all on-table balls except lowest. */
const illegalFirstContactHighlights = computed((): BilliardsBall[] => {
  if (!showIllegalFirstContactHighlights.value || !cueBall.value) {
    return [];
  }
  const rulesState = displayState.value;
  const seat = props.yourSeat ?? 1;

  if (kitchenAimHeadStringFoul.value) {
    const target = kitchenAimFoulTargetBall(
      rulesState,
      { x: cueBall.value.x, y: cueBall.value.y },
      aimAngleRad.value,
      renderedVisibleBalls.value,
    );
    if (target) {
      const ball = renderedVisibleBalls.value.find((b) => b.id === target.id);
      return ball ? [ball] : [];
    }
  }

  if (rulesState.rulesProfile === 'nine-ball') {
    const lowest = lowestLiveBallNumber(rulesState.balls);
    if (lowest == null) {
      return [];
    }
    return renderedVisibleBalls.value.filter(
      (ball) => ball.number > 0 && ball.number <= 9 && ball.number !== lowest,
    );
  }

  const first = findFirstContactObjectBall(
    { x: cueBall.value.x, y: cueBall.value.y },
    aimAngleRad.value,
    renderedVisibleBalls.value,
  );
  if (!first || !isRiskyFirstContactTarget(rulesState, seat, first.number)) {
    return [];
  }
  const ball = renderedVisibleBalls.value.find((b) => b.id === first.id);
  return ball ? [ball] : [];
});

const illegalFirstContactAriaLabel = computed(() => {
  if (kitchenAimHeadStringFoul.value) {
    return 'Kitchen foul — drive the cue past the head string before contacting this ball';
  }
  return displayState.value.rulesProfile === 'nine-ball'
    ? 'Not the object ball — contact the lowest ball on the table first'
    : 'Wrong ball first — you will lose your turn (no ball in hand)';
});

const showKitchenAimHeadStringGuide = computed(
  () =>
    !props.practiceMode &&
    !humanMustPlaceCueBall.value &&
    displayState.value.layoutLocked &&
    displayState.value.phase === 'aim' &&
    canShoot.value &&
    !isRolling.value &&
    shotRequiresKitchenHeadStringCross(displayState.value),
);

const shotPathHintStrokeColor = computed(() =>
  kitchenAimHeadStringFoul.value
    ? 'var(--lab-chat-log-error)'
  : 'var(--lab-accent-primary)',
);

const showCuePanel = computed(
  () =>
    displayState.value.layoutLocked &&
    (displayState.value.phase === 'aim' || displayState.value.phase === 'rolling'),
);

const showEndPractice = computed(
  () =>
    props.practiceMode !== false &&
    (props.state.layoutLocked || props.state.phase !== 'setup'),
);

const showEditLayout = computed(
  () =>
    props.practiceMode !== false &&
    props.state.phase === 'aim' &&
    props.state.rulesProfile === 'free' &&
    props.state.layoutLocked,
);

const showCueEnglishInTableAside = computed(
  () => showCuePanel.value && props.cueEnglishAside !== false,
);

const showPracticeCollectedTray = computed(
  () =>
    props.practiceMode !== false &&
    props.state.layoutLocked &&
    props.state.phase !== 'setup',
);

const showMatchPocketTrays = computed(
  () =>
    props.practiceMode === false &&
    displayState.value.layoutLocked &&
    displayState.value.phase !== 'setup' &&
    displayState.value.rulesProfile !== 'free',
);

const showNineBallObjectTray = computed(
  () => showMatchPocketTrays.value && displayState.value.rulesProfile === 'nine-ball',
);

const humanMatchTrayProgress = computed(() => {
  if (displayState.value.rulesProfile !== 'eight-ball') {
    return null;
  }
  const groups = displayState.value.seatGroups ?? { 1: null, 2: null };
  return formatEightBallTrayProgress(displayState.value.balls, humanSeat.value, groups);
});

const opponentMatchTrayProgress = computed(() => {
  if (displayState.value.rulesProfile !== 'eight-ball') {
    return null;
  }
  const groups = displayState.value.seatGroups ?? { 1: null, 2: null };
  return formatEightBallTrayProgress(displayState.value.balls, opponentSeat.value, groups);
});

function eightBallTrayGroupTag(seat: number): string | null {
  if (displayState.value.rulesProfile !== 'eight-ball') {
    return null;
  }
  const groups = displayState.value.seatGroups ?? { 1: null, 2: null };
  if (tableIsOpen(groups)) {
    return null;
  }
  return groupForSeat(groups, seat);
}

const humanMatchTrayGroupTag = computed(() => eightBallTrayGroupTag(humanSeat.value));
const opponentMatchTrayGroupTag = computed(() => eightBallTrayGroupTag(opponentSeat.value));

const humanSeat = computed(() => props.yourSeat ?? 1);
const opponentSeat = computed(() => (humanSeat.value === 1 ? 2 : 1));
const humanTrayLabel = computed(() => 'You');
const opponentTrayLabel = computed(
  () => props.opponentDisplayName?.trim() || 'Opponent',
);

const kitchenHeightPct = computed(() => `${(HEAD_STRING_Y / TABLE_HEIGHT) * 100}%`);
const kitchenForbiddenTopPct = kitchenHeightPct;

/**
 * Placement zone actually in force.
 *
 * `placementZone` is optional on the wire (optimistic client payloads and legacy match rows
 * omit it) and `undefined` used to read as "not kitchen" on the client while the server's
 * `canPlaceBallAt` treated it the same way — so a break-foul scratch let the cue be dropped
 * anywhere with no kitchen band drawn. Mirror the server rule (break scratch only → kitchen).
 */
const effectivePlacementZone = computed<BilliardsPlacementZone>(() =>
  resolveBilliardsEffectivePlacementZone(displayState.value),
);

/**
 * Kitchen allowed + forbidden bands only when ball in hand is **kitchen-restricted**
 * (typical break foul). Post-break scratches use full-table placement — no kitchen overlay.
 */
const showBallInHandKitchenOverlays = computed(
  () =>
    humanBallInHandUiActive.value &&
    displayState.value.phase === 'place_cue' &&
    effectivePlacementZone.value === 'kitchen',
);

const spareCueDragActive = computed(() => {
  void dndProvider.state.value;
  return isSpareCueDragActive();
});

/** Spare-cue drag or pointer over playfield drop target — full-stage cue that the felt accepts a drop. */
const showPlaceCueDropTargetChrome = computed(
  () =>
    humanBallInHandUiActive.value &&
    displayState.value.phase === 'place_cue' &&
    !hasCueOnTable.value &&
    (isDragOver || spareCueDragActive.value),
);

const placementPreview = ref<{ x: number; y: number; legal: boolean } | null>(null);

/**
 * Table coordinates of the pointer while dragging the spare cue (ball-in-hand placement).
 * DnD preview center can be wrong or cleared when the ghost is suppressed — same class of bug
 * as cue aim/power — so we track the real pointer on `window` during that drag.
 */
const lastPlaceCuePointerTablePoint = ref<{ x: number; y: number } | null>(null);

function evaluateCuePlacement(point: { x: number; y: number }): { x: number; y: number; legal: boolean } {
  const zone = effectivePlacementZone.value;
  const x = point.x;
  const y = point.y;
  if (zone === 'kitchen' && y > HEAD_STRING_Y - BALL_RADIUS) {
    return { x, y, legal: false };
  }
  const legal = canPlaceBallAt(props.state.balls, x, y, 'cue', zone);
  return { x, y, legal };
}

/**
 * Click / tap the felt to place the cue ball.
 *
 * Direct placement that does not involve the drag library. Dragging the spare cue onto the
 * table relies on the library reporting a drop on the stage host, which is the same fragile
 * mechanism that was swallowing cue power — and when it fails the ball-in-hand state simply
 * cannot be resolved. This path always works.
 */
function placeCueAtPoint(point: { x: number; y: number }): void {
  const placement = evaluateCuePlacement(point);
  if (!placement.legal) {
    const msg =
      effectivePlacementZone.value === 'kitchen'
        ? 'Place the cue ball in the kitchen — above the head string, not on top of other balls.'
        : 'That spot is blocked — choose an open area on the felt.';
    toast.add({ severity: 'warn', summary: 'Cue placement', detail: msg, life: 3200 });
    return;
  }
  clearRollOverlay();
  awaitingShotAck.value = false;
  emit('move', { type: 'cue/place', x: placement.x, y: placement.y });
}

function onPlayfieldPointerDown(event: PointerEvent): void {
  if (!humanBallInHandUiActive.value || props.state.phase !== 'place_cue' || hasCueOnTable.value) {
    return;
  }
  const el = playfieldRef.value;
  if (!el) {
    return;
  }
  const rect = el.getBoundingClientRect();
  const point = tablePointFromStageClientRect(rect, event.clientX, event.clientY, {
    clampToFelt: true,
  });
  placeCueAtPoint(point);
}

/** Vs match: fill horizontal space; practice keeps a centered cap. */
const widePlayLayout = computed(() => props.practiceMode === false);

const matchAsideChrome = inject(BILLIARDS_MATCH_ASIDE_CHROME_KEY, null);

const matchChromeInAside = computed(
  () => widePlayLayout.value && matchAsideChrome !== null,
);

const showQuarksHintPurchaseUi = computed(() => {
  const onShot =
    canShoot.value &&
    displayState.value.layoutLocked &&
    (displayState.value.phase === 'aim' || displayState.value.phase === 'rolling');
  if (!onShot) {
    return false;
  }
  if (props.practiceMode) {
    return shotPathDevMockEnabled;
  }
  return Boolean(props.serverUrl);
});

const showQuarksHintInTableAside = computed(
  () => showQuarksHintPurchaseUi.value && !matchChromeInAside.value,
);

/** Match left aside: keep dev mock visible between shots (Vite dev / env flag). */
const showQuarksHintMatchAside = computed(() => {
  if (props.practiceMode || !props.serverUrl) {
    return false;
  }
  if (shotPathDevMockEnabled) {
    return true;
  }
  return showQuarksHintPurchaseUi.value;
});

const showSidePanel = computed(
  () =>
    showCueEnglishInTableAside.value ||
    showEndPractice.value ||
    showEditLayout.value ||
    showQuarksHintInTableAside.value,
);

/** Vs match — keep rail in DOM (disabled) so the felt does not jump. */
const showStageRailSlot = computed(
  () =>
    matchChromeInAside.value &&
    displayState.value.layoutLocked &&
    displayState.value.phase !== 'setup' &&
    displayState.value.phase !== 'finished',
);

const showStageCueSpinRail = computed(() => {
  if (!showStageRailSlot.value || humanMustPlaceCueBall.value) {
    return false;
  }
  if (displayState.value.phase === 'aim' || displayState.value.phase === 'rolling') {
    return true;
  }
  return displayState.value.phase === 'place_cue' && !humanMustPlaceCueBall.value;
});

const stageCueSpinDisabled = computed(
  () =>
    Boolean(props.matchCueEnglishDisabled) ||
    Boolean(props.disabled) ||
    isRolling.value ||
    props.showMatchCueEnglish !== true,
);

const playLayoutRowClass = computed(() => {
  if (!showSidePanel.value) {
    return widePlayLayout.value ? 'w-full items-stretch' : '';
  }
  if (widePlayLayout.value) {
    return 'w-full min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-start min-[900px]:gap-3';
  }
  return 'min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-center min-[900px]:gap-4';
});

const stageColumnClass = computed(() =>
  widePlayLayout.value
    ? 'flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-visible'
    : 'flex min-h-0 w-full max-w-[48rem] flex-1 flex-col gap-3 overflow-visible',
);

/** Muted pad + border — outer table stage chrome (gray rail pad). */
const stageSurfaceChromeClass =
  'overflow-visible rounded-md border border-[color-mix(in_srgb,var(--lab-general-text-muted)_20%,var(--lab-general-bg))] bg-[color-mix(in_srgb,var(--lab-general-border)_22%,var(--lab-general-bg))]';

const stageSurfaceBorderClass =
  'rounded-md border border-[color-mix(in_srgb,var(--lab-general-text-muted)_20%,var(--lab-general-bg))]';

/** Felt ramp — accent-tinted so light presets keep pink/blue/etc. cloth instead of forced slate. */
const billiardsClothTokens = {
  '--billiards-cloth-light': 'color-mix(in srgb, var(--lab-accent-primary) 14%, var(--lab-general-bg))',
  '--billiards-cloth-mid': 'color-mix(in srgb, var(--lab-accent-primary) 28%, var(--lab-general-bg))',
  '--billiards-cloth-dark': 'color-mix(in srgb, var(--lab-accent-primary) 40%, var(--lab-general-border))',
  '--billiards-cloth-shadow': 'color-mix(in srgb, var(--lab-general-text) 32%, var(--billiards-cloth-dark))',
} as Record<string, string>;

/**
 * Tray track fill.
 *
 * Not the cloth gradient. `--billiards-cloth-light` / `-dark` are named for a *felt* ramp
 * built from the theme border and text tokens, and on dark presets those two names are
 * effectively inverted — so a `light → dark` gradient ran dark-to-bright and washed the
 * right-hand end. The tray needs a deliberately tight range instead: near the far-left
 * colour on the right, just enough difference to imply depth.
 */
const ballTrayBackground =
  'linear-gradient(90deg, color-mix(in srgb, var(--lab-general-text) 26%, var(--lab-general-bg)) 0%, color-mix(in srgb, var(--lab-general-text) 34%, var(--lab-general-bg)) 100%)';

const ballTraySurfaceStyle = {
  ...billiardsClothTokens,
  background: ballTrayBackground,
} as Record<string, string>;

const stageHostStyle = {
  '--billiards-piece-shadow-near': 'color-mix(in srgb, var(--lab-general-bg) 72%, var(--lab-general-border))',
  '--billiards-piece-shadow-far': 'color-mix(in srgb, var(--lab-general-bg) 48%, var(--lab-general-border))',
} as Record<string, string>;

const feltSurfaceStyle = {
  ...billiardsClothTokens,
  background: 'transparent',
  boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--lab-general-border) 50%, transparent)',
  '--billiards-cushion-light': 'color-mix(in srgb, var(--lab-accent-primary) 38%, var(--lab-general-border))',
  '--billiards-cushion-dark': 'color-mix(in srgb, var(--lab-accent-primary) 52%, var(--lab-general-bg))',
  '--billiards-bumper-light': 'color-mix(in srgb, var(--lab-general-border) 62%, var(--lab-general-text-muted))',
  '--billiards-bumper-mid': 'color-mix(in srgb, var(--lab-general-border) 48%, var(--lab-general-text))',
  '--billiards-bumper-dark': 'color-mix(in srgb, var(--lab-general-text) 38%, var(--lab-general-border))',
  '--billiards-bumper-nose': 'color-mix(in srgb, var(--lab-general-text) 55%, var(--lab-general-border))',
  // A pocket is a hole: it must be darker than the felt, not lighter. These were mixed
  // mostly toward `--lab-general-bg`, which is near-white on light presets — so "inner"
  // came out paler than the cloth and the pockets read as bright caps. Anchored to the
  // shadow token instead, which is inherently dark in every preset.
  '--billiards-pocket-well': 'color-mix(in srgb, var(--billiards-cloth-shadow) 78%, black 22%)',
  '--billiards-pocket-inner': 'color-mix(in srgb, var(--billiards-cloth-shadow) 88%, black 12%)',
  '--billiards-pocket-outer': 'color-mix(in srgb, var(--billiards-cloth-shadow) 62%, black 38%)',
  '--billiards-wood-base': 'color-mix(in srgb, var(--lab-general-border) 58%, var(--lab-general-bg))',
  '--billiards-wood-grain': 'color-mix(in srgb, var(--lab-general-border) 38%, var(--lab-accent-primary))',
  '--billiards-wood-grain-dark': 'color-mix(in srgb, var(--lab-general-text) 22%, var(--lab-general-border))',
  '--billiards-wood-highlight': 'color-mix(in srgb, var(--lab-general-border) 32%, var(--lab-accent-primary))',
  '--billiards-wood-shadow': 'color-mix(in srgb, var(--lab-general-bg) 45%, var(--lab-general-border))',
  '--billiards-chrome-stroke': 'color-mix(in srgb, var(--lab-general-text) 22%, var(--lab-general-border))',
} as Record<string, string>;

const groupLabel = computed(() =>
  displayState.value.rulesProfile === 'nine-ball' ? 'Nine-ball — hit lowest ball first' : null,
);

const BILLIARDS_SHOOT_HINT =
  'Hover the cue stick, then drag the aim dot or pull the butt back and release to shoot.';

type BilliardsTableStatusParts = {
  primary?: string;
  secondary?: string;
};

const tableStatusParts = computed((): BilliardsTableStatusParts | null => {
  if (displayState.value.phase === 'finished') {
    if (!props.practiceMode) {
      return null;
    }
    const primary = frameStatusLineForSeat(displayState.value, humanSeat.value);
    if (primary) {
      return { primary };
    }
  }
  switch (displayState.value.phase) {
    case 'setup':
      return {
        primary: 'Practice setup',
        secondary: 'Drag balls from the tray or table. Auto rack, then Start practice.',
      };
    case 'place_cue':
      if (!humanBallInHandUiActive.value) {
        return null;
      }
      return {
        primary: 'Ball in hand',
        secondary:
          effectivePlacementZone.value === 'kitchen'
            ? 'Kitchen only — place the cue ball above the head string (drag from BALL IN HAND or click the kitchen).'
            : 'Anywhere on the felt — drag from BALL IN HAND or click an open spot (no kitchen restriction after the break).',
      };
    case 'aim': {
      const secondary = BILLIARDS_SHOOT_HINT;
      if (displayState.value.rulesProfile === 'nine-ball' && groupLabel.value) {
        return { primary: groupLabel.value, secondary };
      }
      return { secondary };
    }
    case 'rolling':
      if (!props.practiceMode) {
        return null;
      }
      return { primary: 'Balls moving…' };
    default:
      return null;
  }
});

/** Vs match ball-in-hand on stage rail (throughout place_cue; disabled when not interactive). */
const showBallInHandStageRailVisible = computed(
  () =>
    showStageRailSlot.value &&
    humanBallInHandUiActive.value &&
    displayState.value.phase === 'place_cue',
);

watchEffect(() => {
  const chrome = matchAsideChrome;
  if (!chrome || props.practiceMode !== false) {
    if (chrome) {
      chrome.showPocketTrays = false;
      chrome.showNineBallTray = false;
      chrome.tableStatusParts = null;
      chrome.showSpareCue = false;
      chrome.showConfirmCuePlace = false;
      chrome.confirmCuePlace = null;
      chrome.showQuarksHint = false;
    }
    return;
  }

  chrome.showQuarksHint = showQuarksHintMatchAside.value;
  chrome.hintSkuLabel = shotPathSku?.label ?? 'Shot path preview';
  chrome.hintCostQuarks = shotPathSku?.defaultCostQuarks ?? 50;
  chrome.hintUnlocked = shotPathUnlocked.value;
  chrome.hintLoading = shotPathPurchasing.value;
  chrome.hintDisabled = Boolean(props.disabled) || isRolling.value;
  chrome.hintDevMockEnabled = shotPathDevMockEnabled;
  chrome.onHintPurchase = () => void onPurchaseShotPathHint();
  chrome.onHintMock = () => mockPurchaseHint();
  chrome.showPocketTrays = showMatchPocketTrays.value;
  chrome.showNineBallTray = showNineBallObjectTray.value;
  const parts = tableStatusParts.value;
  const hideAimShootHintInAside =
    showStageCueSpinRail.value && displayState.value.phase === 'aim';
  if (showBallInHandStageRailVisible.value) {
    chrome.tableStatusParts = null;
  } else if (parts) {
    chrome.tableStatusParts = {
      primary: parts.primary,
      secondary: hideAimShootHintInAside ? undefined : parts.secondary,
    };
  } else {
    chrome.tableStatusParts = null;
  }
  chrome.balls = displayState.value.balls;
  chrome.rulesProfile = displayState.value.rulesProfile;
  chrome.humanTrayBalls = humanMatchTrayBalls.value;
  chrome.opponentTrayBalls = opponentMatchTrayBalls.value;
  chrome.humanLabel = humanTrayLabel.value;
  chrome.opponentLabel = opponentTrayLabel.value;
  chrome.humanProgressLabel = humanMatchTrayProgress.value;
  chrome.opponentProgressLabel = opponentMatchTrayProgress.value;
  chrome.humanCountGroupTag = humanMatchTrayGroupTag.value;
  chrome.opponentCountGroupTag = opponentMatchTrayGroupTag.value;
  chrome.showProgressCounts = displayState.value.rulesProfile !== 'nine-ball';
  chrome.surfaceStyle = ballTraySurfaceStyle;
  chrome.borderClass = stageSurfaceBorderClass;
  chrome.measureHuman = setHumanMatchTrayWidth;
  chrome.measureOpponent = setOpponentMatchTrayWidth;
  chrome.showSpareCue =
    humanBallInHandUiActive.value &&
    displayState.value.phase === 'place_cue' &&
    !hasCueOnTable.value &&
    !showBallInHandStageRailVisible.value;
  chrome.spareCueDisabled = spareCueDisabled.value;
  chrome.showConfirmCuePlace =
    humanMustPlaceCueBall.value && displayState.value.phase === 'place_cue' && hasCueOnTable.value;
  chrome.confirmCuePlace = confirmCuePlace;
});

function tablePointFromPreview(options?: { clampToFelt?: boolean }): { x: number; y: number } | null {
  const el = playfieldRef.value;
  if (!el) {
    return null;
  }
  const pos = dndProvider.preview.position.value;
  const size = dndProvider.preview.size.value;
  if (!pos || !size?.width || !size?.height) {
    return null;
  }
  const cx = pos.x + size.width / 2;
  const cy = pos.y + size.height / 2;
  const rect = el.getBoundingClientRect();
  return tablePointFromStageClientRect(rect, cx, cy, options);
}

type DragEventWithPointer = IDragEvent & {
  pointer?: { current?: { x: number; y: number }; start?: { x: number; y: number } };
};

function pointerClientFromDragEvent(event: IDragEvent): { clientX: number; clientY: number } | null {
  const e = event as unknown as {
    clientX?: number;
    clientY?: number;
    nativeEvent?: { clientX?: number; clientY?: number };
  };
  if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
    return { clientX: e.clientX, clientY: e.clientY };
  }
  const ne = e.nativeEvent;
  if (ne && typeof ne.clientX === 'number' && typeof ne.clientY === 'number') {
    return { clientX: ne.clientX, clientY: ne.clientY };
  }
  const ptr = (event as DragEventWithPointer).pointer?.current ?? (event as DragEventWithPointer).pointer?.start;
  if (ptr && Number.isFinite(ptr.x) && Number.isFinite(ptr.y)) {
    return { clientX: ptr.x, clientY: ptr.y };
  }
  return null;
}

/** Point under pointer for felt drops — preview can be missing (spare-cue drag). */
function tablePointFromFeltDropEvent(
  event: IDragEvent,
  options?: { clampToFelt?: boolean; fallbackTablePoint?: { x: number; y: number } | null },
): { x: number; y: number } | null {
  const el = playfieldRef.value;
  if (!el) {
    return null;
  }
  const client = pointerClientFromDragEvent(event);
  const clampOpts = options?.clampToFelt != null ? { clampToFelt: options.clampToFelt } : undefined;
  if (client) {
    return tablePointFromStageClientRect(el.getBoundingClientRect(), client.clientX, client.clientY, clampOpts);
  }
  const fromPreview = tablePointFromPreview(clampOpts);
  if (fromPreview) {
    return fromPreview;
  }
  const fb = options?.fallbackTablePoint;
  if (fb && Number.isFinite(fb.x) && Number.isFinite(fb.y)) {
    return fb;
  }
  return null;
}

/**
 * Last cue pointer position in table coordinates.
 *
 * `BilliardsCueAim` reports this directly from its own pointer handling. It used to be
 * derived from `dndProvider.preview`, which broke: the cue handles clear `preview.render`
 * to suppress the drag ghost, and that also stops `preview.position` updating.
 */
const lastPointerTablePoint = ref<{ x: number; y: number } | null>(null);

function dragPayloadFromEvent(
  event: IDragEvent,
): { ballId?: string; number?: number; role?: string } | undefined {
  const raw = event.draggedItems[0]?.data;
  return (typeof raw === 'function' ? raw() : raw) as
    | { ballId?: string; number?: number; role?: string }
    | undefined;
}

function applyAimAtPoint(point: { x: number; y: number }, cue: { x: number; y: number }): void {
  aimAngleRad.value = Math.atan2(point.y - cue.y, point.x - cue.x);
}

function applyPowerAtPoint(point: { x: number; y: number }, cue: { x: number; y: number }): void {
  pullPower.value = pullPowerFromGripPoint(point, cue, aimAngleRad.value);
}

function cueAimDragRole(): 'aim-target' | 'power-pull' | null {
  if (dndProvider.state.value !== 'dragging' || props.state.phase !== 'aim' || !canShoot.value || isRolling.value) {
    return null;
  }
  const first = dndProvider.entities.draggingMap.values().next().value as
    | { data?: unknown | (() => unknown) }
    | undefined;
  if (!first) {
    return null;
  }
  const raw = typeof first.data === 'function' ? first.data() : first.data;
  const role = (raw as { role?: string } | undefined)?.role;
  if (role === 'aim-target' || role === 'power-pull') {
    return role;
  }
  return null;
}

watchEffect((onCleanup) => {
  void dndProvider.preview.position.value;
  void dndProvider.preview.size.value;
  void dndProvider.state.value;

  if (!isSpareCueDragActive()) {
    placementPreview.value = null;
    lastPlaceCuePointerTablePoint.value = null;
    return;
  }

  function onPlaceCuePointerMove(ev: PointerEvent): void {
    const el = playfieldRef.value;
    if (!el) {
      return;
    }
    const p = tablePointFromStageClientRect(el.getBoundingClientRect(), ev.clientX, ev.clientY, {
      clampToFelt: true,
    });
    lastPlaceCuePointerTablePoint.value = p;
    placementPreview.value = evaluateCuePlacement(p);
  }

  window.addEventListener('pointermove', onPlaceCuePointerMove);

  const point = lastPlaceCuePointerTablePoint.value ?? tablePointFromPreview({ clampToFelt: true });
  if (!point) {
    placementPreview.value = null;
  } else {
    placementPreview.value = evaluateCuePlacement(point);
  }

  onCleanup(() => {
    window.removeEventListener('pointermove', onPlaceCuePointerMove);
  });
});

watchEffect(() => {
  void dndProvider.preview.position.value;
  void dndProvider.preview.size.value;
  void dndProvider.state.value;

  const role = cueAimDragRole();
  if (!role) {
    return;
  }
  // Prefer the tracked pointer; the DnD preview is cleared by the cue handles.
  const point = lastPointerTablePoint.value ?? tablePointFromPreview();
  const cue = cueBall.value;
  if (!point || !cue) {
    return;
  }
  if (role === 'aim-target') {
    applyAimAtPoint(point, cue);
  } else {
    applyPowerAtPoint(point, cue);
  }
});

/**
 * Cue pointer input.
 *
 * `BilliardsCueAim` now handles its own pointer events (the drag library was swallowing
 * them), and reports the position in table coordinates. The aim-vs-power decision comes
 * from which handle started the drag, so it is received alongside the point.
 */
const activeCueDragMode = ref<'aim' | 'power' | null>(null);

function onCuePointerPosition(point: { x: number; y: number }): void {
  const cue = cueBall.value;
  if (!cue) {
    return;
  }
  lastPointerTablePoint.value = point;
  if (activeCueDragMode.value === 'aim') {
    applyAimAtPoint(point, cue);
  } else if (activeCueDragMode.value === 'power') {
    applyPowerAtPoint(point, cue);
  }
}

function onCueDragStart(mode: 'aim' | 'power'): void {
  activeCueDragMode.value = mode;
}

function onCueDragEnd(): void {
  activeCueDragMode.value = null;
}

async function onCuePowerRelease(): Promise<void> {
  const cue = cueBall.value;
  if (!cue || props.state.phase !== 'aim' || !canShoot.value || isRolling.value) {
    return;
  }
  // Use the last tracked pointer position; fall back to the preview only if the pointer
  // never reported (e.g. a keyboard-driven release).
  const point = lastPointerTablePoint.value ?? tablePointFromPreview();
  if (point) {
    applyPowerAtPoint(point, cue);
  }
  if (pullPower.value <= 0) {
    pullPower.value = DEFAULT_PULL_POWER;
    return;
  }
  await shoot();
}

function handleTableDrop(event: IDragEvent): void {
  const data = dragPayloadFromEvent(event);
  if (!data) {
    return;
  }

  const cue = cueBall.value ?? props.state.balls.find((b) => b.number === 0);

  if (props.state.phase === 'aim' && cue && data.role === 'aim-target') {
    const point = tablePointFromPreview();
    if (point) {
      applyAimAtPoint(point, cue);
    }
    return;
  }

  if (props.state.phase === 'aim' && cue && data.role === 'power-pull') {
    const point = tablePointFromPreview();
    if (point) {
      applyPowerAtPoint(point, cue);
    }
    return;
  }

  const point = tablePointFromFeltDropEvent(event, {
    clampToFelt: true,
    fallbackTablePoint:
      props.state.phase === 'place_cue' && data.ballId === 'cue'
        ? lastPlaceCuePointerTablePoint.value
        : null,
  });
  if (!point || !data.ballId) {
    return;
  }

  if (props.state.phase === 'place_cue' && data.ballId === 'cue') {
    const placement = evaluateCuePlacement(point);
    if (!placement.legal) {
      const msg =
        effectivePlacementZone.value === 'kitchen'
          ? 'Place the cue ball in the kitchen — above the head string, not on top of other balls.'
          : 'That spot is blocked — choose an open area on the felt.';
      toast.add({ severity: 'warn', summary: 'Cue placement', detail: msg, life: 3200 });
      return;
    }
    lastPlaceCuePointerTablePoint.value = null;
    clearRollOverlay();
    awaitingShotAck.value = false;
    emit('move', { type: 'cue/place', x: placement.x, y: placement.y });
    return;
  }

  if (props.state.phase === 'setup') {
    emit('move', {
      type: 'layout/placeBall',
      ballId: data.ballId,
      number: data.number ?? 0,
      x: point.x,
      y: point.y,
    });
  }
}

function shouldEmitOpponentPresentationAck(state: BilliardsMatchState): boolean {
  if (props.practiceMode) {
    return false;
  }
  const seat = props.yourSeat ?? 1;
  if (!billiardsOpponentPresentationKey(state, seat)) {
    return false;
  }
  if (opponentReplayBusy.value || opponentPlacementBusy.value || isRolling.value) {
    return false;
  }
  return true;
}

function tryClearRollOverlay(): void {
  const serverAcked = serverShotsTakenAdvanced(
    rollOverlayBaselineShots.value,
    props.state.shotsTaken,
  );
  if (!serverAcked) {
    return;
  }
  if (isRolling.value) {
    pendingOverlaySettle.value = true;
    return;
  }
  if (!animatedBalls.value && !awaitingShotAck.value) {
    return;
  }
  clearRollOverlay();
  awaitingShotAck.value = false;
  pendingOverlaySettle.value = false;
}

watch(
  () => props.state.shotsTaken,
  () => {
    tryClearRollOverlay();
  },
);

let opponentPresentationPipelineBusy = false;
let opponentPresentationDrainQueued = false;

function scheduleOpponentPresentationDrain(): void {
  if (opponentPresentationDrainQueued || props.practiceMode) {
    return;
  }
  opponentPresentationDrainQueued = true;
  queueMicrotask(() => {
    opponentPresentationDrainQueued = false;
    void drainOpponentPresentationQueue();
  });
}

async function ingestAndDrainPresentation(): Promise<void> {
  if (props.practiceMode) {
    return;
  }
  const rawNext = structuredClone(toRaw(props.state)) as BilliardsMatchState;
  const ingestResult = presentationStore.ingestAuthoritative({
    matchId: props.matchId ?? null,
    yourSeat: props.yourSeat ?? 1,
    practiceMode: false,
    state: rawNext,
  });
  if (ingestResult === 'deferred') {
    return;
  }
  await drainOpponentPresentationQueue();
}

async function drainOpponentPresentationQueue(): Promise<void> {
  if (props.practiceMode || opponentPresentationPipelineBusy) {
    return;
  }
  if (!presentationStore.pendingOpponentPresentation) {
    if (presentationStore.pendingAuthoritative) {
      const flushed = presentationStore.flushPendingAuthoritative();
      if (flushed === 'applied') {
        await drainOpponentPresentationQueue();
      }
    }
    return;
  }
  if (
    presentationStore.opponentShotPhase === 'queued' ||
    presentationStore.opponentShotPhase === 'idle'
  ) {
    const authoritative = presentationStore.authoritative ?? (structuredClone(toRaw(props.state)) as BilliardsMatchState);
    await runOpponentPresentationForState(authoritative);
  }
}

async function runOpponentPresentationForState(rawNext: BilliardsMatchState): Promise<void> {
  if (props.practiceMode) {
    return;
  }
  if (opponentPresentationPipelineBusy) {
    return;
  }
  opponentPresentationPipelineBusy = true;
  presentationStore.setPresentationExecutorBusy(true);
  try {
    presentationStore.clearOpponentShotQueueIfStale(rawNext);

    const shotPlan = presentationStore.planOpponentShotReplay(rawNext, isRolling.value);
    let didReplayShot = false;
    if (shotPlan.run && shotPlan.preShot && shotPlan.replay) {
      didReplayShot = true;
      const replayShotsTaken = shotPlan.replay.shotsTaken;
      presentationStore.beginOpponentShotReplay(replayShotsTaken);
      try {
        await replayOpponentShot(shotPlan.preShot, shotPlan.replay);
        presentationStore.finishOpponentShotReplay(replayShotsTaken);
      } catch {
        /** Always mark consumed so agent/human turns are not blocked after a failed replay. */
        presentationStore.finishOpponentShotReplay(replayShotsTaken);
      }
    } else if (
      !shotPlan.run &&
      !isRolling.value &&
      presentationStore.pendingOpponentShotReplay &&
      !shotPlan.preShot
    ) {
      presentationStore.endOpponentShotReplay();
      presentationStore.ackPresentationForState(rawNext);
      emit('opponentPresentationAck');
    }

    const placeReplay = rawNext.lastCuePlaceReplay;
    let didReplayPlace = false;
    if (presentationStore.shouldReplayOpponentCuePlace(rawNext) && placeReplay) {
      didReplayPlace = true;
      presentationStore.beginOpponentCuePlace(placeReplay.historyIndex);
      await replayOpponentCuePlace(placeReplay);
    }

    if (!presentationStore.pendingOpponentPresentation || didReplayShot || didReplayPlace) {
      presentationStore.commitBaseline(rawNext);
    }

    if (didReplayShot || didReplayPlace) {
      presentationStore.ackPresentationForState(rawNext);
      emit('opponentPresentationAck');
    } else if (shouldEmitOpponentPresentationAck(rawNext)) {
      presentationStore.ackPresentationForState(rawNext);
      emit('opponentPresentationAck');
    }
  } finally {
    opponentPresentationPipelineBusy = false;
    presentationStore.setPresentationExecutorBusy(false);
    const flushed = presentationStore.flushPendingAuthoritative();
    if (flushed === 'applied') {
      await drainOpponentPresentationQueue();
    } else if (presentationStore.pendingOpponentPresentation) {
      scheduleOpponentPresentationDrain();
    }
  }
}

watch(
  () => [props.matchId, props.yourSeat, props.practiceMode, props.state] as const,
  () => {
    const raw = structuredClone(toRaw(props.state)) as BilliardsMatchState;
    if (props.practiceMode) {
      presentationStore.ingestAuthoritative({
        matchId: props.matchId ?? null,
        yourSeat: props.yourSeat ?? 1,
        practiceMode: true,
        state: raw,
      });
      return;
    }
    void ingestAndDrainPresentation();
  },
  { deep: true, immediate: true },
);

watch(
  () => props.state.phase,
  (phase, prev) => {
    if (prev === 'place_cue' && phase !== 'place_cue') {
      lastPlaceCuePointerTablePoint.value = null;
    }
    if (phase === 'place_cue' && !opponentReplayBusy.value) {
      settleRollOverlay();
      awaitingShotAck.value = false;
    }
  },
);

watch(hasCueOnTable, (hasCue) => {
  if (props.state.phase === 'place_cue' && !hasCue) {
    if (deferHumanBallInHandChrome.value) {
      return;
    }
    settleRollOverlay();
    awaitingShotAck.value = false;
  }
});

watch(
  hideCueForHumanBallInHand,
  (hide) => {
    if (!hide) {
      return;
    }
    if (deferHumanBallInHandChrome.value) {
      return;
    }
    settleRollOverlay();
    awaitingShotAck.value = false;
  },
  { flush: 'post' },
);

function snapshotStateForRoll(): BilliardsMatchState {
  const raw = toRaw(props.state);
  return structuredClone(raw) as BilliardsMatchState;
}

async function shoot(): Promise<void> {
  if (!canShoot.value || !cueBall.value) {
    return;
  }
  if (pullPower.value <= 0) {
    return;
  }
  if (
    !props.practiceMode &&
    isKitchenAimHeadStringFoul(
      displayState.value,
      { x: cueBall.value.x, y: cueBall.value.y },
      aimAngleRad.value,
      renderedVisibleBalls.value,
    )
  ) {
    toast.add({
      severity: 'warn',
      summary: 'Kitchen shot',
      detail: 'Cross the head string before first contact — otherwise it is ball in hand.',
      life: 3600,
    });
  }
  consumeShotPathHint();
  const preShotState = snapshotStateForRoll();
  const stamped = stampShotWithAuthoritativeCue(preShotState, {
    angleRad: aimAngleRad.value,
    power: pullPower.value,
    englishX: englishX.value,
    englishY: englishY.value,
  });
  const shotPayload = stamped.shot;
  rollOverlayBaselineShots.value = props.state.shotsTaken;
  awaitingShotAck.value = true;
  try {
    emit('move', {
      type: 'shot',
      ...shotPayload,
    });
    await playShotRoll(stamped.state, shotPayload);
    tryClearRollOverlay();
    if (!animatedBalls.value) {
      awaitingShotAck.value = false;
      return;
    }
  } catch {
    awaitingShotAck.value = false;
    clearRollOverlay();
  } finally {
    pullPower.value = DEFAULT_PULL_POWER;
  }
}

function confirmCuePlace(): void {
  const cue = cueBall.value;
  if (!cue || props.state.phase !== 'place_cue') {
    return;
  }
  clearRollOverlay();
  awaitingShotAck.value = false;
  emit('move', { type: 'cue/place', x: cue.x, y: cue.y });
}

function addBallFromTray(number: number): void {
  emit('move', { type: 'layout/addBall', number });
}

/** Fresh practice / match — cue aim refs are not in server state; reset when layout is open again. */
function resetCueUi(): void {
  aimAngleRad.value = 0;
  pullPower.value = DEFAULT_PULL_POWER;
  englishX.value = 0;
  englishY.value = 0;
  lastPointerTablePoint.value = null;
  lastPlaceCuePointerTablePoint.value = null;
  activeCueDragMode.value = null;
  rollOverlayBaselineShots.value = props.state.shotsTaken;
  awaitingShotAck.value = false;
  clearRollOverlay();
  presentationStore.endOpponentCuePlace();
  opponentPlacementPreview.value = null;
}

watch(
  () => props.state.phase,
  (phase, prev) => {
    if (phase === 'aim' || phase === 'place_cue') {
      tryClearRollOverlay();
    }
    if (phase === 'aim') {
      pullPower.value = DEFAULT_PULL_POWER;
      englishX.value = 0;
      englishY.value = 0;
      if (prev === 'place_cue') {
        syncHumanCueAimToAuthoritativeCue();
      }
    }
    if (phase === 'setup') {
      resetPracticeTray();
      resetHumanMatchTray();
      resetOpponentMatchTray();
      resetCueUi();
    }
  },
  { immediate: true },
);

watch(cueAimRemountKey, (key, prev) => {
  if (key === 'no-cue' || key === prev) {
    return;
  }
  syncHumanCueAimToAuthoritativeCue();
});

watch(opponentReplayBusy, (busy, wasBusy) => {
  if (busy || !wasBusy) {
    return;
  }
  syncHumanCueAimToAuthoritativeCue();
});

watch(
  () => props.state.layoutLocked,
  (locked) => {
    if (!locked) {
      resetPracticeTray();
      resetHumanMatchTray();
      resetOpponentMatchTray();
    }
  },
);

function matchTrayContext(): {
  rulesProfile: BilliardsMatchState['rulesProfile'];
  phase: string;
  winnerSeat: number | null;
} {
  return {
    rulesProfile: displayState.value.rulesProfile,
    phase: displayState.value.phase,
    winnerSeat: displayState.value.winnerSeat ?? null,
  };
}

function matchTraySyncOptions(seat: number): {
  traySeat: number;
  matchTrayContext: ReturnType<typeof matchTrayContext>;
  assignedGroup?: BilliardsAssignedGroup;
  pocketedBySeat?: number;
} {
  const base = { traySeat: seat, matchTrayContext: matchTrayContext() };
  if (displayState.value.rulesProfile === 'eight-ball') {
    const groups = displayState.value.seatGroups ?? { 1: null, 2: null };
    if (!tableIsOpen(groups)) {
      const assigned = groupForSeat(groups, seat);
      if (assigned) {
        return { ...base, assignedGroup: assigned };
      }
    }
    /** Open table: route pockets by solids/stripes so wrong-group shots land in the right trough. */
    const openTrayGroup: BilliardsAssignedGroup = seat === humanSeat.value ? 'solids' : 'stripes';
    return { ...base, assignedGroup: openTrayGroup };
  }
  return { ...base, pocketedBySeat: seat };
}

function impliedTrayPocketSeat(): number | undefined {
  if (opponentReplayBusy.value) {
    return opponentSeat.value;
  }
  if (isRolling.value || awaitingShotAck.value) {
    return humanSeat.value;
  }
  return undefined;
}

function ballsForMatchTraySync(): BilliardsBall[] | null | undefined {
  const animated = animatedBalls.value;
  if (animated) {
    const animSig = pocketedObjectBallSignature(animated);
    const propSig = pocketedObjectBallSignature(props.state.balls);
    if (
      isRolling.value ||
      awaitingShotAck.value ||
      opponentReplayBusy.value ||
      animSig !== propSig
    ) {
      return animated;
    }
  }
  const propPocketSig = pocketedObjectBallSignature(props.state.balls);
  const prePocketSig = preShotBalls.value
    ? pocketedObjectBallSignature(preShotBalls.value)
    : '';
  /** Felt may stay on pre-shot while pockets already advanced on the server — trays follow server pockets. */
  if (
    holdOpponentReplayFelt.value &&
    preShotBalls.value &&
    propPocketSig !== prePocketSig
  ) {
    return props.state.balls;
  }
  if (holdOpponentReplayFelt.value && preShotBalls.value) {
    return preShotBalls.value;
  }
  return props.state.balls;
}

function syncPocketTraysFromBalls(balls: BilliardsBall[] | null | undefined): void {
  if (!balls) {
    return;
  }
  const impliedPocketSeat = impliedTrayPocketSeat();
  if (showMatchPocketTrays.value) {
    syncHumanMatchTrayFromBalls(balls, {
      ...matchTraySyncOptions(humanSeat.value),
      impliedPocketSeat,
    });
    syncOpponentMatchTrayFromBalls(balls, {
      ...matchTraySyncOptions(opponentSeat.value),
      impliedPocketSeat,
    });
    return;
  }
  if (showPracticeCollectedTray.value) {
    syncPracticeTrayFromBalls(balls);
  }
}

function pocketedObjectBallSignature(balls: BilliardsMatchState['balls'] | null | undefined): string {
  if (!balls) {
    return '';
  }
  return balls
    .filter((b) => b.pocketed && b.number > 0)
    .map((b) => b.id)
    .sort()
    .join('|');
}

function deferOpponentMatchTraySync(): boolean {
  if (props.practiceMode) {
    return false;
  }
  return shouldDeferBilliardsOpponentPresentationUi({
    practiceMode: false,
    yourSeat: props.yourSeat ?? 1,
    state: props.state,
    lastConsumedShotReplay: presentationStore.lastConsumedShotReplay,
    lastConsumedCuePlaceIndex: presentationStore.lastConsumedCuePlaceIndex,
    opponentShotPhase: presentationStore.opponentShotPhase,
    opponentPlacePhase: presentationStore.opponentPlacePhase,
    presentationExecutorBusy: presentationStore.presentationExecutorBusy,
  });
}

/** Vs match: server state when idle; local roll physics while you or opponent shoot (tray by solids/stripes). */
function syncMatchPocketTraysIfIdle(): void {
  if (!showMatchPocketTrays.value) {
    return;
  }
  if (deferOpponentMatchTraySync()) {
    return;
  }
  const previewBusy =
    isRolling.value || awaitingShotAck.value || opponentReplayBusy.value;
  const previewPockets = pocketedObjectBallSignature(animatedBalls.value);
  /** Opponent aim/pull only — keep trays at pre-shot until roll publishes pockets (per-frame sync handles roll). */
  if (opponentReplayBusy.value && !previewBusy && !previewPockets) {
    return;
  }
  syncPocketTraysFromBalls(ballsForMatchTraySync());
}

unregisterRollFrameTraySync = registerBilliardsRollFrameSyncConsumer((balls) => {
  if (!showMatchPocketTrays.value) {
    return;
  }
  if (deferOpponentMatchTraySync() && !isRolling.value && !opponentReplayBusy.value) {
    return;
  }
  if (!isRolling.value && !opponentReplayBusy.value && !awaitingShotAck.value) {
    return;
  }
  syncPocketTraysFromBalls(balls);
});

function syncPracticeTrayFromDisplay(): void {
  if (!showPracticeCollectedTray.value) {
    return;
  }
  syncPocketTraysFromBalls(animatedBalls.value ?? props.state.balls);
}

watch(
  () =>
    [
      pocketedObjectBallSignature(props.state.balls),
      pocketedObjectBallSignature(animatedBalls.value),
      isRolling.value,
      awaitingShotAck.value,
      opponentReplayBusy.value,
      showMatchPocketTrays.value,
      displayState.value.seatGroups,
    ] as const,
  () => {
    syncMatchPocketTraysIfIdle();
  },
  { immediate: true },
);

watch(
  () => [pocketedObjectBallSignature(animatedBalls.value), showPracticeCollectedTray.value] as const,
  () => {
    syncPracticeTrayFromDisplay();
  },
  { immediate: true },
);
</script>

<template>
  <!-- Stage max width: BILLIARDS_STAGE_OUTER_MAX_REM (48rem) in billiards-table-layout.ts -->
  <div
    class="billiards-table-root flex min-h-0 flex-1 w-full max-w-full flex-col gap-2 box-border"
    :class="displayState.phase === 'setup' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-visible'"
  >
    <div
      v-if="tableStatusParts && !matchChromeInAside"
      class="billiards-table-status m-0 shrink-0 flex flex-col gap-0.5 text-sm"
    >
      <p
        v-if="tableStatusParts.primary"
        class="m-0 text-lab-general-text font-medium"
      >
        {{ tableStatusParts.primary }}
      </p>
      <p
        v-if="tableStatusParts.secondary"
        class="billiards-table-status__hint m-0 leading-snug"
      >
        {{ tableStatusParts.secondary }}
      </p>
    </div>
    <!-- Must stay `overflow-visible`: the cue shaft is drawn from the cue ball outwards and
         legitimately extends past the table. The stage only pads 50px, the cue reaches
         CUE_VISUAL_LENGTH_PX, so any clipping ancestor truncates it. This box is wider than
         the stage column (it also spans the sidebar), which is why horizontal overflow used
         to survive while the top was cut off. -->
    <div
      class="billiards-table-play flex min-h-0 w-full flex-1 flex-col gap-3 overflow-visible"
      :class="[
        playLayoutRowClass,
        widePlayLayout ? 'items-stretch' : 'items-center',
      ]"
    >
      <div class="billiards-table-stage-column" :class="stageColumnClass">
        <div
          class="flex w-full flex-col gap-3"
          :class="
            widePlayLayout
              ? matchChromeInAside
                ? 'billiards-table-stage-stack w-full min-w-0 max-w-full'
                : 'billiards-table-stage-stack ml-auto max-w-full w-fit min-w-0'
              : 'min-w-0'
          "
        >
        <BilliardsNineBallObjectTray
          v-if="showNineBallObjectTray && !matchChromeInAside"
          :balls="displayState.balls"
          :surface-style="ballTraySurfaceStyle"
          :border-class="stageSurfaceBorderClass"
        />
        <BilliardsMatchPocketTrays
          v-if="showMatchPocketTrays && !matchChromeInAside"
          :human-tray-balls="humanMatchTrayBalls"
          :opponent-tray-balls="opponentMatchTrayBalls"
          :human-label="humanTrayLabel"
          :opponent-label="opponentTrayLabel"
          :rules-profile="displayState.rulesProfile"
          :human-progress-label="humanMatchTrayProgress"
          :opponent-progress-label="opponentMatchTrayProgress"
          :human-count-group-tag="humanMatchTrayGroupTag"
          :opponent-count-group-tag="opponentMatchTrayGroupTag"
          :show-progress-counts="displayState.rulesProfile !== 'nine-ball'"
          :surface-style="ballTraySurfaceStyle"
          :border-class="stageSurfaceBorderClass"
          @measure-human="setHumanMatchTrayWidth"
          @measure-opponent="setOpponentMatchTrayWidth"
        />
        <div
          :class="[
            stageSurfaceChromeClass,
            'billiards-table-stage-host relative box-border flex min-h-0 w-full touch-none flex-col justify-center overflow-visible',
            widePlayLayout ? 'pt-[10px] px-[50px] pb-[50px]' : 'p-[50px]',
            showPlaceCueDropTargetChrome
              ? 'ring-2 ring-dashed ring-[var(--lab-button-border-hover)] ring-offset-2 ring-offset-[color-mix(in_srgb,var(--lab-general-border)_22%,var(--lab-general-bg))]'
              : '',
          ]"
          :style="stageHostStyle"
          :id="generateUniqueId('billiards-table')"
        >
          <div
            class="flex min-h-0 w-full min-w-0 flex-col"
            :class="
              widePlayLayout
                ? 'billiards-stage-play-stack ml-auto mr-0 max-w-full gap-5'
                : 'items-center gap-3'
            "
          >
          <div
            v-show="showStageRailSlot"
            class="billiards-stage-rail-slot billiards-stage-play-stack__rail shrink-0"
          >
            <BilliardsBallInHandStageRail
              v-show="showBallInHandStageRailVisible"
              :disabled="spareCueDisabled"
            />
            <BilliardsCueEnglishSection
              v-show="showStageCueSpinRail"
              compact
              layout="stage-pad-only"
              v-model:english-x="englishX"
              v-model:english-y="englishY"
              :disabled="stageCueSpinDisabled"
              :disabled-hint="stageCueSpinDisabled ? matchCueEnglishHint : ''"
            />
          </div>
          <div
            ref="playfieldRef"
            :class="[
              'billiards-table-playfield relative z-[1] max-h-full w-full max-w-full aspect-[1000/500] overflow-visible rounded-sm',
              widePlayLayout ? '' : 'mx-auto',
              showPlaceCueDropTargetChrome
                ? 'outline outline-2 outline-dashed outline-offset-1 outline-[var(--lab-accent-primary)]'
                : '',
            ]"
          >
            <div
              ref="feltRef"
              class="absolute inset-0 overflow-visible [&_.billiards-table-chrome]:overflow-visible"
              :class="{
                'billiards-felt--placing':
                  humanBallInHandUiActive && displayState.phase === 'place_cue' && !hasCueOnTable,
              }"
              :style="feltSurfaceStyle"
              @pointerdown="onPlayfieldPointerDown"
            >
              <BilliardsTable3D
                :balls="renderedVisibleBalls"
                :poses="useRollPhysicsOverlay ? animatedPoses : null"
                :is-rolling="isRolling"
                :theme-host="feltRef"
                :show-collider-debug="showColliderDebug"
                :pointer-events-none="humanBallInHandUiActive && displayState.phase === 'place_cue' && !hasCueOnTable"
              />
              <BilliardsCueAim
                v-if="!isRolling && ((canShoot && cueBall) || showOpponentCue)"
                :key="showOpponentCue ? 'opponent-replay' : cueAimRemountKey"
                :cue-ball="(showOpponentCue ? replayCueBall : cueBall)!"
                :angle-rad="showOpponentCue ? opponentAimAngleRad : aimAngleRad"
                :pull-power="showOpponentCue ? opponentPullPower : pullPower"
                :disabled="disabled || showOpponentCue"
                :force-visible="showOpponentCue"
                @power-release="onCuePowerRelease"
                @pointer-position="onCuePointerPosition"
                @drag-start="onCueDragStart"
                @drag-end="onCueDragEnd"
              />
              <svg
                v-if="shotPathHints"
                class="pointer-events-none absolute inset-0 z-[6] h-full w-full overflow-visible"
                :viewBox="STAGE_VIEW_BOX"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
                :id="generateUniqueId('billiards-shot-hint-svg')"
              >
                <line
                  v-for="(seg, idx) in shotPathHintCueSegments"
                  :key="`billiards-hint-cue-${idx}`"
                  :x1="seg.x1"
                  :y1="seg.y1"
                  :x2="seg.x2"
                  :y2="seg.y2"
                  :stroke="shotPathHintStrokeColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  :opacity="kitchenAimHeadStringFoul ? 1 : 0.92"
                />
                <line
                  v-for="(seg, idx) in shotPathHintObjectSegments"
                  :key="`billiards-hint-obj-${idx}`"
                  :x1="seg.x1"
                  :y1="seg.y1"
                  :x2="seg.x2"
                  :y2="seg.y2"
                  :stroke="shotPathHintObjectStrokeColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-dasharray="8 5"
                  :opacity="kitchenAimHeadStringFoul ? 0.95 : 0.88"
                />
              </svg>
              <div
                v-if="showKitchenAimHeadStringGuide"
                class="pointer-events-none absolute left-0 z-[6] w-full border-b-2 border-dashed border-lab-chat-log-error"
                :style="{ top: kitchenHeightPct }"
                role="img"
                aria-label="Head string — cue must cross this line before first ball contact"
              >
                <div
                  class="pointer-events-none absolute bottom-1 left-0 right-0 flex justify-center px-2"
                >
                  <span
                    class="max-w-full text-center text-[0.65rem] font-medium uppercase tracking-wide text-lab-chat-log-error"
                  >
                    Head string — cross before contact
                  </span>
                </div>
              </div>
              <div
                v-for="illegalBall in illegalFirstContactHighlights"
                :key="`illegal-first-${illegalBall.id}`"
                class="billiards-illegal-first-contact-ring pointer-events-none absolute z-[7] -translate-x-1/2 -translate-y-1/2 rounded-full"
                :class="{ 'billiards-illegal-first-contact-ring--kitchen': kitchenAimHeadStringFoul }"
                :style="{
                  ...tablePointToStagePercent(illegalBall),
                  width: tableSizeToStagePercentWidth(BALL_RADIUS * 2.15),
                  height: tableSizeToStagePercentHeight(BALL_RADIUS * 2.15),
                }"
                role="img"
                :aria-label="illegalFirstContactAriaLabel"
              />
              <BilliardsTableChrome frame-only :show-rail-bumpers="showRailBumpers" />
              <BilliardsDevGrid v-if="BILLIARDS_SHOW_DEV_TOOLS && showDevGrid" :step="10" />
              <div
                v-if="showBallInHandKitchenOverlays"
                class="pointer-events-none absolute left-0 top-0 z-[1] w-full border-b border-dashed border-lab-general-border bg-[color-mix(in_srgb,var(--lab-accent-primary)_14%,transparent)]"
                :style="{ height: kitchenHeightPct }"
                aria-hidden="true"
              >
                <div
                  class="pointer-events-none absolute bottom-1 left-0 right-0 flex justify-center px-2"
                >
                  <span
                    class="max-w-full text-center text-[0.65rem] font-medium uppercase tracking-wide text-lab-general-text-muted"
                  >
                    Kitchen — place cue above this line
                  </span>
                </div>
              </div>
              <div
                v-if="showBallInHandKitchenOverlays"
                class="pointer-events-none absolute left-0 z-[2] w-full border-t border-dashed border-lab-general-border"
                :class="
                  !placementPreview || placementPreview.legal
                    ? 'bg-[color-mix(in_srgb,var(--lab-general-text-muted)_6%,transparent)]'
                    : 'bg-[color-mix(in_srgb,var(--lab-chat-log-error)_16%,transparent)]'
                "
                :style="{ top: kitchenForbiddenTopPct, height: `calc(100% - ${kitchenForbiddenTopPct})` }"
                aria-hidden="true"
              />
              <div
                v-if="opponentPlacementPreview"
                class="billiards-placement-ghost pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color-mix(in_srgb,var(--lab-accent-primary)_70%,var(--lab-general-border))]"
                :style="{
                  ...tablePointToStagePercent(opponentPlacementPreview),
                  width: tableSizeToStagePercentWidth(BALL_RADIUS * 2),
                  height: tableSizeToStagePercentHeight(BALL_RADIUS * 2),
                  opacity: 0.95,
                  boxShadow: '0 0 0 2px color-mix(in srgb, var(--lab-general-bg) 55%, transparent)',
                }"
                aria-hidden="true"
              >
                <span
                  class="absolute inset-0 rounded-full"
                  :style="{ background: billiardBallVisual(0).background }"
                />
              </div>
              <div
                v-if="humanMustPlaceCueBall && placementPreview && displayState.phase === 'place_cue'"
                class="billiards-placement-ghost pointer-events-none absolute z-[4] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                :class="
                  placementPreview.legal
                    ? 'border-[color-mix(in_srgb,var(--lab-accent-primary)_70%,var(--lab-general-border))]'
                    : 'border-[color-mix(in_srgb,var(--lab-chat-log-error)_65%,var(--lab-general-border))]'
                "
                :style="{
                  ...tablePointToStagePercent(placementPreview),
                  width: tableSizeToStagePercentWidth(BALL_RADIUS * 2),
                  height: tableSizeToStagePercentHeight(BALL_RADIUS * 2),
                  opacity: placementPreview.legal ? 0.92 : 0.55,
                }"
                aria-hidden="true"
              />
              <BilliardsBallChip
                v-for="ball in renderedVisibleBalls"
                v-show="canDragBalls"
                :key="`drag-${ball.id}`"
                :ball="ball"
                :rolling="false"
                drag-proxy
                :can-drag="canDragBalls && (displayState.phase !== 'place_cue' || ball.number === 0)"
              />
            </div>
          </div>
          </div>
        </div>

        <BilliardsCollectedBallTray
          v-if="showPracticeCollectedTray"
          :balls="practiceTrayBalls"
          :surface-style="ballTraySurfaceStyle"
          :border-class="stageSurfaceBorderClass"
          @measure="setPracticeTrayWidth"
        />

        <BilliardsSpareCue
          v-if="humanBallInHandUiActive && displayState.phase === 'place_cue' && !hasCueOnTable && !matchChromeInAside"
          :disabled="spareCueDisabled"
        />

        <section
          v-if="displayState.phase === 'setup'"
          :id="generateUniqueId('billiards-setup-tray-section')"
          class="lab-form-section w-fit max-w-full"
        >
          <h4 :id="generateUniqueId('billiards-setup-tray-title')" class="lab-form-section__title">
            <span class="lab-form-section__icon"><i class="pi pi-th-large" aria-hidden="true" /></span>
            Ball tray
          </h4>
          <p class="lab-form-section__lead">Drag a ball onto the table or click to add in an open spot.</p>
          <div class="lab-form-section__children flex flex-col gap-3 pt-[0.65rem]">
            <div
              :class="[stageSurfaceBorderClass, 'w-fit max-w-full p-3']"
              :style="ballTraySurfaceStyle"
            >
              <div class="flex flex-wrap gap-2">
                <BilliardsTrayBall
                  v-for="n in 15"
                  :key="n"
                  :number="n"
                  :disabled="disabled"
                  @pick="addBallFromTray"
                />
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
            <Button
              label="Auto rack"
              size="small"
              severity="secondary"
              :pt="{ root: { attrs: { id: generateUniqueId('billiards-auto-rack') } } }"
              @click="emit('move', { type: 'layout/autoRack' })"
            />
            <Button
              label="Clear object balls"
              size="small"
              severity="secondary"
              :pt="{ root: { attrs: { id: generateUniqueId('billiards-clear') } } }"
              @click="emit('move', { type: 'layout/clear' })"
            />
            <Button
              label="Start practice"
              size="small"
              :disabled="disabled || !canStartPractice"
              :pt="{ root: { attrs: { id: generateUniqueId('billiards-start') } } }"
              @click="emit('move', { type: 'layout/lock' })"
            />
          </div>
          </div>
        </section>

        <div
          v-if="humanMustPlaceCueBall && displayState.phase === 'place_cue' && hasCueOnTable && !matchChromeInAside"
          class="flex gap-2"
        >
          <Button
            label="Confirm cue placement"
            size="small"
            :pt="{ root: { attrs: { id: generateUniqueId('billiards-confirm-cue') } } }"
            @click="confirmCuePlace"
          />
        </div>
        </div>
      </div>

      <aside
        v-if="showSidePanel"
        class="sticky top-0 flex max-h-full shrink-0 flex-col gap-3 overflow-y-auto overflow-x-hidden"
        :class="widePlayLayout ? 'w-fit max-w-full' : 'w-64 max-w-full'"
        :id="generateUniqueId('billiards-side-panel')"
      >
        <div v-if="showEndPractice || showEditLayout" class="flex flex-wrap gap-2">
          <Button
            v-if="showEndPractice"
            label="End practice"
            size="small"
            severity="secondary"
            :disabled="disabled || isRolling"
            :pt="{ root: { attrs: { id: generateUniqueId('billiards-end-practice') } } }"
            @click="emit('move', { type: 'layout/endPractice' })"
          />
          <Button
            v-if="showEditLayout"
            label="Edit layout"
            size="small"
            severity="secondary"
            :disabled="disabled || isRolling"
            :pt="{ root: { attrs: { id: generateUniqueId('billiards-reopen-layout') } } }"
            @click="emit('move', { type: 'layout/reopen' })"
          />
          <Button
            v-if="BILLIARDS_SHOW_DEV_TOOLS && showEditLayout"
            :label="showColliderDebug ? 'Hide colliders' : 'Show colliders'"
            size="small"
            severity="secondary"
            :disabled="disabled || isRolling"
            :pt="{ root: { attrs: { id: generateUniqueId('billiards-collider-debug') } } }"
            @click="showColliderDebug = !showColliderDebug"
          />
          <Button
            v-if="BILLIARDS_SHOW_DEV_TOOLS && showEditLayout"
            :label="showRailBumpers ? 'Hide bumpers' : 'Show bumpers'"
            size="small"
            severity="secondary"
            :disabled="disabled || isRolling"
            :pt="{ root: { attrs: { id: generateUniqueId('billiards-rail-bumpers-toggle') } } }"
            @click="showRailBumpers = !showRailBumpers"
          />
          <!-- TEMPORARY dev overlay — remove with BilliardsDevGrid.vue. -->
          <Button
            v-if="BILLIARDS_SHOW_DEV_TOOLS && showEditLayout"
            :label="showDevGrid ? 'Hide grid' : 'Show grid'"
            size="small"
            severity="secondary"
            :disabled="disabled || isRolling"
            :pt="{ root: { attrs: { id: generateUniqueId('billiards-dev-grid-toggle') } } }"
            @click="showDevGrid = !showDevGrid"
          />
        </div>

        <BilliardsCueEnglishSection
          v-if="showCueEnglishInTableAside"
          v-model:english-x="englishX"
          v-model:english-y="englishY"
          :disabled="disabled || isRolling || !canShoot"
        />

        <LabGameHintAsideControls
          v-if="showQuarksHintInTableAside"
          :sku-label="shotPathSku?.label ?? 'Shot path preview'"
          :cost-quarks="shotPathSku?.defaultCostQuarks ?? 50"
          :unlocked="shotPathUnlocked"
          :loading="shotPathPurchasing"
          :disabled="disabled || isRolling"
          :dev-mock-enabled="shotPathDevMockEnabled"
          :show-when="!practiceMode || shotPathDevMockEnabled"
          class="w-full min-w-0"
          @purchase="() => void onPurchaseShotPathHint()"
          @mock-purchase="mockPurchaseHint"
        />
      </aside>
    </div>

  </div>
</template>

<style scoped>
.billiards-placement-ghost {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lab-general-bg) 40%, transparent);
  background: radial-gradient(circle at 35% 30%, #ffffff 0%, #f4f4f4 45%, #e8e8e8 100%);
}

/** Ball-in-hand: the cloth is clickable, so show that it is. */
.billiards-felt--placing {
  cursor: crosshair;
}

.billiards-illegal-first-contact-ring {
  border: 2.5px solid color-mix(in srgb, #f97316 62%, var(--lab-chat-log-error));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--lab-general-bg) 35%, transparent),
    0 0 10px color-mix(in srgb, #f97316 35%, transparent);
  animation: billiards-illegal-target-pulse 1.1s ease-in-out infinite;
}

.billiards-illegal-first-contact-ring--kitchen {
  border-color: color-mix(in srgb, var(--lab-chat-log-error) 85%, var(--lab-general-border));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--lab-general-bg) 35%, transparent),
    0 0 12px color-mix(in srgb, var(--lab-chat-log-error) 40%, transparent);
}

@keyframes billiards-illegal-target-pulse {
  0%,
  100% {
    opacity: 0.88;
  }
  50% {
    opacity: 1;
  }
}

.billiards-table-status__hint {
  color: var(--lab-general-text-muted);
  font-weight: 400;
  font-size: 0.875rem;
}

.billiards-stage-play-stack {
  align-items: stretch;
}

.billiards-stage-play-stack__rail {
  width: 100%;
  z-index: 3;
}

.billiards-stage-rail-slot {
  display: flex;
  width: 100%;
  min-height: 2.5rem;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
}
</style>
