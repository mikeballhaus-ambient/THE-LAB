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
import { detectConnectFourBanterMoment } from '@/shared/game-platform/lab-assistant-banter/detectors';
import {
  TurnTimerHud,
  GameLobbyModePanel,
  GameResultModal,
  LabVirtualBankBadge,
  LabGameHintAsideControls,
  GameBoardRow,
} from '@/shared/game-platform/ui';
import { useCatalogMatchGameHint } from '@/shared/game-platform/composables/useCatalogMatchGameHint';
import { useLabGameHintAsideProps } from '@/shared/game-platform/composables/useLabGameHintAsideProps';
import {
  LAB_GAME_HINT_SKU_THREAT_COLUMN,
} from '@/shared/game-platform/lab-game-hints';
import { computeConnectFourThreatHint } from '../shared/connect-four-threat-hint';
import type { ConnectFourState } from '../back-end/rules';
import { useCatalogGameWagerLobby } from '@/shared/game-platform/composables/use-catalog-game-wager-lobby';
import { useGameMatchResultModalOnce } from '@/shared/game-platform/composables/useGameMatchResultModalOnce';
import {
  useLabVirtualBank,
  useLabVirtualBankOnMatchFinished,
} from '@/shared/composables/useLabVirtualBank';
import { readWagerQuarksFromState } from '@/shared/game-platform/catalog-match-wager';
import { useGameInvites } from '@/shared/game-platform/use-game-invites';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { CONNECT_FOUR_CONFIG } from '../shared/game-config';
import { CONNECT_FOUR_GAME_IDS } from '../back-end/catalog';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL, GAME_LOBBY_OR_INVITE_FRIEND_TAGLINE } from '@/shared/constants/lab-game-assistant-opponent';
import GameBoard from './components/GameBoard.vue';

/**
 * Connect Four on the shared game-platform kit.
 *
 * Lobby → difficulty → `useTurnBasedMatch`. The board renders `match.state` and
 * every drop goes through `submitMove`; gravity and win detection live on the
 * server, so this file has no rules.
 */

interface Props {
  serverUrl?: string;
  appDescription?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();

const PLATFORM_APP_ID = CONNECT_FOUR_CONFIG.appId;
const GAME_ID = CONNECT_FOUR_GAME_IDS.CONNECT_FOUR;
const platformUrl = `${import.meta.env.VITE_API_BASE_URL}:${import.meta.env.VITE_API_BASE_PORT}`;
const appServerUrl = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));
const isAuthenticated = ref(Boolean(getLabSessionId()));

const view = ref<'lobby' | 'play'>('lobby');
const difficulty = ref<GameDifficulty>('medium');
const wagerLobby = useCatalogGameWagerLobby(difficulty);
const starting = ref(false);
const notice = ref<string | null>(null);
const opponentName = ref('Opponent');
const roster = ref<User[]>([]);
const selectedOpponentId = ref<number | null>(null);
const pendingOutgoingInviteId = ref<string | null>(null);
const resultVisible = ref(false);
const resultTitle = ref('');
const resultMessage = ref('');
const resultModalOnce = useGameMatchResultModalOnce();
const lastMatchWasAi = ref(false);

const turnMatch = useTurnBasedMatch({
  serverUrl: () => appServerUrl.value,
  config: CONNECT_FOUR_CONFIG,
  getOpponentDisplayName: () => opponentName.value,
  detectBanterMoment: detectConnectFourBanterMoment,
});

const virtualBank = useLabVirtualBank({ serverUrl: () => appServerUrl.value });
useLabVirtualBankOnMatchFinished(
  virtualBank,
  computed(() => turnMatch.match.value?.status),
);

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
  config: CONNECT_FOUR_CONFIG,
  sendEnvelope: comms.sendEnvelope,
});

const match = turnMatch.match;
const isMyTurn = computed(
  () =>
    !!match.value &&
    match.value.status === 'active' &&
    match.value.currentSeat === match.value.yourSeat,
);
const board = computed<(1 | 2 | null)[][]>(() => {
  const state = match.value?.state as { board?: (1 | 2 | null)[][] } | null;
  return state?.board ?? Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => null));
});
const yourSeat = computed(() => match.value?.yourSeat);
const finished = computed(() => match.value?.status === 'finished');

const threatHint = useCatalogMatchGameHint({
  hostAppId: PLATFORM_APP_ID,
  skuId: LAB_GAME_HINT_SKU_THREAT_COLUMN,
  serverUrl: appServerUrl,
  match,
  buildTurnKey: () =>
    `${match.value?.stateRevision ?? 0}:${match.value?.currentSeat ?? 0}`,
  onPurchased: () => void virtualBank.refresh(),
});

const threatAside = useLabGameHintAsideProps(threatHint);

const connectFourRulesState = computed((): ConnectFourState => {
  const raw = match.value?.state as ConnectFourState | undefined;
  return {
    board: board.value,
    currentSeat: (match.value?.currentSeat === 2 ? 2 : 1) as 1 | 2,
    winnerSeat: raw?.winnerSeat ?? null,
    finished: raw?.finished ?? finished.value,
    moveCount: raw?.moveCount ?? 0,
  };
});

const quarksHintResult = computed(() => {
  if (!threatHint.showOverlay.value || !isMyTurn.value || finished.value) {
    return null;
  }
  const m = match.value;
  const seat = (m?.yourSeat === 2 ? 2 : 1) as 1 | 2;
  return computeConnectFourThreatHint({
    ...connectFourRulesState.value,
    currentSeat: seat,
  });
});

const quarksHintColumn = computed(() => quarksHintResult.value?.col ?? null);

