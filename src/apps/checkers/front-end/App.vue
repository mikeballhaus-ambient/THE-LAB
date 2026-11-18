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
import { detectCheckersBanterMoment } from '@/shared/game-platform/lab-assistant-banter/detectors';
import {
  GameBoardRow,
  PlayerTurnsPanel,
  TurnTimerHud,
  GameLobbyModePanel,
  GameResultModal,
  LabVirtualBankBadge,
  LabGameHintAsideControls,
  type PlayerTurn,
} from '@/shared/game-platform/ui';
import { useCatalogMatchGameHint } from '@/shared/game-platform/composables/useCatalogMatchGameHint';
import { useLabGameHintAsideProps } from '@/shared/game-platform/composables/useLabGameHintAsideProps';
import { LAB_GAME_HINT_SKU_WIN_BLOCK } from '@/shared/game-platform/lab-game-hints';
import { computeCheckersQuarksHint, pieceById } from '../shared/checkers-win-block-hint';
import type { CheckersPiece, CheckersState as RulesCheckersState } from '../shared/checkers-rules';
import { useCatalogGameWagerLobby } from '@/shared/game-platform/composables/use-catalog-game-wager-lobby';
import { useGameMatchResultModalOnce } from '@/shared/game-platform/composables/useGameMatchResultModalOnce';
import {
  useLabVirtualBank,
  useLabVirtualBankOnMatchFinished,
} from '@/shared/composables/useLabVirtualBank';
import { readWagerQuarksFromState } from '@/shared/game-platform/catalog-match-wager';
import { useGameInvites } from '@/shared/game-platform/use-game-invites';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { CHECKERS_CONFIG } from '../shared/game-config';
import { CHECKERS_GAME_IDS } from '../back-end/catalog';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL, GAME_LOBBY_OR_INVITE_FRIEND_TAGLINE } from '@/shared/constants/lab-game-assistant-opponent';
import CheckersGame from './games/Checkers/CheckersGame.vue';
import type { BoardPiece } from './games/Checkers/types';

/**
 * Checkers on the shared game-platform kit.
 *
 * The board is a pure renderer: pieces come from `match.state`, and a completed
 * drag submits `{type:'move', pieceId, toRow, toCol}`. Kings and promotion are enforced by the server adapter.
 */

interface Props {
  serverUrl?: string;
  appDescription?: string;
}

interface CheckersMatchState {
  pieces?: BoardPiece[];
  currentSeat?: number;
  winnerSeat?: number | null;
  finished?: boolean;
  jumpChainPieceId?: number | null;
  moveCount?: number;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();

const PLATFORM_APP_ID = CHECKERS_CONFIG.appId;
const GAME_ID = CHECKERS_GAME_IDS.CHECKERS;
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
  config: CHECKERS_CONFIG,
  getOpponentDisplayName: () => opponentName.value,
  detectBanterMoment: detectCheckersBanterMoment,
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
  config: CHECKERS_CONFIG,
  sendEnvelope: comms.sendEnvelope,
});

const match = turnMatch.match;
const state = computed<CheckersMatchState>(() => (match.value?.state as CheckersMatchState) ?? {});
const pieces = computed<BoardPiece[]>(() => state.value.pieces ?? []);
const yourSeat = computed(() => match.value?.yourSeat ?? 1);
const currentSeat = computed(() => match.value?.currentSeat ?? 1);

const isMyTurn = computed(
  () =>
    !!match.value &&
    match.value.status === 'active' &&
    match.value.currentSeat === match.value.yourSeat,
);
const finished = computed(() => match.value?.status === 'finished');

const winBlockHint = useCatalogMatchGameHint({
  hostAppId: PLATFORM_APP_ID,
  skuId: LAB_GAME_HINT_SKU_WIN_BLOCK,
  serverUrl: appServerUrl,
  match,
  buildTurnKey: () =>
    `${match.value?.stateRevision ?? 0}:${match.value?.currentSeat ?? 0}:${state.value.jumpChainPieceId ?? 0}`,
  onPurchased: () => void virtualBank.refresh(),
});

const winBlockAside = useLabGameHintAsideProps(winBlockHint);

const checkersRulesState = computed((): RulesCheckersState => ({
  pieces: pieces.value as CheckersPiece[],
  currentSeat: (currentSeat.value === 2 ? 2 : 1) as 1 | 2,
  winnerSeat: state.value.winnerSeat ?? null,
  finished: state.value.finished ?? false,
  moveCount: state.value.moveCount ?? 0,
  jumpChainPieceId: state.value.jumpChainPieceId ?? null,
}));

const quarksHintResult = computed(() => {
  if (!winBlockHint.showOverlay.value || !isMyTurn.value || finished.value) {
    return null;
  }
  return computeCheckersQuarksHint(checkersRulesState.value);
});

const quarksHintMove = computed(() => {
  const hint = quarksHintResult.value;
  if (!hint) {
    return null;
  }
  const piece = pieceById(checkersRulesState.value, hint.move.pieceId);
  if (!piece) {
    return null;
  }
  return {
    from: { row: piece.row, col: piece.col },
    to: { row: hint.move.toRow, col: hint.move.toCol },
    chainLandings: hint.chainLandings,
    chainCaptureCount: hint.chainCaptureCount,
  };
});

