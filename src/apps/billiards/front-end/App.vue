<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, reactive, ref, watch } from 'vue';
import Button from 'primevue/button';
import { DnDProvider } from '@vue-dnd-kit/core';
import { useLabAppToast } from '@/shared/composables/useLabAppToast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { getLabSessionId, getLabUserIdFromAccessToken } from '@/shared/composables/useLabPlatformAuth';
import { displayLabUserName } from '@/shared/utils/lab-comms-ui';
import { useLabComms } from '@/shared/composables/useLabComms';
import { fetchActivePlatformUsersForClient } from '@/shared/services/platform-user-client';
import type { User } from '@/shared/types/user';
import { LAB_COMMS_EVENTS } from '@/shared/types';
import {
  GAME_PENDING_MATCH_EVENT,
  readGamePendingMatch,
  clearGamePendingMatch,
  type GamePendingMatch,
} from '@/shared/config/game-pending-match';
import {
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE,
  LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY,
  type GameInviteDeclinePayload,
  type GameMatchReadyPayload,
} from '@/shared/types/lab-comms-game-invite';
import {
  outcomeForMatch,
  useTurnBasedMatch,
  type MatchOutcome,
} from '@/shared/game-platform/use-turn-based-match';
import {
  isBilliardsPendingOpponentPresentation,
  shouldDeferBilliardsOpponentPresentationUi,
  playerTurnFeedRowsToHideDuringDefer,
  slicePlayerTurnsForPresentation,
} from '../shared/billiards-player-turn-feed-defer';
import { useGameInvites } from '@/shared/game-platform/use-game-invites';
import {
  GameBoardRow,
  GameLobbyModePanel,
  GamePlayShell,
  GameResultModal,
  LabVirtualBankBadge,
  PlayerTurnsPanel,
  TurnTimerHud,
} from '@/shared/game-platform/ui';
import { useLabVirtualBank, useLabVirtualBankOnMatchFinished } from '@/shared/composables/useLabVirtualBank';
import { useCatalogGameWagerLobby } from '@/shared/game-platform/composables/use-catalog-game-wager-lobby';
import { readWagerQuarksFromState } from '@/shared/game-platform/catalog-match-wager';
import { GAME_LOBBY_INVITE_FRAME_WAGER_SUFFIX } from '@/shared/constants/lab-game-quarks-practice';
import type { GameDifficulty } from '@/shared/game-platform/types';
import type { BilliardsMatchState, BilliardsRulesProfile } from '../shared/billiards-types';
import { BILLIARDS_CONFIG } from '../shared/game-config';
import { BILLIARDS_GAME_IDS } from '../back-end/catalog';
import { detectBilliardsBanterMoment } from '../shared/billiards-banter-moments';
import { shouldDeferBilliardsResultModal } from '../shared/billiards-opponent-presentation-defer';
import { useGameMatchResultModalOnce } from '@/shared/game-platform/composables/useGameMatchResultModalOnce';
import {
  isHumanBallInHandPlacement,
  resolveBilliardsEffectivePlacementZone,
} from '../shared/billiards-rules';
import { useBilliardsPresentationStore } from './stores/billiardsPresentation';
import { isBilliardsPlayerTurnFeedWorthy } from '../shared/billiards-player-turn-feed';
import {
  createBilliardsSeatNameResolver,
  humanizeBilliardsTurnSummary,
} from '../shared/billiards-turn-summary-display';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL, GAME_LOBBY_OR_INVITE_FRIEND_TAGLINE } from '@/shared/constants/lab-game-assistant-opponent';
import BilliardsMatchAsideChrome from './components/BilliardsMatchAsideChrome.vue';
import {
  BILLIARDS_MATCH_ASIDE_CHROME_KEY,
  createBilliardsMatchAsideChromeModel,
} from './billiards-match-aside-chrome';
import BilliardsTable from './components/BilliardsTable.vue';
import { ensureBilliardsRapier } from '../shared/billiards-rapier-init';
interface Props {
  serverUrl?: string;
  appDescription?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const toast = useLabAppToast();

const billiardsMatchAsideChrome = reactive(createBilliardsMatchAsideChromeModel());
provide(BILLIARDS_MATCH_ASIDE_CHROME_KEY, billiardsMatchAsideChrome);

const PLATFORM_APP_ID = BILLIARDS_CONFIG.appId;

/** Friend matches (Lab Messages invite) — ordered match sync; see src/apps/billiards/docs/authoritative-sync.md */
const BILLIARDS_LOBBY_PVP_ENABLED = true;
const BILLIARDS_LOBBY_PVP_DISABLED_LEAD =
  'Friend matches are temporarily unavailable.';
const platformUrl = `${import.meta.env.VITE_API_BASE_URL}:${import.meta.env.VITE_API_BASE_PORT}`;
const appServerUrl = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

const view = ref<'lobby' | 'play'>('lobby');
const playMode = ref<'practice' | 'match'>('practice');
const starting = ref(false);
const notice = ref<string | null>(null);
const isAuthenticated = ref(Boolean(getLabSessionId()));
const rulesProfile = ref<BilliardsRulesProfile>('eight-ball');
const difficulty = ref<GameDifficulty>('medium');
const wagerLobby = useCatalogGameWagerLobby(difficulty);
const roster = ref<User[]>([]);
const selectedOpponentId = ref<number | null>(null);
const pendingOutgoingInviteId = ref<string | null>(null);
const opponentName = ref('Opponent');
const lastMatchWasAi = ref(false);
const shotInteractionBusy = ref(false);
const presentationStore = useBilliardsPresentationStore();
const opponentPresentationBusy = computed(() => presentationStore.opponentPresentationBusy);

const resultVisible = ref(false);
const resultModalOnce = useGameMatchResultModalOnce();
const resultTitle = ref('');
const resultMessage = ref('');

function billiardsSeatNameResolver() {
  const selfId = getLabUserIdFromAccessToken();
  const selfUser = selfId != null ? roster.value.find((u) => u.userId === selfId) : undefined;
  return createBilliardsSeatNameResolver({
    rosterNameForUserId: (userId) => {
      const user = roster.value.find((u) => u.userId === userId);
      return user ? displayLabUserName(user) : null;
    },
    humanDisplayName: selfUser ? displayLabUserName(selfUser) : null,
  });
}

function syncOpponentDisplayNameFromMatch(): void {
  const m = turnMatch.match.value;
  if (!m) {
    return;
  }
  if (m.opponentKind === 'ai') {
    opponentName.value = LAB_ASSISTANT_GAME_OPPONENT_LABEL;
    return;
  }
  const oppId = m.yourSeat === 1 ? m.player2Id : m.player1Id;
  const user = roster.value.find((u) => u.userId === oppId);
  opponentName.value = user ? displayLabUserName(user) : `User ${oppId}`;
}

function billiardsPresentationUiDeferInput() {
  return {
    practiceMode: practiceMode.value,
    yourSeat: yourSeat.value,
    state: matchState.value,
    lastConsumedShotReplay: presentationStore.lastConsumedShotReplay,
    lastConsumedCuePlaceIndex: presentationStore.lastConsumedCuePlaceIndex,
    opponentShotPhase: presentationStore.opponentShotPhase,
    opponentPlacePhase: presentationStore.opponentPlacePhase,
    presentationExecutorBusy: presentationStore.presentationExecutorBusy,
  };
}

/** Banter + modal — includes presentation ack defer. */
function billiardsDeferOpponentPresentation(): boolean {
  if (practiceMode.value) {
    return false;
  }
  if (shotInteractionBusy.value) {
    return true;
  }
  if (opponentPresentationBusy.value) {
    return true;
  }
  if (shouldDeferBilliardsOpponentPresentationUi(billiardsPresentationUiDeferInput())) {
    return true;
  }
  const m = turnMatch.match.value;
  if (!m) {
    return false;
  }
  return presentationStore.shouldDeferBanter(m.state as BilliardsMatchState);
}

/** Agent turn — replay/place only; must not wait on banter ack. */
function billiardsDeferAgentTurn(): boolean {
  if (practiceMode.value) {
    return false;
  }
  if (shotInteractionBusy.value) {
    return true;
  }
  if (opponentPresentationBusy.value) {
    return true;
  }
  return shouldDeferBilliardsOpponentPresentationUi(billiardsPresentationUiDeferInput());
}

const virtualBank = useLabVirtualBank({ serverUrl: () => appServerUrl.value });

const turnMatch = useTurnBasedMatch({
  serverUrl: () => appServerUrl.value,
  config: BILLIARDS_CONFIG,
  getOpponentDisplayName: () => opponentName.value,
  filterPlayerTurn: (entry) => isBilliardsPlayerTurnFeedWorthy(entry.summary),
  formatTurnSummary: (summary, m, seat) =>
    humanizeBilliardsTurnSummary(summary, billiardsSeatNameResolver(), m, seat),
  deferBanterWhile: () => billiardsDeferOpponentPresentation(),
  deferAgentTurnWhile: () => billiardsDeferAgentTurn(),
  detectBanterMoment: detectBilliardsBanterMoment,
});

const comms = useLabComms({
  serverUrl: platformUrl,
  isAuthenticated,
  onMatchState: () => {
    /* match state arrives on the app socket */
  },
});

const invites = useGameInvites({
  appServerUrl: () => appServerUrl.value,
  platformAppId: PLATFORM_APP_ID,
  config: BILLIARDS_CONFIG,
  sendEnvelope: comms.sendEnvelope,
});

const match = turnMatch.match;

useLabVirtualBankOnMatchFinished(
  virtualBank,
  computed(() => match.value?.status),
  computed(() => match.value?.practice === true),
);

const matchState = computed(
  () =>
    (match.value?.state ?? {
      phase: 'setup',
      balls: [],
      layoutLocked: false,
      rulesProfile: 'eight-ball',
      ballInHand: false,
      ballInHandSeat: null,
      /** Must be present — `canPlaceBallAt` skips its bounds checks for an unknown zone. */
      placementZone: 'table',
      seatGroups: { 1: null, 2: null },
      turnHistory: [],
      shotsTaken: 0,
      resultMessage: null,
      winnerSeat: null,
    }) as BilliardsMatchState,
);

const playerTurnsForPanel = computed(() => {
  const deferFeed = shouldDeferBilliardsOpponentPresentationUi(billiardsPresentationUiDeferInput());
  let all = turnMatch.playerTurns.value;
  if (deferFeed) {
    const hidden = playerTurnFeedRowsToHideDuringDefer(all, yourSeat.value, {
      pendingOpponentPresentation: presentationStore.pendingOpponentPresentation,
    });
    all = slicePlayerTurnsForPresentation(all, hidden);
  }
  const skipped = presentationStore.skippedFeedSummaries;
  if (skipped.length > 0) {
    const oppSeat = yourSeat.value === 1 ? 2 : 1;
    const synthetic = skipped.map((summary, index) => ({
      id: `billiards-skipped-${index}`,
      seat: oppSeat,
      isYou: false,
      playerLabel: opponentName.value,
      summary,
      moveSummary: summary,
    }));
    all = [...all, ...synthetic];
  }
  return all;
});

function rulesProfileLabel(profile: BilliardsRulesProfile): string {
  if (profile === 'nine-ball') {
    return '9-ball';
  }
  if (profile === 'eight-ball') {
    return '8-ball';
  }
  return 'Open practice';
}

const yourSeat = computed(() => match.value?.yourSeat ?? 1);

const isMyTurn = computed(() => {
  if (!match.value || match.value.status !== 'active') {
    return false;
  }
  const ms = matchState.value;
  if (ms.phase === 'place_cue' && ms.ballInHand) {
    const bih = ms.ballInHandSeat;
    if (bih === 1 || bih === 2) {
      return bih === match.value.yourSeat;
    }
  }
  return match.value.currentSeat === match.value.yourSeat;
});
const finished = computed(() => match.value?.status === 'finished');
const practiceMode = computed(() => playMode.value === 'practice');

/** Authoritative place_cue may arrive before opponent scratch replay ends — hide BIH copy until then. */
const showHumanBallInHandStatus = computed(() => {
  if (practiceMode.value) {
    return false;
  }
  if (opponentPresentationBusy.value || shotInteractionBusy.value) {
    return false;
  }
  if (matchState.value.phase === 'rolling') {
    return false;
  }
  return isHumanBallInHandPlacement(matchState.value, yourSeat.value);
});

const playSubtitle = computed(() => {
  const profile = matchState.value.rulesProfile ?? rulesProfile.value;
  if (practiceMode.value) {
    return `Practice — ${rulesProfileLabel(profile)}`;
  }
  return `${rulesProfileLabel(profile)} vs ${opponentName.value}`;
});

const COMPETITIVE_BREAK_NOTE_AI =
  ' Who breaks is chosen at random each frame (you or the Lab Assistant).';
const COMPETITIVE_BREAK_NOTE_PVP =
  ' Who breaks is chosen at random each frame (you or your opponent).';
const inviteSectionLead = computed(() => {
  const rules =
    rulesProfile.value === 'nine-ball'
      ? 'Nine-ball — hit the lowest ball first; pocket the 9 on a legal shot to win.'
      : 'Eight-ball — open table until a group is assigned; clear your group, then the 8.';
  if (rulesProfile.value === 'free') {
    return 'Pick **8-ball** or **9-ball** in Table rules before sending an invite — open practice is solo only.';
  }
  return `${rules}${COMPETITIVE_BREAK_NOTE_PVP}${GAME_LOBBY_INVITE_FRAME_WAGER_SUFFIX}`;
});

const aiSectionLead = computed(() => {
  if (rulesProfile.value === 'nine-ball') {
    return (
      'Nine-ball — hit the lowest ball on the table first; pocket the 9 on a legal shot to win.' +
      COMPETITIVE_BREAK_NOTE_AI
    );
  }
  if (rulesProfile.value === 'eight-ball') {
    return (
      'Eight-ball — table open until one group is pocketed legally; run your group, then pocket the 8.' +
      COMPETITIVE_BREAK_NOTE_AI
    );
  }
  return 'Open practice — layout and shots only; pick 8-ball or 9-ball for competitive rules.';
});

const subtitle = computed(
  () => props.appDescription?.trim() || GAME_LOBBY_OR_INVITE_FRIEND_TAGLINE,
);

const statusLine = computed(() => {
  if (!match.value) {
    return '';
  }
  if (finished.value) {
    const outcome: MatchOutcome = outcomeForMatch(match.value);
    if (outcome === 'win') {
      return 'You win the frame!';
    }
    if (outcome === 'loss') {
      return 'You lose the frame.';
    }
    return matchState.value.resultMessage ?? 'Frame over.';
  }
  if (turnMatch.agentStreamBusy.value) {
    return `${opponentName.value} is lining up a shot…`;
  }
  if (opponentPresentationBusy.value) {
    return `${opponentName.value} is shooting…`;
  }
  if (shotInteractionBusy.value || matchState.value.phase === 'rolling') {
    return 'Balls moving…';
  }
  if (showHumanBallInHandStatus.value) {
    const zone = resolveBilliardsEffectivePlacementZone(matchState.value);
    return zone === 'kitchen'
      ? 'Ball in hand — kitchen only (above the head string).'
      : 'Ball in hand — place the cue anywhere on the felt.';
  }
  if (isMyTurn.value && matchState.value.phase === 'aim') {
    return 'Your shot.';
  }
  if (isMyTurn.value && matchState.value.phase === 'place_cue') {
    return 'Place the cue ball.';
  }
  return isMyTurn.value ? 'Your shot.' : `${opponentName.value}'s shot.`;
});

/** Shot clock follows server `currentSeat`; opponent replay busy alone is not “waiting on opponent”. */
const turnPanelWaitingForOpponent = computed(() => {
  const m = match.value;
  if (!m || m.status !== 'active' || practiceMode.value) {
    return false;
  }
  if (m.currentSeat === m.yourSeat) {
    return false;
  }
  return (
    turnMatch.waitingForOpponent.value ||
    awaitingOpponentPresentation.value
  );
});

const difficultyOptions: ReadonlyArray<{ label: string; value: GameDifficulty }> = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
  { label: 'Boss', value: 'boss' },
];

