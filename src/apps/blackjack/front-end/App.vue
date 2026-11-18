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
import { detectBlackjackBanterMoment } from '@/shared/game-platform/lab-assistant-banter/detectors';
import { useGameInvites } from '@/shared/game-platform/use-game-invites';
import type { GameDifficulty, MatchView } from '@/shared/game-platform/types';
import { cardToWireCode } from '@/shared/game-platform/ui';
import { BLACKJACK_CONFIG } from '../shared/game-config';
import { BLACKJACK_GAME_IDS } from '../back-end/catalog';
import {
  GameLobbyModePanel,
  GameResultModal,
  GameBoardRow,
  LabVirtualBankBadge,
  GamePracticeQuarksBanner,
  TurnTimerHud,
  PlayerTurnsPanel,
  LabGameHintAsideControls,
} from '@/shared/game-platform/ui';
import { useCatalogMatchGameHint } from '@/shared/game-platform/composables/useCatalogMatchGameHint';
import { useLabGameHintAsideProps } from '@/shared/game-platform/composables/useLabGameHintAsideProps';
import { LAB_GAME_HINT_SKU_BASIC_STRATEGY } from '@/shared/game-platform/lab-game-hints';
import {
  LAB_GAME_QUARKS_PRACTICE_RESULT_NOTE,
} from '@/shared/constants/lab-game-quarks-practice';
import BlackjackTableSurface from './components/BlackjackTableSurface.vue';
import {
  legalActions,
  playerHandViews,
  chooseCompanionMove,
  summarizeMove,
  type BlackjackMove,
  type BlackjackState,
  type PlayerSeat,
} from '../back-end/rules';
import {
  useLabVirtualBank,
  useLabVirtualBankOnMatchFinished,
} from '@/shared/composables/useLabVirtualBank';
import { useCatalogGameWagerLobby } from '@/shared/game-platform/composables/use-catalog-game-wager-lobby';
import {
  matchHasFrameWagerSettlement,
  readWagerQuarksFromState,
} from '@/shared/game-platform/catalog-match-wager';
import { LAB_QUARKS_CURRENCY, formatLabQuarksNumber } from '@/shared/constants/lab-quarks-currency';
import {
  BLACKJACK_LAB_ASSISTANT_TABLEMATE_LABEL,
  BLACKJACK_LAB_ASSISTANT_TABLEMATE_PLAYING,
  BLACKJACK_LAB_ASSISTANT_TABLEMATE_SECTION_LEAD,
} from '@/shared/constants/lab-game-assistant-opponent';
import { displayLabUserName } from '@/shared/utils/lab-comms-ui';
import { useBlackjackTurnPresentation } from './composables/useBlackjackTurnPresentation';
import { useGameMatchResultModalOnce } from '@/shared/game-platform/composables/useGameMatchResultModalOnce';

interface Props {
  serverUrl?: string;
  appDescription?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();

const PLATFORM_APP_ID = BLACKJACK_CONFIG.appId;
const GAME_ID = BLACKJACK_GAME_IDS.BLACKJACK;
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
    const raw = m.state as BlackjackState | undefined;
    if (raw?.twoHandTable && !raw.headsUp) {
      return BLACKJACK_LAB_ASSISTANT_TABLEMATE_LABEL;
    }
    return 'Dealer';
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
  config: BLACKJACK_CONFIG,
  getOpponentDisplayName: () => resolveOpponentDisplayName(turnMatch.match.value, roster.value),
  detectBanterMoment: detectBlackjackBanterMoment,
});

const comms = useLabComms({
  serverUrl: platformUrl,
  isAuthenticated,
  onMatchState: () => {
    /* match state on app socket */
  },
});

