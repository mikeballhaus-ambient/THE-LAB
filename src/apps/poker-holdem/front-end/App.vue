<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useLabComms } from '@/shared/composables/useLabComms';
import { fetchActivePlatformUsersForClient } from '@/shared/services/platform-user-client';
import {
  GAME_PENDING_MATCH_EVENT,
  readGamePendingMatch,
  clearGamePendingMatch,
  type GamePendingMatch,
} from '@/shared/config/game-pending-match';
import { getLabSessionId } from '@/shared/composables/useLabPlatformAuth';
import type { User } from '@/shared/types/user';
import { LAB_COMMS_EVENTS } from '@/shared/types';
import {
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE,
  LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY,
  type GameInviteDeclinePayload,
  type GameMatchReadyPayload,
} from '@/shared/types/lab-comms-game-invite';
import { outcomeForMatch, useTurnBasedMatch, type MatchOutcome } from '@/shared/game-platform/use-turn-based-match';
import { detectPokerHoldemBanterMoment } from '@/shared/game-platform/lab-assistant-banter/detectors';
import { useGameInvites } from '@/shared/game-platform/use-game-invites';
import type { GameDifficulty, MatchView } from '@/shared/game-platform/types';
import { POKER_CONFIG } from '../shared/game-config';
import { POKER_GAME_IDS } from '../back-end/catalog';
import {
  GameLobbyModePanel,
  GameResultModal,
  GameBoardRow,
  LabVirtualBankBadge,
  GamePracticeQuarksBanner,
  TurnTimerHud,
  PlayerTurnsPanel,
  LabGameHintAsideControls,
  type PlayerTurn,
} from '@/shared/game-platform/ui';
import { useCatalogMatchGameHint } from '@/shared/game-platform/composables/useCatalogMatchGameHint';
import { useLabGameHintAsideProps } from '@/shared/game-platform/composables/useLabGameHintAsideProps';
import { LAB_GAME_HINT_SKU_STREET_COACH } from '@/shared/game-platform/lab-game-hints';
import { holdemStreetCoachHints } from './utils/holdem-street-coach-hints';
import {
  LAB_GAME_QUARKS_PRACTICE_RESULT_NOTE,
} from '@/shared/constants/lab-game-quarks-practice';
import PokerBoard from './components/GameBoard.vue';
import HoldemPlayHintsPanel from './components/HoldemPlayHintsPanel.vue';
import { cardToWireCode } from './utils/card-code';
import { summarizeHoldemMoveForFeed } from '../shared/holdem-move-summary';
import {
  legalActionsFor,
  quarkSettlementDeltas,
  toCallAmount,
  type PokerMove,
  type PokerState as RulesPokerState,
} from '../back-end/rules';
import { HOLDEM_MIN_BET, HOLDEM_MIN_RAISE } from '../shared/holdem-stakes';
import type { HoldemTableAction } from './types/holdem-table-action';
import {
  useLabVirtualBank,
  useLabVirtualBankOnMatchFinished,
} from '@/shared/composables/useLabVirtualBank';
import { useCatalogGameWagerLobby } from '@/shared/game-platform/composables/use-catalog-game-wager-lobby';
import { useGameMatchResultModalOnce } from '@/shared/game-platform/composables/useGameMatchResultModalOnce';
import {
  matchHasFrameWagerSettlement,
  readWagerQuarksFromState,
} from '@/shared/game-platform/catalog-match-wager';
import { formatLabQuarksNumber, LAB_QUARKS_CURRENCY } from '@/shared/constants/lab-quarks-currency';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL } from '@/shared/constants/lab-game-assistant-opponent';
import { displayLabUserName } from '@/shared/utils/lab-comms-ui';

/**
 * Texas Hold'em — Quarks betting (blinds, bet/call/raise) + street dealing.
 */

interface Props {
  serverUrl?: string;
  appDescription?: string;
}

interface PokerCard {
  rank: string;
  suit: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();

const PLATFORM_APP_ID = POKER_CONFIG.appId;
const GAME_ID = POKER_GAME_IDS.POKER_HOLDEM;
const platformUrl = `${import.meta.env.VITE_API_BASE_URL}:${import.meta.env.VITE_API_BASE_PORT}`;
const appServerUrl = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));
const isAuthenticated = ref(Boolean(getLabSessionId()));