async function loadRoster(): Promise<void> {
  if (!isAuthenticated.value) {
    return;
  }
  try {
    roster.value = await fetchActivePlatformUsersForClient();
  } catch {
    roster.value = [];
  }
}

onMounted(async () => {
  void ensureBilliardsRapier();
  void loadRoster();
  window.addEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
  if (appServerUrl.value && isAuthenticated.value) {
    turnMatch.ensureSocket();
    openPendingMatchIfAny();
    comms.connect();
  }
});

onUnmounted(() => {
  window.removeEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
});

function tryShowResultModal(): void {
  if (match.value?.status !== 'finished') {
    return;
  }
  if (
    shouldDeferBilliardsResultModal({
      practiceMode: practiceMode.value,
      yourSeat: yourSeat.value,
      state: matchState.value,
      lastConsumedShotReplay: presentationStore.lastConsumedShotReplay,
      lastConsumedCuePlaceIndex: presentationStore.lastConsumedCuePlaceIndex,
      presentedKeys: presentationStore.presentedKeySet,
      opponentShotPhase: presentationStore.opponentShotPhase,
      opponentPlacePhase: presentationStore.opponentPlacePhase,
      presentationExecutorBusy: presentationStore.presentationExecutorBusy,
      shotInteractionBusy: shotInteractionBusy.value,
      opponentPresentationBusy: opponentPresentationBusy.value,
    })
  ) {
    return;
  }
  showResultModal();
}