const quarksHintAsideLine = computed(() => {
  const hint = quarksHintResult.value;
  if (!hint) {
    return null;
  }
  switch (hint.kind) {
    case 'win':
      return `Highlighted: drop column ${hint.col} to win next ply.`;
    case 'block':
      return `Highlighted: drop column ${hint.col} to block opponent win.`;
    default:
      return `Highlighted: column ${hint.col} — no instant win/block; safer toward the center.`;
  }
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
    return `${opponentName.value} is thinking…`;
  }
  return isMyTurn.value ? 'Your turn.' : `${opponentName.value}'s turn.`;
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
  opponentName.value = LAB_ASSISTANT_GAME_OPPONENT_LABEL;
  lastMatchWasAi.value = true;
  try {
    await turnMatch.createAiMatch(GAME_ID, difficulty.value, wagerLobby.aiCreateRules());
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
    const { inviteId } = await invites.sendGameInvite(target, GAME_ID, 'Connect Four', wagerLobby.pvpInviteRules());
    pendingOutgoingInviteId.value = inviteId;
    notice.value = 'Invite sent — the match opens when they accept.';
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Invite failed.';
  } finally {
    starting.value = false;
  }
}

async function dropAt(col: number): Promise<void> {
  if (!isMyTurn.value) {
    return;
  }
  await turnMatch.submitMove({ type: 'drop', col });
  threatHint.consumeUnlock();
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
  const wagerSuffix = wagerLobby.wagerOutcomeSuffix(readWagerQuarksFromState(m.state), outcome);
  resultTitle.value =
    outcome === 'win' ? 'You won!' : outcome === 'draw' ? 'Draw' : 'You lost';
  const moves = (m.state as { moveCount?: number })?.moveCount;
  const moveNote = moves != null && moves > 0 ? ` ${moves} moves played.` : '';
  if (outcome === 'win') {
    resultMessage.value = `You connected four in a row.${moveNote}${wagerSuffix}`;
  } else if (outcome === 'loss') {
    resultMessage.value = `Your opponent connected four first.${moveNote}${wagerSuffix}`;
  } else {
    resultMessage.value = `The board filled with no winner.${moveNote}${wagerSuffix}`;
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
  opponentName.value = 'Opponent';
  lastMatchWasAi.value = false;
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
  window.addEventListener('connect-four:new-game', onNewGame);
  if (appServerUrl.value) {
    openPendingMatchIfAny();
  }
  if (isAuthenticated.value) {
    comms.connect();
  }
});

onUnmounted(() => {
  window.removeEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
  window.removeEventListener('connect-four:new-game', onNewGame);
});

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
    class="connect-four-app app-loaded-container text-lab-general-text w-full min-h-full h-full flex flex-col p-4 gap-4"
    :id="generateUniqueId('connect-four-root')"
  >
    <header class="lab-app-header flex items-start justify-between gap-3" :id="generateUniqueId('connect-four-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('connect-four-title')">Connect Four</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || GAME_LOBBY_OR_INVITE_FRIEND_TAGLINE }}
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
          :pt="{ root: { attrs: { id: generateUniqueId('connect-four-back') } } }"
          @click="backToLobby"
        />
      </div>
    </header>

    <main class="lab-app-body flex-1 min-h-0 flex flex-col gap-4" :id="generateUniqueId('connect-four-main')">
      <p v-if="notice" class="text-sm text-lab-general-text-muted m-0" :id="generateUniqueId('connect-four-notice')">
        {{ notice }}
      </p>

      <section
        v-if="view === 'lobby'"
        class="flex flex-col gap-4"
        :id="generateUniqueId('connect-four-lobby')"
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
          ai-section-lead="Drop discs into columns 0–6; four in a row wins. Gravity fills from the bottom."
          @play-ai="playAi"
          @invite="inviteFriend"
        />
      </section>

      <section v-else class="flex flex-col gap-3 min-h-0 flex-1" :id="generateUniqueId('connect-four-play')">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p class="text-sm m-0 font-medium" :id="generateUniqueId('connect-four-status')">{{ statusLine }}</p>
          <TurnTimerHud
            v-if="match?.status === 'active'"
            :turn-remaining-ms="match.turnRemainingMs ?? 0"
          />
        </div>
        <GameBoardRow show-aside class="flex-1 min-h-0 w-full">
          <GameBoard
            :board="board"
            :your-seat="yourSeat ?? 1"
            :hint-column="quarksHintColumn"
            :disabled="!isMyTurn || finished"
            :on-drop="dropAt"
          />
          <template #aside>
            <div
              v-if="!finished"
              class="flex min-h-0 w-full max-w-xs flex-col gap-3"
              :id="generateUniqueId('connect-four-hint-aside')"
            >
              <LabGameHintAsideControls
                :sku-label="threatAside.skuLabel"
                :cost-quarks="threatAside.costQuarks"
                :unlocked="threatAside.unlocked"
                :loading="threatAside.loading"
                :disabled="!isAuthenticated || !isMyTurn"
                :dev-mock-enabled="threatAside.devMockEnabled"
                @purchase="() => void threatHint.purchaseHint()"
                @mock-purchase="threatHint.mockPurchaseHint"
              />
              <p
                v-show="isMyTurn"
                class="m-0 min-h-[2.75rem] text-xs font-semibold text-lab-general-text"
                :class="
                  threatHint.showOverlay.value && quarksHintAsideLine
                    ? 'opacity-100'
                    : 'opacity-0'
                "
                :aria-hidden="!(threatHint.showOverlay.value && quarksHintAsideLine)"
              >
                {{ quarksHintAsideLine ?? '\u00a0' }}
              </p>
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