const view = ref<'lobby' | 'play'>('lobby');
const difficulty = ref<GameDifficulty>('medium');
const wagerLobby = useCatalogGameWagerLobby(difficulty);
const starting = ref(false);
const notice = ref<string | null>(null);
const roster = ref<User[]>([]);
const selectedOpponentId = ref<number | null>(null);
const pendingOutgoingInviteId = ref<string | null>(null);
const resultVisible = ref(false);
const resultTitle = ref('');
const resultMessage = ref('');
const resultModalOnce = useGameMatchResultModalOnce();
const lastMatchWasAi = ref(false);

function resolveOpponentDisplayName(
  m: MatchView | null | undefined,
  users: readonly User[],
): string {
  if (!m) {
    return 'Opponent';
  }
  if (m.opponentKind === 'ai') {
    return LAB_ASSISTANT_GAME_OPPONENT_LABEL;
  }
  const oppId = m.yourSeat === 1 ? m.player2Id : m.player1Id;
  if (oppId == null) {
    return 'Opponent';
  }
  const user = users.find((u) => u.userId === oppId);
  return user ? displayLabUserName(user) : `User ${oppId}`;
}

const turnMatch = useTurnBasedMatch({
  serverUrl: () => appServerUrl.value,
  config: POKER_CONFIG,
  getOpponentDisplayName: () => resolveOpponentDisplayName(turnMatch.match.value, roster.value),
  summarizeMoveForFeed: (move, m) => {
    const parsed = move as PokerMove;
    if (!parsed?.type) {
      return undefined;
    }
    const raw = m.state;
    if (!raw || typeof raw !== 'object') {
      return summarizeHoldemMoveForFeed(parsed, 0);
    }
    const pokerState = raw as RulesPokerState;
    const seat = m.yourSeat as 1 | 2;
    return summarizeHoldemMoveForFeed(parsed, toCallAmount(pokerState, seat));
  },
  detectBanterMoment: detectPokerHoldemBanterMoment,
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
  config: POKER_CONFIG,
  sendEnvelope: comms.sendEnvelope,
});

const match = turnMatch.match;

const opponentDisplayName = computed(() => resolveOpponentDisplayName(match.value, roster.value));

const virtualBank = useLabVirtualBank({ serverUrl: () => appServerUrl.value });
useLabVirtualBankOnMatchFinished(
  virtualBank,
  computed(() => match.value?.status),
  computed(() => match.value?.practice === true),
);

const state = computed<RulesPokerState | null>(() => {
  const raw = match.value?.state;
  return raw && typeof raw === 'object' ? (raw as RulesPokerState) : null;
});
const yourSeat = computed(() => (match.value?.yourSeat ?? 1) as 1 | 2);

function holeCardsForSeat(seat: number): string[] {
  const holes = state.value?.holes;
  if (!holes) {
    return [];
  }
  let raw: PokerCard[] | undefined;
  if (Array.isArray(holes)) {
    raw = holes[seat - 1] as PokerCard[] | undefined;
  } else {
    const key = seat as 1 | 2;
    raw = holes[key] ?? (holes as Record<string, PokerCard[] | undefined>)[String(seat)];
  }
  if (!raw?.length) {
    return [];
  }
  return raw.map((card) => cardToWireCode(card)).filter((code): code is string => Boolean(code));
}

const holeCards = computed(() => holeCardsForSeat(yourSeat.value));
const opponentSeat = computed(() => (yourSeat.value === 1 ? 2 : 1));
const opponentHoleCards = computed(() => holeCardsForSeat(opponentSeat.value));
const showOpponentHoles = computed(() => finished.value || !!state.value?.completed);
const boardCards = computed(() =>
  (state.value?.board ?? []).map((card) => cardToWireCode(card)).filter((code): code is string => Boolean(code)),
);
const pot = computed(() => state.value?.pot ?? 0);

const legalActions = computed(() => {
  const s = state.value;
  if (!s || state.value?.completed) {
    return [] as PokerMove['type'][];
  }
  return legalActionsFor(s, yourSeat.value);
});

const toCall = computed(() => {
  const s = state.value;
  if (!s) {
    return 0;
  }
  return toCallAmount(s, yourSeat.value);
});

const minRaiseTo = computed(() => {
  const s = state.value;
  if (!s) {
    return HOLDEM_MIN_BET;
  }
  return s.currentBet + HOLDEM_MIN_RAISE;
});

const isMyTurn = computed(
  () =>
    !!match.value &&
    match.value.status === 'active' &&
    match.value.currentSeat === match.value.yourSeat,
);
const opponentThinking = computed(
  () =>
    !!match.value &&
    match.value.status === 'active' &&
    !isMyTurn.value &&
    turnMatch.agentStreamBusy.value,
);
const finished = computed(() => match.value?.status === 'finished');