watch(
  () => match.value?.matchId,
  (matchId, prev) => {
    resultModalOnce.onMatchIdChange(matchId, prev);
    if (matchId && matchId !== prev) {
      resultVisible.value = false;
    }
  },
);

watch(
  () => match.value?.status,
  (status, prev) => {
    if (status === 'finished' && prev === 'active') {
      tryShowResultModal();
      turnMatch.flushDeferredBanter();
    }
  },
);

watch(
  () =>
    [
      match.value?.status,
      matchState.value.shotsTaken,
      matchState.value.lastShotReplay,
      presentationStore.lastConsumedShotReplay,
      presentationStore.presentedKeys,
      presentationStore.opponentShotPhase,
      presentationStore.opponentPlacePhase,
      presentationStore.presentationExecutorBusy,
      opponentPresentationBusy.value,
      shotInteractionBusy.value,
    ] as const,
  () => {
    tryShowResultModal();
  },
);

watch(shotInteractionBusy, (busy) => {
  if (!busy) {
    markOpponentPresentationComplete();
  }
});

watch(
  () =>
    [
      opponentPresentationBusy.value,
      presentationStore.pendingOpponentPresentation,
      presentationStore.opponentShotPhase,
      presentationStore.presentationExecutorBusy,
      presentationStore.opponentPlacementBusy,
    ] as const,
  () => {
    markOpponentPresentationComplete();
  },
);