const invites = useGameInvites({
  appServerUrl: () => appServerUrl.value,
  platformAppId: PLATFORM_APP_ID,
  config: BLACKJACK_CONFIG,
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

const state = computed<BlackjackState | null>(() => {
  const raw = match.value?.state;
  return raw && typeof raw === 'object' ? (raw as BlackjackState) : null;
});

function blackjackSeatLabel(seat: number): string {
  const m = match.value;
  if (!m) {
    return 'Player';
  }
  if (seat === m.yourSeat) {
    return 'You';
  }
  if (seat === 0) {
    return 'Dealer';
  }
  if (seat === 2) {
    return resolveOpponentDisplayName(m, roster.value);
  }
  return 'Player';
}

const turnPresentation = useBlackjackTurnPresentation({
  match,
  authoritativeState: state,
  resolveSeatLabel: blackjackSeatLabel,
});

const tableState = turnPresentation.displayState;
const blackjackPlayerTurns = turnPresentation.playerTurns;
const dealerRevealBusy = turnPresentation.dealerRevealBusy;

const yourSeat = computed(() => (match.value?.yourSeat ?? 1) as PlayerSeat);
const opponentSeat = computed(() => (yourSeat.value === 1 ? 2 : 1) as PlayerSeat);

const playerHandGroups = computed(() => {
  const s = tableState.value;
  if (!s) {
    return [];
  }
  const views = playerHandViews(s, yourSeat.value);
  return views.map((view, i) => ({
    cards: view.cards.map((c) => cardToWireCode(c)).filter((code): code is string => Boolean(code)),
    total: view.total,
    active: view.active,
    label: views.length > 1 ? `Hand ${i + 1}` : undefined,
  }));
});
const opponentHandGroups = computed(() => {
  const s = tableState.value;
  if (!s?.twoHandTable) {
    return [];
  }
  const views = playerHandViews(s, opponentSeat.value);
  return views.map((view, i) => ({
    cards: view.cards.map((c) => cardToWireCode(c)).filter((code): code is string => Boolean(code)),
    total: view.total,
    active: view.active,
    label: views.length > 1 ? `Hand ${i + 1}` : undefined,
  }));
});
const dealerCards = computed(() =>
  (tableState.value?.dealerHand ?? []).map((c) => cardToWireCode(c)).filter((code): code is string => Boolean(code)),
);

const legal = computed(() => {
  const s = state.value;
  if (!s || dealerRevealBusy.value) {
    return [] as BlackjackMove['type'][];
  }
  return legalActions(s, yourSeat.value);
});

const isMyTurn = computed(() => {
  const m = match.value;
  const s = state.value;
  if (!m || m.status !== 'active' || dealerRevealBusy.value || !s) {
    return false;
  }
  return s.activeSeat === yourSeat.value && !s.seatDone[yourSeat.value];
});

const finished = computed(() => match.value?.status === 'finished');

const basicStrategyHint = useCatalogMatchGameHint({
  hostAppId: PLATFORM_APP_ID,
  skuId: LAB_GAME_HINT_SKU_BASIC_STRATEGY,
  serverUrl: appServerUrl,
  match,
  buildTurnKey: () =>
    `${match.value?.stateRevision ?? 0}:${match.value?.currentSeat ?? 0}:${state.value?.activeHandIndex ?? 0}`,
  onPurchased: () => void virtualBank.refresh(),
});

const basicStrategyAside = useLabGameHintAsideProps(basicStrategyHint);

watch(
  () => match.value?.matchId,
  () => {
    basicStrategyHint.clearUnlock();
  },
);

/** Reveal only after purchase or dev mock — practice still requires a (free) unlock click. */
const basicStrategyRevealOn = computed(() => basicStrategyHint.unlocked.value);

const basicStrategyMove = computed((): BlackjackMove | null => {
  if (!basicStrategyRevealOn.value || finished.value || !state.value) {
    return null;
  }
  if (state.value.activeSeat !== yourSeat.value || state.value.seatDone[yourSeat.value]) {
    return null;
  }
  if (legal.value.length === 0) {
    return null;
  }
  return chooseCompanionMove(state.value, yourSeat.value);
});

const strategyFlashText = computed(() => {
  const move = basicStrategyMove.value;
  if (!move) {
    return null;
  }
  return `Basic strategy: ${summarizeMove(move)}`;
});

const basicStrategyAsideLine = computed(() => {
  const move = basicStrategyMove.value;
  if (!move || !basicStrategyRevealOn.value) {
    return null;
  }
  return `Highlighted: ${summarizeMove(move)} (basic strategy).`;
});

function playerSplitSeat1(): boolean {
  return (state.value?.splitHands?.[yourSeat.value]?.length ?? 0) > 1;
}

/** Vs dealer: net Quarks on your seat (split stacks summed). */
function vsDealerNetQuarks(): number {
  return state.value?.seatDelta?.[yourSeat.value] ?? 0;
}

function vsDealerFinishedOutcome(): MatchOutcome {
  const net = vsDealerNetQuarks();
  if (net > 0) {
    return 'win';
  }
  if (net < 0) {
    return 'loss';
  }
  return 'draw';
}

const statusLine = computed(() => {
  if (!match.value) {
    return 'No match loaded.';
  }
  if (finished.value) {
    if (state.value?.headsUp) {
      const outcome: MatchOutcome = outcomeForMatch(match.value);
      return outcome === 'draw'
        ? 'Push on net Quarks.'
        : outcome === 'win'
          ? 'You won the hand!'
          : 'Your opponent won the hand.';
    }
    const outcome = vsDealerFinishedOutcome();
    if (outcome === 'draw' && playerSplitSeat1()) {
      return 'Split even on net Quarks.';
    }
    return outcome === 'draw' ? 'Push.' : outcome === 'win' ? 'You beat the dealer!' : 'Dealer wins.';
  }
  if (isMyTurn.value) {
    return 'Your turn.';
  }
  if (dealerRevealBusy.value) {
    return 'Dealer is playing…';
  }
  if (match.value?.opponentKind === 'ai' && state.value?.twoHandTable && !state.value.headsUp) {
    return BLACKJACK_LAB_ASSISTANT_TABLEMATE_PLAYING;
  }
  if (match.value?.opponentKind === 'human') {
    return `Waiting for ${opponentDisplayName.value}…`;
  }
  return 'Your turn.';
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
    const { inviteId } = await invites.sendGameInvite(target, GAME_ID, 'Blackjack', {
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

async function takeAction(move: BlackjackMove): Promise<void> {
  if (!isMyTurn.value) {
    return;
  }
  await turnMatch.submitMove(move);
  basicStrategyHint.consumeUnlock();
}

function backToLobby(): void {
  resultVisible.value = false;
  resultModalOnce.clearShown();
  view.value = 'lobby';
  notice.value = null;
  pendingOutgoingInviteId.value = null;
}

function showResultModal(): void {
  const m = match.value;
  if (!m || m.status !== 'finished' || dealerRevealBusy.value) {
    return;
  }
  if (!resultModalOnce.beginShow(m.matchId)) {
    return;
  }
  const showWalletOutcome = matchHasFrameWagerSettlement(m);
  if (state.value?.headsUp) {
    const outcome: MatchOutcome = outcomeForMatch(m);
    resultTitle.value =
      outcome === 'win' ? 'You won!' : outcome === 'draw' ? 'Draw' : 'You lost';
    resultMessage.value = showWalletOutcome
      ? outcome === 'win'
        ? 'Your spot beat the dealer better than your opponent (net Quarks).'
        : outcome === 'loss'
          ? 'Your opponent came out ahead on net Quarks this hand.'
          : 'You and your opponent tied on net Quarks.'
      : outcome === 'win'
        ? 'Your spot beat the dealer better than your opponent.'
        : outcome === 'loss'
          ? 'Your opponent came out ahead this hand.'
          : 'You and your opponent tied this hand.';
  } else {
    const net = vsDealerNetQuarks();
    const splitEven = net === 0 && playerSplitSeat1();
    if (net > 0) {
      resultTitle.value = 'You won!';
      resultMessage.value =
        showWalletOutcome && playerSplitSeat1()
          ? `Net +${formatLabQuarksNumber(net)} ${LAB_QUARKS_CURRENCY.name} after your split hands.`
          : 'Your hand beat the dealer.';
    } else if (net < 0) {
      resultTitle.value = 'You lost';
      resultMessage.value = state.value?.tablemateLossRelief
        ? showWalletOutcome
          ? 'You and your Lab Assistant tablemate both lost — the house only took half your Quarks.'
          : 'You and your Lab Assistant tablemate both lost — the house only took half the table stake.'
        : showWalletOutcome && playerSplitSeat1()
          ? `Net ${formatLabQuarksNumber(net)} ${LAB_QUARKS_CURRENCY.name} after your split hands.`
          : 'The dealer took this hand.';
    } else if (splitEven) {
      resultTitle.value = 'Split even';
      resultMessage.value = showWalletOutcome
        ? 'One hand won and one lost vs the dealer — your net Quarks are unchanged (not a full-table push).'
        : 'One hand won and one lost vs the dealer — net unchanged (not a full-table push).';
    } else {
      resultTitle.value = 'Draw';
      resultMessage.value = 'Push — your wager returned.';
    }
  }
  const frameOutcome: MatchOutcome = state.value?.headsUp
    ? outcomeForMatch(m)
    : vsDealerFinishedOutcome();
  if (showWalletOutcome) {
    resultMessage.value += wagerLobby.wagerOutcomeSuffix(readWagerQuarksFromState(m.state), frameOutcome);
  } else if (m.practice) {
    resultMessage.value += LAB_GAME_QUARKS_PRACTICE_RESULT_NOTE;
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
  window.addEventListener('blackjack:new-game', onNewGame);
  if (appServerUrl.value) {
    openPendingMatchIfAny();
  }
  if (isAuthenticated.value) {
    comms.connect();
  }
});

onUnmounted(() => {
  window.removeEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
  window.removeEventListener('blackjack:new-game', onNewGame);
});

watch(
  () => match.value?.matchId,
  (matchId) => {
    if (matchId) {
      void loadRoster();
    }
  },
);

watch(
  () =>
    [
      match.value?.matchId,
      match.value?.status,
      dealerRevealBusy.value,
    ] as const,
  ([matchId, status, dealerBusy], prev) => {
    resultModalOnce.onMatchIdChange(matchId, prev?.[0]);
    if (matchId && prev?.[0] !== matchId) {
      resultVisible.value = false;
    }
    if (status === 'finished' && !dealerBusy) {
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
    class="blackjack-app app-loaded-container text-lab-general-text w-full min-h-full h-full flex flex-col p-4 gap-4"
    :id="generateUniqueId('blackjack-root')"
  >
    <header class="lab-app-header flex items-start justify-between gap-3" :id="generateUniqueId('blackjack-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('blackjack-title')">Blackjack</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || `You vs the dealer, or heads-up vs a friend — ${LAB_QUARKS_CURRENCY.playMoneyDisclaimer}` }}
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
          :pt="{ root: { attrs: { id: generateUniqueId('blackjack-back') } } }"
          @click="backToLobby"
        />
      </div>
    </header>

    <main class="lab-app-body flex-1 min-h-0 flex flex-col gap-4" :id="generateUniqueId('blackjack-main')">
      <p v-if="notice" class="text-sm text-lab-general-text-muted m-0" :id="generateUniqueId('blackjack-notice')">
        {{ notice }}
      </p>

      <section
        v-if="view === 'lobby'"
        class="flex flex-col gap-4 max-w-md"
        :id="generateUniqueId('blackjack-lobby')"
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
          :ai-section-lead="BLACKJACK_LAB_ASSISTANT_TABLEMATE_SECTION_LEAD"
          invite-section-lead="Heads-up only: invite one friend. Optional frame Quarks wager is separate from table bets."
          @play-ai="playAi"
          @invite="inviteFriend"
        />
      </section>

      <section v-else class="flex flex-col gap-3 min-h-0 flex-1" :id="generateUniqueId('blackjack-play')">
        <GamePracticeQuarksBanner v-if="match?.practice" />
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p class="text-sm m-0" :id="generateUniqueId('blackjack-status')">{{ statusLine }}</p>
          <TurnTimerHud
            v-if="match?.status === 'active'"
            :turn-remaining-ms="match.turnRemainingMs ?? 0"
          />
        </div>
        <GameBoardRow show-aside class="flex-1 min-h-0 w-full">
          <BlackjackTableSurface
            :strategy-flash-text="strategyFlashText"
            :strategy-hint-action="basicStrategyMove?.type ?? null"
            :player-hand-groups="playerHandGroups"
            :opponent-hand-groups="opponentHandGroups"
            :show-opponent-row="!!tableState?.twoHandTable"
            :opponent-label="opponentDisplayName"
            :dealer-cards="dealerCards"
            :dealer-hole-hidden="!!tableState?.dealerHoleHidden"
            :player-total="tableState?.totals?.[yourSeat] ?? 0"
            :dealer-display-total="
              tableState?.dealerHoleHidden
                ? (tableState?.dealerUpTotal ?? 0)
                : (tableState?.dealerTotal ?? 0)
            "
            :bet="tableState?.bet ?? 0"
            :committed="tableState?.committed?.[yourSeat] ?? 0"
            :legal-actions="legal"
            :hand-over="finished || !!tableState?.completed"
            :disabled="!isMyTurn"
            :on-action="takeAction"
          />
          <template #aside>
            <div class="flex flex-col gap-3 min-h-0 flex-1">
              <LabGameHintAsideControls
                v-if="!finished"
                :sku-label="basicStrategyAside.skuLabel"
                :cost-quarks="basicStrategyAside.costQuarks"
                :unlocked="basicStrategyAside.unlocked"
                :loading="basicStrategyAside.loading"
                :disabled="!isAuthenticated || !isMyTurn"
                :dev-mock-enabled="basicStrategyAside.devMockEnabled"
                @purchase="() => void basicStrategyHint.purchaseHint()"
                @mock-purchase="basicStrategyHint.mockPurchaseHint"
              />
              <p
                class="text-xs m-0 shrink-0 transition-opacity duration-200"
                :class="
                  basicStrategyRevealOn && basicStrategyAsideLine ? 'opacity-100' : 'opacity-0'
                "
                :aria-hidden="!(basicStrategyRevealOn && basicStrategyAsideLine)"
              >
                {{ basicStrategyAsideLine ?? '\u00a0' }}
              </p>
              <PlayerTurnsPanel
              class="min-h-0 flex-1"
              :turns="blackjackPlayerTurns"
              :waiting-for-opponent="
                (!isMyTurn && match?.status === 'active') || dealerRevealBusy
              "
              />
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