const streetCoachHint = useCatalogMatchGameHint({
  hostAppId: PLATFORM_APP_ID,
  skuId: LAB_GAME_HINT_SKU_STREET_COACH,
  serverUrl: appServerUrl,
  match,
  buildTurnKey: () =>
    `${match.value?.stateRevision ?? 0}:${state.value?.board?.length ?? 0}:${yourSeat.value}`,
  onPurchased: () => void virtualBank.refresh(),
});
const streetCoachAside = useLabGameHintAsideProps(streetCoachHint);

watch(
  () => match.value?.matchId,
  (matchId, prev) => {
    if (matchId && matchId !== prev) {
      streetCoachHint.clearUnlock();
    }
  },
);

watch(
  () => state.value?.completed,
  (completed) => {
    if (completed) {
      streetCoachHint.clearUnlock();
    }
  },
);

function pokerCardsForSeat(seat: number): PokerCard[] {
  const holes = state.value?.holes;
  if (!holes) {
    return [];
  }
  if (Array.isArray(holes)) {
    return (holes[seat - 1] as PokerCard[] | undefined) ?? [];
  }
  const key = seat as 1 | 2;
  return holes[key] ?? (holes as Record<string, PokerCard[] | undefined>)[String(seat)] ?? [];
}

/** Street coach+ never auto-reveals in practice — only after purchase/mock unlock (practice purchase is still free). */
const streetCoachOverlayOn = computed(() => streetCoachHint.unlocked.value);

const streetCoachOnClock = computed(
  () =>
    isMyTurn.value &&
    !finished.value &&
    !state.value?.completed &&
    legalActions.value.length > 0,
);

const streetCoachCards = computed(() => {
  if (!streetCoachOverlayOn.value || !streetCoachOnClock.value) {
    return [];
  }
  return holdemStreetCoachHints({
    holeCards: pokerCardsForSeat(yourSeat.value),
    boardCards: state.value?.board ?? [],
    toCall: toCall.value,
    pot: pot.value,
  });
});

const statusLine = computed(() => {
  if (!match.value) {
    return 'No match loaded.';
  }
  if (finished.value) {
    const outcome: MatchOutcome = outcomeForMatch(match.value);
    return outcome === 'draw' ? 'Draw.' : outcome === 'win' ? 'You win!' : 'You lose.';
  }
  if (turnMatch.agentStreamBusy.value) {
    return `${opponentDisplayName.value} is thinking…`;
  }
  return isMyTurn.value ? 'Your turn.' : `${opponentDisplayName.value}'s turn.`;
});

const holdemPlayerTurns = computed(() => turnMatch.playerTurns.value);

const agentLiveTurn = computed<PlayerTurn | null>(() => {
  if (!turnMatch.agentStreamBusy.value || !match.value) {
    return null;
  }
  const snippet = turnMatch.agentStreamText.value.trim();
  const oppId = match.value.yourSeat === 1 ? 2 : 1;
  return {
    id: `${match.value.matchId}-agent-live`,
    seat: oppId,
    isYou: false,
    playerLabel: opponentDisplayName.value,
    summary: snippet || '…',
    moveSummary: snippet || '…',
    streaming: true,
  };
});

const waitingForOpponent = computed(() => turnMatch.waitingForOpponent.value);
const agentResolvingMove = computed(() => turnMatch.agentStreamBusy.value);

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