watch(
  () => [turnMatch.match.value?.matchId, roster.value] as const,
  () => {
    syncOpponentDisplayNameFromMatch();
  },
  { deep: true },
);

watch(
  () => comms.socket.value,
  (sock, prev) => {
    prev?.off(LAB_COMMS_EVENTS.MESSAGE);
    sock?.on(LAB_COMMS_EVENTS.MESSAGE, (envelope: { type: string; payload: unknown }) => {
      if (envelope.type === LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY) {
        handleMatchReady(envelope.payload as GameMatchReadyPayload);
      }
      if (envelope.type === LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE) {
        const payload = envelope.payload as GameInviteDeclinePayload;
        if (pendingOutgoingInviteId.value === payload.inviteId) {
          pendingOutgoingInviteId.value = null;
        }
      }
    });
  },
);

async function startPractice(): Promise<void> {
  notice.value = null;
  if (!isAuthenticated.value) {
    notice.value = 'Sign in to start a practice session.';
    return;
  }
  if (!appServerUrl.value) {
    notice.value = 'App server is not running.';
    return;
  }
  starting.value = true;
  try {
    turnMatch.ensureSocket();
    await turnMatch.createSoloMatch(BILLIARDS_GAME_IDS.PRACTICE, { rulesProfile: rulesProfile.value });
    playMode.value = 'practice';
    view.value = 'play';
    resultVisible.value = false;
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Could not start practice';
  } finally {
    starting.value = false;
  }
}

async function playAi(): Promise<void> {
  notice.value = null;
  if (!isAuthenticated.value) {
    notice.value = 'Sign in to play.';
    return;
  }
  if (!appServerUrl.value) {
    notice.value = 'App server is not running.';
    return;
  }
  starting.value = true;
  opponentName.value = LAB_ASSISTANT_GAME_OPPONENT_LABEL;
  lastMatchWasAi.value = true;
  try {
    turnMatch.ensureSocket();
    const competitiveRules =
      rulesProfile.value === 'nine-ball' ? 'nine-ball' : 'eight-ball';
    await turnMatch.createAiMatch(BILLIARDS_GAME_IDS.EIGHT_BALL, difficulty.value, {
      rulesProfile: competitiveRules,
      ...wagerLobby.aiCreateRules(),
    });
    playMode.value = 'match';
    view.value = 'play';
    resultVisible.value = false;
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Could not start a match.';
  } finally {
    starting.value = false;
  }
}