const quarksHintAsideLine = computed(() => {
  const hint = quarksHintResult.value;
  if (!hint) {
    return null;
  }
  switch (hint.kind) {
    case 'win':
      return 'Highlighted: winning jump.';
    case 'block':
      return 'Highlighted: blocks an opponent win next ply.';
    case 'block-capture':
      return 'Highlighted: blocks or avoids an opponent jump next ply.';
    case 'capture':
      return hint.chainCaptureCount != null && hint.chainCaptureCount > 1
        ? `Highlighted: jump chain — ${hint.chainCaptureCount} captures; land on each marked square with the same piece.`
        : 'Highlighted: legal jump (capture).';
    default:
      return 'Highlighted: suggested quiet move (no jump available).';
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
  return isMyTurn.value
    ? state.value.jumpChainPieceId != null
      ? `Keep jumping with piece ${state.value.jumpChainPieceId}.`
      : 'Your turn — drag a piece.'
    : `${opponentName.value}'s turn.`;
});

const agentLiveTurn = computed<PlayerTurn | null>(() => {
  if (!turnMatch.agentStreamBusy.value || !match.value) {
    return null;
  }
  const m = match.value;
  const aiSeat = m.yourSeat === 1 ? 2 : 1;
  const snippet = turnMatch.agentStreamText.value.trim();
  return {
    id: `${m.matchId}-live`,
    seat: aiSeat,
    playerLabel: opponentName.value,
    isYou: false,
    summary: snippet || '…',
    streaming: true,
  };
});

const playerTurnsFeed = computed(() => turnMatch.playerTurns.value);
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
    const { inviteId } = await invites.sendGameInvite(target, GAME_ID, 'Checkers', wagerLobby.pvpInviteRules());
    pendingOutgoingInviteId.value = inviteId;
    notice.value = 'Invite sent — the match opens when they accept.';
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Invite failed.';
  } finally {
    starting.value = false;
  }
}

async function movePiece(pieceId: number, toRow: number, toCol: number): Promise<void> {
  if (!isMyTurn.value) {
    return;
  }
  await turnMatch.submitMove({ type: 'move', pieceId, toRow, toCol });
  winBlockHint.consumeUnlock();
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
  if (outcome === 'win') {
    resultMessage.value = `You captured all of your opponent’s pieces.${wagerSuffix}`;
  } else if (outcome === 'loss') {
    resultMessage.value = `Your opponent captured all of your pieces.${wagerSuffix}`;
  } else {
    resultMessage.value = `This game ended in a draw.${wagerSuffix}`;
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
  window.addEventListener('checkers:new-game', onNewGame);
  if (appServerUrl.value) {
    openPendingMatchIfAny();
  }
  if (isAuthenticated.value) {
    comms.connect();
  }
});

onUnmounted(() => {
  window.removeEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
  window.removeEventListener('checkers:new-game', onNewGame);
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
    class="checkers-app app-loaded-container text-lab-general-text w-full min-h-full h-full flex flex-col p-4 gap-4"
    :id="generateUniqueId('checkers-root')"
  >
    <header class="lab-app-header flex items-start justify-between gap-3" :id="generateUniqueId('checkers-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('checkers-title')">Checkers</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || `Diagonal moves and optional jumps. ${GAME_LOBBY_OR_INVITE_FRIEND_TAGLINE}` }}
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
          :pt="{ root: { attrs: { id: generateUniqueId('checkers-back') } } }"
          @click="backToLobby"
        />
      </div>
    </header>

    <main class="lab-app-body flex-1 min-h-0 flex flex-col gap-4" :id="generateUniqueId('checkers-main')">
      <p v-if="notice" class="text-sm text-lab-general-text-muted m-0" :id="generateUniqueId('checkers-notice')">
        {{ notice }}
      </p>

      <section
        v-if="view === 'lobby'"
        class="flex flex-col gap-4"
        :id="generateUniqueId('checkers-lobby')"
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
          ai-section-lead="Diagonal moves and kinging. Jump when captures are available — the server enforces legal moves."
          @play-ai="playAi"
          @invite="inviteFriend"
        />
      </section>

      <section v-else class="flex flex-col gap-3 min-h-0 flex-1" :id="generateUniqueId('checkers-play')">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p class="text-sm m-0" :id="generateUniqueId('checkers-status')">{{ statusLine }}</p>
          <TurnTimerHud
            v-if="match?.status === 'active'"
            :turn-remaining-ms="match.turnRemainingMs ?? 0"
          />
        </div>
        <GameBoardRow show-aside class="flex-1 min-h-0">
          <CheckersGame
            :pieces="pieces"
            :your-seat="yourSeat"
            :current-seat="currentSeat"
            :jump-chain-piece-id="state.jumpChainPieceId ?? null"
            :disabled="!isMyTurn || finished"
            :quarks-hint="quarksHintMove"
            :on-move="movePiece"
          />
          <template #aside>
            <div class="flex flex-col gap-3 min-h-0 flex-1">
              <LabGameHintAsideControls
                v-if="!finished"
                :sku-label="winBlockAside.skuLabel"
                :cost-quarks="winBlockAside.costQuarks"
                :unlocked="winBlockAside.unlocked"
                :loading="winBlockAside.loading"
                :disabled="!isAuthenticated || !isMyTurn"
                :dev-mock-enabled="winBlockAside.devMockEnabled"
                @purchase="() => void winBlockHint.purchaseHint()"
                @mock-purchase="winBlockHint.mockPurchaseHint"
              />
              <p
                v-if="winBlockHint.showOverlay.value && isMyTurn && quarksHintAsideLine"
                class="m-0 text-xs font-semibold text-lab-general-text"
                :id="generateUniqueId('checkers-hint-summary')"
              >
                {{ quarksHintAsideLine }}
              </p>
              <PlayerTurnsPanel
              class="min-h-0 flex-1"
              :turns="playerTurnsFeed"
              :live-turn="agentLiveTurn"
              :waiting-for-opponent="waitingForOpponent"
              :resolving-move="agentResolvingMove"
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