async function playAi(): Promise<void> {
  starting.value = true;
  notice.value = null;
  lastMatchWasAi.value = true;
  try {
    await turnMatch.createAiMatch(GAME_ID, difficulty.value, {
      ...(!wagerLobby.wagerEnabled ? { practice: true } : {}),
      ...wagerLobby.aiCreateRules(),
    });
    view.value = 'play';
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
  starting.value = true;
  notice.value = null;
  try {
    const { inviteId } = await invites.sendGameInvite(target, GAME_ID, "Texas Hold'em", {
      ...(!wagerLobby.pvpWagerEnabled ? { practice: true } : {}),
      ...wagerLobby.pvpInviteRules(),
    });
    pendingOutgoingInviteId.value = inviteId;
    notice.value = 'Invite sent — the match opens when they accept.';
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Invite failed.';
  } finally {
    starting.value = false;
  }
}

async function takeAction(action: HoldemTableAction): Promise<void> {
  if (!isMyTurn.value) {
    return;
  }
  await turnMatch.submitMove(action);
  streetCoachHint.consumeUnlock();
}

function backToLobby(): void {
  resultModalOnce.clearShown();
  resultVisible.value = false;
  view.value = 'lobby';
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
  resultTitle.value =
    outcome === 'win' ? 'You won!' : outcome === 'draw' ? 'Draw' : 'You lost';
  if (outcome === 'win') {
    resultMessage.value = 'Your hand beat the opponent at showdown (or they folded).';
  } else if (outcome === 'loss') {
    resultMessage.value = 'The opponent took this pot.';
  } else {
    resultMessage.value = 'The pot was split.';
  }
  if (matchHasFrameWagerSettlement(m)) {
    const s = state.value;
    if (s?.completed) {
      const seat = m.yourSeat as 1 | 2;
      const net = quarkSettlementDeltas(s).find((line) => line.seat === seat)?.delta ?? 0;
      if (net !== 0) {
        const sign = net > 0 ? '+' : '';
        resultMessage.value += ` Net ${sign}${formatLabQuarksNumber(net)} ${LAB_QUARKS_CURRENCY.name} this hand.`;
      }
    }
    resultMessage.value += wagerLobby.wagerOutcomeSuffix(readWagerQuarksFromState(m.state), outcome);
  } else if (m.practice) {
    resultMessage.value += LAB_GAME_QUARKS_PRACTICE_RESULT_NOTE;
  }
  resultVisible.value = true;
}

async function playAgain(): Promise<void> {
  resultVisible.value = false;
  streetCoachHint.clearUnlock();
  if (lastMatchWasAi.value) {
    await playAi();
    return;
  }
  backToLobby();
  notice.value = 'Start a new invite from the lobby to play again.';
}

function onNewGame(): void {
  backToLobby();
}

function handleMatchReady(payload: GameMatchReadyPayload): void {
  if (payload.appId && payload.appId !== PLATFORM_APP_ID) {
    return;
  }
  pendingOutgoingInviteId.value = null;
  lastMatchWasAi.value = false;
  view.value = 'play';
  void turnMatch.load(payload.matchId);
}

async function applyPendingMatch(pending: GamePendingMatch): Promise<void> {
  if (pending.appId !== PLATFORM_APP_ID || !appServerUrl.value) {
    return;
  }
  clearGamePendingMatch();
  lastMatchWasAi.value = false;
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

onMounted(() => {
  void loadRoster();
  window.addEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
  window.addEventListener('poker-holdem:new-game', onNewGame);
  if (appServerUrl.value) {
    openPendingMatchIfAny();
  }
  if (isAuthenticated.value) {
    comms.connect();
  }
});

onUnmounted(() => {
  window.removeEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
  window.removeEventListener('poker-holdem:new-game', onNewGame);
});

watch(
  () => match.value?.matchId,
  (matchId, prev) => {
    resultModalOnce.onMatchIdChange(matchId, prev);
    if (matchId && matchId !== prev) {
      resultVisible.value = false;
    }
    if (matchId) {
      void loadRoster();
    }
  },
);

watch(
  () => match.value?.status,
  (status, prev) => {
    if (status === 'finished' && prev === 'active') {
      showResultModal();
    }
  },
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
</script>

<template>
  <div
    class="poker-holdem-app app-loaded-container text-lab-general-text w-full min-h-full h-full flex flex-col p-4 gap-4"
    :id="generateUniqueId('poker-holdem-root')"
  >
    <header class="lab-app-header flex items-start justify-between gap-3" :id="generateUniqueId('poker-holdem-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('poker-holdem-title')">Texas Hold'em</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || `Heads-up — ${LAB_QUARKS_CURRENCY.playMoneyDisclaimer}` }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <LabVirtualBankBadge
          v-if="isAuthenticated"
          :balance="virtualBank.balance.value"
          :loading="virtualBank.loading.value"
        />
        <Button
          v-if="view === 'play'"
          label="Back to lobby"
          icon="pi pi-arrow-left"
          size="small"
          severity="secondary"
          :pt="{ root: { attrs: { id: generateUniqueId('poker-holdem-back') } } }"
          @click="backToLobby"
        />
      </div>
    </header>

    <main class="lab-app-body flex-1 min-h-0 flex flex-col gap-4" :id="generateUniqueId('poker-holdem-main')">
      <p v-if="notice" class="text-sm text-lab-general-text-muted m-0" :id="generateUniqueId('poker-holdem-notice')">
        {{ notice }}
      </p>

      <section
        v-if="view === 'lobby'"
        class="flex flex-col gap-4 max-w-md"
        :id="generateUniqueId('poker-holdem-lobby')"
      >
        <GameLobbyModePanel
          v-model:difficulty="difficulty"
          v-model:selected-opponent-id="selectedOpponentId"
          v-model:quarks-wager-enabled="wagerLobby.wagerEnabled"
          v-model:invite-quarks-wager-enabled="wagerLobby.pvpWagerEnabled"
          v-model:invite-quarks-wager-quarks="wagerLobby.pvpWagerQuarks"
          :difficulty-options="difficultyOptions"
          :starting="starting"
          :is-authenticated="isAuthenticated"
          :roster="roster"
          :embed-ai-quarks-wager="isAuthenticated"
          :embed-invite-quarks-wager="isAuthenticated"
          :show-quarks-wager="isAuthenticated"
          :quarks-wager-amount="wagerLobby.lobbyWagerStake"
          :invite-quarks-stake-options="wagerLobby.pvpStakeOptions"
          invite-section-lead="Send a Lab Messages invite; optional frame Quarks wager is separate from in-hand betting."
          ai-section-lead="Heads-up Hold'em with Quarks: blinds post automatically. Call, bet, raise, check, or fold; community cards appear when betting is matched."
          @play-ai="playAi"
          @invite="inviteFriend"
        />
      </section>

      <section v-else class="flex flex-col gap-3 min-h-0 flex-1" :id="generateUniqueId('poker-holdem-play')">
        <GamePracticeQuarksBanner v-if="match?.practice" />
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p class="text-sm m-0" :id="generateUniqueId('poker-holdem-status')">{{ statusLine }}</p>
          <TurnTimerHud
            v-if="match?.status === 'active'"
            :turn-remaining-ms="match.turnRemainingMs ?? 0"
          />
        </div>
        <GameBoardRow show-aside class="flex-1 min-h-0 w-full">
          <PokerBoard
            :hole-cards="holeCards"
            :opponent-label="opponentDisplayName"
            :opponent-hole-count="2"
            :show-opponent-holes="showOpponentHoles"
            :opponent-hole-cards="opponentHoleCards"
            :board-cards="boardCards"
            :pot="pot"
            :to-call="toCall"
            :min-bet="HOLDEM_MIN_BET"
            :min-raise-to="minRaiseTo"
            :legal-actions="legalActions"
            :hand-over="finished || !!state?.completed"
            :disabled="!isMyTurn"
            :on-action="takeAction"
          />
          <template #aside>
            <div
              class="flex flex-row gap-4 min-h-0 flex-1 w-full min-w-0"
              :id="generateUniqueId('poker-holdem-play-aside')"
            >
              <PlayerTurnsPanel
                class="min-h-0 flex-1 basis-0 min-w-0"
                :turns="holdemPlayerTurns"
                :live-turn="agentLiveTurn"
                :waiting-for-opponent="waitingForOpponent"
                :resolving-move="agentResolvingMove"
              />
              <div class="flex flex-col gap-2 min-h-0 flex-1 basis-0 min-w-0">
                <LabGameHintAsideControls
                  v-if="!(finished || state?.completed)"
                  :sku-label="streetCoachAside.skuLabel"
                  :cost-quarks="streetCoachAside.costQuarks"
                  :unlocked="streetCoachAside.unlocked"
                  :loading="streetCoachAside.loading"
                  :disabled="!isAuthenticated || !isMyTurn"
                  :dev-mock-enabled="streetCoachAside.devMockEnabled"
                  @purchase="() => void streetCoachHint.purchaseHint()"
                  @mock-purchase="streetCoachHint.mockPurchaseHint"
                />
                <p
                  v-if="
                    streetCoachOverlayOn &&
                    !(finished || state?.completed) &&
                    !streetCoachCards.length &&
                    isMyTurn
                  "
                  class="m-0 text-xs text-lab-general-text-muted"
                  :id="generateUniqueId('poker-holdem-coach-wait')"
                >
                  Street coach+ appears when your action buttons are live this street.
                </p>
                <HoldemPlayHintsPanel
                  class="min-h-0 flex-1"
                  :legal-actions="legalActions"
                  :to-call="toCall"
                  :min-bet="HOLDEM_MIN_BET"
                  :min-raise-to="minRaiseTo"
                  :pot="pot"
                  :board-length="state?.board?.length ?? 0"
                  :is-my-turn="isMyTurn"
                  :hand-over="finished || !!state?.completed"
                  :opponent-thinking="opponentThinking"
                  :street-coach-hints="streetCoachCards"
                />
              </div>
            </div>
          </template>
        </GameBoardRow>
      </section>
    </main>

    <GameResultModal
      v-model:visible="resultVisible"
      :title="resultTitle"
      :message="resultMessage"
      @lobby="backToLobby"
      @again="playAgain"
    />
  </div>
</template>