async function inviteFriend(): Promise<void> {
  const target = selectedOpponentId.value;
  if (!target) {
    notice.value = 'Pick someone to invite.';
    return;
  }
  if (!BILLIARDS_LOBBY_PVP_ENABLED) {
    notice.value = BILLIARDS_LOBBY_PVP_DISABLED_LEAD;
    return;
  }
  if (rulesProfile.value === 'free') {
    notice.value = 'Choose 8-ball or 9-ball under Table rules before inviting a friend.';
    return;
  }
  const competitiveRules =
    rulesProfile.value === 'nine-ball' ? 'nine-ball' : 'eight-ball';
  const inviteLabel = competitiveRules === 'nine-ball' ? '9-Ball' : '8-Ball';
  starting.value = true;
  notice.value = null;
  try {
    const { inviteId } = await invites.sendGameInvite(
      target,
      BILLIARDS_GAME_IDS.EIGHT_BALL,
      inviteLabel,
      { rulesProfile: competitiveRules, ...wagerLobby.pvpInviteRules() },
    );
    pendingOutgoingInviteId.value = inviteId;
    toast.add({
      severity: 'success',
      summary: 'Invite sent',
      detail: 'The match opens when they accept.',
      life: 4500,
    });
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Invite failed.';
  } finally {
    starting.value = false;
  }
}

/** Aim/roll/place settled — distinct from banter defer (needs presentation ack). */
function opponentVisualPresentationIdle(): boolean {
  if (practiceMode.value) {
    return true;
  }
  if (
    opponentPresentationBusy.value ||
    isBilliardsPendingOpponentPresentation({
      practiceMode: practiceMode.value,
      yourSeat: yourSeat.value,
      state: matchState.value,
      lastConsumedShotReplay: presentationStore.lastConsumedShotReplay,
      lastConsumedCuePlaceIndex: presentationStore.lastConsumedCuePlaceIndex,
      opponentPlacePhase: presentationStore.opponentPlacePhase,
    }) ||
    presentationStore.opponentShotPhase === 'queued' ||
    presentationStore.presentationExecutorBusy ||
    presentationStore.opponentPlacementBusy ||
    shotInteractionBusy.value
  ) {
    return false;
  }
  return true;
}

function markOpponentPresentationComplete(): void {
  const m = match.value;
  if (m && opponentVisualPresentationIdle()) {
    presentationStore.ackPresentationForState(m.state as BilliardsMatchState);
  }
  if (billiardsDeferOpponentPresentation()) {
    return;
  }
  turnMatch.flushDeferredBanter();
  tryShowResultModal();
  void turnMatch.maybeStreamAgentTurn();
}

function onOpponentPresentationBusy(busy: boolean): void {
  if (busy) {
    return;
  }
  markOpponentPresentationComplete();
}

function onOpponentPresentationAck(): void {
  markOpponentPresentationComplete();
}

function onShotInteractionBusy(busy: boolean): void {
  shotInteractionBusy.value = busy;
}

const billiardsTableRef = ref<{ handleShotRejected: () => void } | null>(null);

async function refreshMatchForShotAck(): Promise<void> {
  await turnMatch.refreshMatch();
}

async function onTableMove(payload: Record<string, unknown>): Promise<void> {
  notice.value = null;
  try {
    await turnMatch.submitMove(payload);
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Move failed';
    if (payload.type === 'shot') {
      billiardsTableRef.value?.handleShotRejected();
    }
  }
}

function backToLobby(): void {
  view.value = 'lobby';
  turnMatch.match.value = null;
  resultModalOnce.clearShown();
  resultVisible.value = false;
  notice.value = null;
  pendingOutgoingInviteId.value = null;
}

function showResultModal(): void {
  const m = match.value;
  if (!m || m.status !== 'finished') {
    return;
  }
  if (!resultModalOnce.beginShow(m.matchId)) {
    return;
  }
  const outcome: MatchOutcome = outcomeForMatch(m);
  const stakeNote = wagerLobby.wagerOutcomeSuffix(readWagerQuarksFromState(m.state), outcome);
  if (outcome === 'win') {
    resultTitle.value = 'You won!';
    resultMessage.value = `You win this frame.${stakeNote}`;
  } else if (outcome === 'loss') {
    resultTitle.value = 'You lost';
    resultMessage.value = `Your opponent wins this frame.${stakeNote}`;
  } else {
    resultTitle.value = 'Frame over';
    resultMessage.value = matchState.value.resultMessage ?? 'Play again from the lobby.';
  }
  resultVisible.value = true;
}

async function playAgain(): Promise<void> {
  resultVisible.value = false;
  if (lastMatchWasAi.value) {
    await playAi();
    return;
  }
  backToLobby();
  notice.value = 'Start a new invite from the lobby to play again.';
}

function handleMatchReady(payload: GameMatchReadyPayload): void {
  if (payload.appId && payload.appId !== PLATFORM_APP_ID) {
    return;
  }
  pendingOutgoingInviteId.value = null;
  opponentName.value = 'Opponent';
  lastMatchWasAi.value = false;
  playMode.value = 'match';
  view.value = 'play';
  void turnMatch.load(payload.matchId);
}

async function applyPendingMatch(pending: GamePendingMatch): Promise<void> {
  if (pending.appId !== PLATFORM_APP_ID || !appServerUrl.value) {
    return;
  }
  clearGamePendingMatch();
  opponentName.value = 'Opponent';
  lastMatchWasAi.value = false;
  playMode.value = 'match';
  view.value = 'play';
  await turnMatch.load(pending.matchId);
}

function openPendingMatchIfAny(): void {
  const pending = readGamePendingMatch();
  if (pending && pending.appId === PLATFORM_APP_ID) {
    void applyPendingMatch(pending);
  }
}

function onPendingMatchSaved(event: Event): void {
  const detail = (event as CustomEvent<GamePendingMatch>).detail;
  const pending =
    detail?.matchId && detail?.gameId && detail?.appId === PLATFORM_APP_ID
      ? detail
      : readGamePendingMatch();
  if (pending && pending.appId === PLATFORM_APP_ID) {
    void applyPendingMatch(pending);
  }
}

const humanBallInHandPlacement = computed(() =>
  isHumanBallInHandPlacement(matchState.value, yourSeat.value),
);

const awaitingOpponentPresentation = computed(
  () =>
    !practiceMode.value &&
    (opponentPresentationBusy.value ||
      shotInteractionBusy.value ||
      turnMatch.agentStreamBusy.value ||
      presentationStore.pendingOpponentShotReplay),
);

const tableDisabled = computed(() => {
  if (turnMatch.loading.value || matchState.value.phase === 'finished') {
    return true;
  }
  if (showHumanBallInHandStatus.value) {
    return false;
  }
  if (!practiceMode.value && !isMyTurn.value) {
    return true;
  }
  return awaitingOpponentPresentation.value;
});

const shotEnglishX = ref(0);
const shotEnglishY = ref(0);

const showMatchCueEnglish = computed(
  () =>
    !practiceMode.value &&
    matchState.value.layoutLocked &&
    isMyTurn.value &&
    !humanBallInHandPlacement.value &&
    !awaitingOpponentPresentation.value &&
    matchState.value.phase === 'aim',
);

const matchEnglishPadDisabled = computed(() => {
  if (practiceMode.value) {
    return false;
  }
  if (!isMyTurn.value) {
    return true;
  }
  if (turnMatch.loading.value) {
    return true;
  }
  if (turnMatch.agentStreamBusy.value) {
    return true;
  }
  if (opponentPresentationBusy.value) {
    return true;
  }
  if (shotInteractionBusy.value) {
    return true;
  }
  if (matchState.value.phase !== 'aim') {
    return true;
  }
  return !matchState.value.balls.some((b) => b.number === 0 && !b.pocketed);
});

const matchEnglishPadHint = computed(() => {
  if (!showMatchCueEnglish.value || !matchEnglishPadDisabled.value) {
    return '';
  }
  if (!matchState.value.balls.some((b) => b.number === 0 && !b.pocketed)) {
    return 'Place the cue ball before setting english.';
  }
  if (shotInteractionBusy.value) {
    return 'Wait until this shot finishes.';
  }
  if (opponentPresentationBusy.value) {
    return `${opponentName.value} is shooting.`;
  }
  if (turnMatch.agentStreamBusy.value) {
    return `${opponentName.value} is lining up a shot…`;
  }
  if (matchState.value.phase === 'rolling') {
    return 'Balls are still moving.';
  }
  if (!isMyTurn.value) {
    return 'Not your shot.';
  }
  return '';
});

watch(
  () => matchState.value.phase,
  (phase, prev) => {
    if (phase === 'aim' && prev !== 'aim') {
      shotEnglishX.value = 0;
      shotEnglishY.value = 0;
    }
  },
);
</script>

<template>
  <div class="billiards-app lab-app-workspace-fill app-loaded-container w-full min-w-0 min-h-0 h-full flex flex-col overflow-hidden! text-lab-general-text">
    <template v-if="view === 'lobby'">
      <header
        :id="generateUniqueId('billiards-lobby-header')"
        class="lab-app-header flex w-full items-start justify-between gap-3 pb-4"
      >
        <div class="min-w-0">
          <h1 :id="generateUniqueId('billiards-title')" class="text-2xl font-semibold m-0">Billiards</h1>
          <p class="text-sm text-lab-general-text-muted m-0 mt-1">{{ subtitle }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <LabVirtualBankBadge
            v-if="isAuthenticated"
            :balance="virtualBank.balance.value"
            :loading="virtualBank.loading.value"
          />
        </div>
      </header>
      <main :id="generateUniqueId('billiards-lobby-main')" class="lab-app-body flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
        <div
          :id="generateUniqueId('billiards-lobby-modes-grid')"
          class="billiards-lobby-modes-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full min-w-0 items-stretch"
        >
          <section
            :id="generateUniqueId('billiards-lobby-rules-section')"
            class="lab-form-section billiards-lobby-rules-section min-w-0"
          >
            <h4 :id="generateUniqueId('billiards-lobby-rules-title')" class="lab-form-section__title">
              <span class="lab-form-section__icon"><i class="pi pi-sliders-h" aria-hidden="true" /></span>
              Table rules
            </h4>
            <p class="lab-form-section__lead">
              Same rules for practice, vs Lab Assistant, and friend matches — 8-ball, 9-ball, or open practice (solo).
            </p>
            <label
              :id="generateUniqueId('billiards-rules-label')"
              class="flex flex-col gap-1 text-sm mt-2"
            >
              <span class="text-lab-general-text-muted">Rules</span>
              <select
                v-model="rulesProfile"
                class="billiards-rules-select w-full max-w-none"
                :id="generateUniqueId('billiards-rules-profile')"
              >
                <option value="eight-ball">8-ball (solids/stripes + 8)</option>
                <option value="nine-ball">9-ball (lowest first + 9)</option>
                <option value="free">Open practice (no win rules)</option>
              </select>
            </label>
          </section>
          <GameLobbyModePanel
            v-model:difficulty="difficulty"
            v-model:selected-opponent-id="selectedOpponentId"
            v-model:quarks-wager-enabled="wagerLobby.wagerEnabled"
            v-model:invite-quarks-wager-enabled="wagerLobby.pvpWagerEnabled"
            v-model:invite-quarks-wager-quarks="wagerLobby.pvpWagerQuarks"
            layout="columns"
            :difficulty-options="difficultyOptions"
            :starting="starting"
            :is-authenticated="isAuthenticated"
            :roster="roster"
            :ai-section-lead="aiSectionLead"
            :embed-quarks-section="false"
            :embed-ai-quarks-wager="isAuthenticated"
            :embed-invite-quarks-wager="isAuthenticated"
            :show-quarks-wager="isAuthenticated"
            :quarks-wager-amount="wagerLobby.lobbyWagerStake"
            :invite-quarks-stake-options="wagerLobby.pvpStakeOptions"
            :invite-disabled="!BILLIARDS_LOBBY_PVP_ENABLED"
            :invite-disabled-lead="BILLIARDS_LOBBY_PVP_DISABLED_LEAD"
            :invite-section-lead="inviteSectionLead"
            @play-ai="playAi"
            @invite="inviteFriend"
          />
          <section
            :id="generateUniqueId('billiards-lobby-practice-section')"
            class="lab-form-section billiards-lobby-practice-section flex flex-col min-h-full min-w-0 h-full"
          >
            <h4 :id="generateUniqueId('billiards-lobby-practice-title')" class="lab-form-section__title">
              <span class="lab-form-section__icon"><i class="pi pi-user" aria-hidden="true" /></span>
              Practice table
            </h4>
            <p class="lab-form-section__lead">
              Solo drills — set up the table, shoot with cue pull-back and english.
            </p>
            <div class="game-lobby-section-primary-action game-lobby-section-primary-action--column w-full">
              <Button
                class="w-full"
                label="Open practice table"
                icon="pi pi-play"
                :loading="starting"
                :pt="{ root: { attrs: { id: generateUniqueId('billiards-practice-start') } } }"
                @click="startPractice"
              />
            </div>
          </section>
        </div>
        <p v-if="notice" class="text-sm text-lab-chat-log-error m-0">{{ notice }}</p>
      </main>
    </template>

    <GamePlayShell
      v-else
      :title="practiceMode ? 'Practice table' : rulesProfileLabel(matchState.rulesProfile ?? rulesProfile)"
      fa-icon="fa-circle"
      :subtitle="playSubtitle"
      class="billiards-play-shell flex-1 min-h-0 min-w-0 overflow-hidden"
      @lobby="backToLobby"
    >
      <div class="flex flex-col gap-2 min-h-0 flex-1">
        <div
          v-if="!practiceMode"
          class="billiards-match-status flex flex-wrap items-baseline gap-x-4 gap-y-1 shrink-0 text-sm"
        >
          <p
            class="m-0 font-medium text-lab-general-text"
            :id="generateUniqueId('billiards-status')"
          >
            {{ statusLine }}
          </p>
          <TurnTimerHud
            v-if="match?.status === 'active'"
            :turn-remaining-ms="match.turnRemainingMs ?? 0"
          />
        </div>
        <DnDProvider>
          <div
            v-if="match"
            class="billiards-play-main flex min-h-0 min-w-0 flex-1 flex-col"
          >
            <div class="billiards-play-stack flex min-h-0 w-full flex-1 flex-col gap-3">
            <GameBoardRow
              :show-aside="!practiceMode"
              aside-position="start"
              :class="[
                'min-h-0 min-w-0 w-full',
                !practiceMode ? 'billiards-board-row' : 'min-h-0 flex-1 overflow-hidden',
              ]"
            >
            <BilliardsTable
              ref="billiardsTableRef"
              :key="match.matchId"
              class="min-h-0 min-w-0 w-full"
              :match-id="match.matchId"
              :state="matchState"
              :disabled="tableDisabled"
              :practice-mode="practiceMode"
              :on-ack-watchdog-refresh="refreshMatchForShotAck"
              :cue-english-aside="practiceMode"
              v-model:english-x="shotEnglishX"
              v-model:english-y="shotEnglishY"
              :your-seat="yourSeat"
              :opponent-display-name="opponentName"
              :show-match-cue-english="showMatchCueEnglish"
              :match-cue-english-disabled="matchEnglishPadDisabled"
              :match-cue-english-hint="matchEnglishPadHint"
              :server-url="appServerUrl"
              @hint-purchased="() => virtualBank.refresh()"
              @move="onTableMove"
              @opponent-presentation-busy="onOpponentPresentationBusy"
              @opponent-presentation-ack="onOpponentPresentationAck"
              @shot-interaction-busy="onShotInteractionBusy"
            />
            <template v-if="!practiceMode" #aside>
              <BilliardsMatchAsideChrome class="w-full min-w-0" />
            </template>
            </GameBoardRow>
            <PlayerTurnsPanel
              v-if="!practiceMode"
              class="billiards-match-turns-rail w-full min-w-0 min-h-0 flex-1"
              :turns="playerTurnsForPanel"
              :waiting-for-opponent="turnPanelWaitingForOpponent"
              :resolving-move="turnMatch.agentStreamBusy.value || opponentPresentationBusy"
            />
            </div>
          </div>
        </DnDProvider>
      </div>
      <p v-if="notice" class="text-sm text-lab-chat-log-error mt-2">{{ notice }}</p>
      <p v-if="turnMatch.error.value" class="text-sm text-lab-chat-log-error mt-2">{{ turnMatch.error.value }}</p>
    </GamePlayShell>

    <GameResultModal
      v-model:visible="resultVisible"
      :title="resultTitle"
      :message="resultMessage"
      @lobby="backToLobby"
      @again="playAgain"
    />
  </div>
</template>

<style scoped>
@import '@/shared/game-platform/game-lobby.css';

.billiards-play-main {
  width: 100%;
}

/** Vs match: trays left, table right; full-width player-turns rail below both. */
.billiards-play-main :deep(.billiards-board-row.tw-game-board-row--aside-start) {
  display: grid;
  grid-template-columns: minmax(12rem, 2fr) minmax(0, 3fr);
  gap: 1rem;
  width: 100%;
  max-width: 100%;
  align-items: stretch;
}

.billiards-play-main :deep(.billiards-board-row .tw-game-board-row__main),
.billiards-play-main :deep(.billiards-board-row .tw-game-board-row__aside) {
  flex: unset;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  min-height: 0;
}

.billiards-play-main :deep(.billiards-board-row .tw-game-board-row__aside) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.billiards-play-stack {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  gap: 0.75rem;
  overflow: hidden;
}

/** Board + trays height follows the table; do not stretch a dead band above Player turns. */
.billiards-play-main :deep(.billiards-board-row.tw-game-board-row) {
  flex: 0 0 auto;
  width: 100%;
  max-width: 100%;
  /*
   * Cue overlay is wider than the playfield (symmetric gutter). Clip at the grid so the
   * match shell never grows a horizontal scrollbar. Left gutter still sits over the aside
   * column inside this box; main stacks above aside for power draw.
   */
  overflow: hidden;
}

/*
 * Cue shaft extends ~560px behind the cue ball (see CUE_VISUAL_LENGTH_PX).
 */
.billiards-play-main :deep(.billiards-board-row .tw-game-board-row__aside) {
  position: relative;
  z-index: 1;
}

.billiards-play-main :deep(.billiards-board-row .tw-game-board-row__main) {
  position: relative;
  z-index: 5;
  min-height: 0;
  overflow: visible;
}

.billiards-play-main :deep(.billiards-board-row .billiards-table-root),
.billiards-play-main :deep(.billiards-board-row .billiards-table-play),
.billiards-play-main :deep(.billiards-board-row .billiards-table-playfield) {
  overflow: visible;
}

.billiards-play-main :deep(.billiards-match-turns-rail.tw-player-turns-panel) {
  position: relative;
  z-index: 1;
  flex: 1 1 0;
  width: 100%;
  min-height: 10rem;
  overflow: hidden;
}

.billiards-play-main :deep(.billiards-match-turns-rail .tw-player-turns-panel__children) {
  flex: 1 1 0;
  min-height: 0;
}

.billiards-play-main :deep(.billiards-match-turns-rail .tw-player-turns-panel__body) {
  min-height: 0;
}

@media (max-width: 52rem) {
  .billiards-play-main :deep(.billiards-board-row.tw-game-board-row--aside-start) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.billiards-lobby-modes-grid :deep(.lab-form-section) {
  margin-bottom: 0;
}

@media (min-width: 80rem) {
  .billiards-lobby-modes-grid {
    grid-template-areas:
      'rules . .'
      'ai invite practice';
  }

  .billiards-lobby-rules-section {
    grid-area: rules;
  }

  .billiards-lobby-modes-grid :deep(.game-lobby-mode-section:first-of-type) {
    grid-area: ai;
  }

  .billiards-lobby-modes-grid :deep(.game-lobby-invite-section) {
    grid-area: invite;
  }

  .billiards-lobby-practice-section {
    grid-area: practice;
  }
}

.billiards-lobby-practice-section.flex.flex-col .game-lobby-section-primary-action--column {
  margin-top: auto;
  padding-top: 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  flex-shrink: 0;
}

@media (max-width: 79.99rem) {
  .billiards-lobby-rules-section {
    max-width: 32rem;
  }
}

.billiards-rules-select {
  background: var(--lab-form-control-bg, var(--lab-general-bg));
  border: 1px solid var(--lab-form-control-border, var(--lab-general-border));
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  color: var(--lab-general-text);
}

.billiards-play-shell :deep(.tw-game-session__body) {
  overflow: hidden;
  align-items: stretch;
  min-height: 0;
}

.billiards-play-shell :deep(.tw-game-session) {
  overflow: hidden;
  min-height: 0;
}

.billiards-play-shell :deep(.tw-game-session__header) {
  padding-top: 0.65rem;
}

.billiards-play-shell :deep(.tw-game-session__subtitle) {
  color: var(--lab-general-text-muted);
  font-weight: 400;
}
</style>
