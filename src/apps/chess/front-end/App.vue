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
import { detectChessBanterMoment } from '../shared/chess-banter-moments';
import { outcomeForMatch, useTurnBasedMatch, type MatchOutcome } from '@/shared/game-platform/use-turn-based-match';
import { useGameInvites } from '@/shared/game-platform/use-game-invites';
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
import { computeChessQuarksHint } from '../shared/chess-win-block-hint';
import { useCatalogGameWagerLobby } from '@/shared/game-platform/composables/use-catalog-game-wager-lobby';
import { useGameMatchResultModalOnce } from '@/shared/game-platform/composables/useGameMatchResultModalOnce';
import {
  useLabVirtualBank,
  useLabVirtualBankOnMatchFinished,
} from '@/shared/composables/useLabVirtualBank';
import { readWagerQuarksFromState } from '@/shared/game-platform/catalog-match-wager';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { normalizeChessState, chessStatus, chessFinishReasonForSeat, type ChessMatchState, type ChessPiece } from '../shared/chess-rules';
import { CHESS_CONFIG } from '../shared/game-config';
import { CHESS_GAME_IDS } from '../back-end/catalog';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL, GAME_LOBBY_OR_INVITE_FRIEND_TAGLINE } from '@/shared/constants/lab-game-assistant-opponent';
import ChessGame from './games/Chess/ChessGame.vue';
import type { ChessBoardPiece, ChessSquareRef, PromotionChoice } from './games/Chess/types';

/**
 * Chess on the shared game-platform kit.
 *
 * `match.state` holds `{ pieces, turnHistory }` (legacy matches may be a bare piece list).
 * A completed selection submits `{fromRow, fromCol, toRow, toCol}`; legality,
 * check and mate are the server's job.
 */

interface Props {
  serverUrl?: string;
  appDescription?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();

const PLATFORM_APP_ID = CHESS_CONFIG.appId;
const GAME_ID = CHESS_GAME_IDS.CHESS;
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
  config: CHESS_CONFIG,
  getOpponentDisplayName: () => opponentName.value,
  detectBanterMoment: detectChessBanterMoment,
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
  config: CHESS_CONFIG,
  sendEnvelope: comms.sendEnvelope,
});

const match = turnMatch.match;
const matchState = computed(() =>
  normalizeChessState((match.value?.state ?? { pieces: [] }) as ChessMatchState | ChessPiece[]),
);
const pieces = computed<ChessBoardPiece[]>(() => matchState.value.pieces as ChessBoardPiece[]);
const yourSeat = computed(() => match.value?.yourSeat ?? 1);
const yourColor = computed<'white' | 'black'>(() => (yourSeat.value === 1 ? 'white' : 'black'));

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
    `${match.value?.stateRevision ?? 0}:${match.value?.currentSeat ?? 0}:${match.value?.yourSeat ?? 0}`,
  onPurchased: () => void virtualBank.refresh(),
});

const winBlockAside = useLabGameHintAsideProps(winBlockHint);
const {
  showOverlay: winBlockShowOverlay,
  purchaseHint: purchaseWinBlockHint,
  mockPurchaseHint: mockWinBlockHint,
  consumeUnlock: consumeWinBlockHint,
} = winBlockHint;

const quarksHintResult = computed(() => {
  if (!winBlockShowOverlay.value || !isMyTurn.value || finished.value || !yourColor.value) {
    return null;
  }
  return computeChessQuarksHint(pieces.value as ChessPiece[], yourColor.value, {
    yourSeat: yourSeat.value,
    turnHistory: matchState.value.turnHistory,
  });
});

const quarksHintMove = computed(() => {
  const hint = quarksHintResult.value;
  return hint ? { from: hint.from, to: hint.to } : null;
});

const quarksHintAsideLine = computed(() => {
  const hint = quarksHintResult.value;
  if (!hint) {
    return null;
  }
  switch (hint.kind) {
    case 'win':
      return 'Highlighted: checkmate.';
    case 'block-mate':
      return 'Highlighted: blocks opponent mate next ply.';
    case 'block-capture':
      return 'Highlighted: retreat or block — not a capture. The opponent can take on your piece’s square next ply if you stay.';
    case 'capture':
      return 'Highlighted: capture that is not lost to an immediate recapture.';
    default:
      return 'Highlighted: suggested quiet move.';
  }
});

function stalemateFinishedLine(m: NonNullable<typeof match.value>): string {
  const seat = m.currentSeat === 1 || m.currentSeat === 2 ? m.currentSeat : null;
  if (seat == null) {
    return 'Stalemate — draw.';
  }
  const reason = chessFinishReasonForSeat(pieces.value as ChessPiece[], seat);
  if (reason !== 'stalemate') {
    return 'Draw.';
  }
  if (seat === m.yourSeat) {
    return 'Stalemate — you have no legal move and are not in check. Draw.';
  }
  return 'Stalemate — your opponent has no legal move and is not in check. Draw.';
}

function stalemateResultCopy(m: NonNullable<typeof match.value>): { title: string; message: string } {
  const seat = m.currentSeat === 1 || m.currentSeat === 2 ? m.currentSeat : null;
  if (seat == null) {
    return {
      title: 'Draw',
      message: 'This game ended in a draw.',
    };
  }
  const reason = chessFinishReasonForSeat(pieces.value as ChessPiece[], seat);
  if (reason !== 'stalemate') {
    return {
      title: 'Draw',
      message: 'This game ended in a draw.',
    };
  }
  if (seat === m.yourSeat) {
    return {
      title: 'Stalemate — draw',
      message:
        'You have no legal move and your king is not in check. That is stalemate — a draw — even if you were ahead on material.',
    };
  }
  return {
    title: 'Stalemate — draw',
    message:
      'Your opponent has no legal move and is not in check (stalemate). The game is a draw. When you are winning, deliver checkmate or leave them a legal move — freezing the king with no moves still counts as a draw.',
  };
}

const youInCheck = computed(() => {
  if (!isMyTurn.value || finished.value) {
    return false;
  }
  return chessStatus(pieces.value as ChessPiece[], yourColor.value).inCheck;
});

const opponentColor = computed<'white' | 'black'>(() =>
  yourColor.value === 'white' ? 'black' : 'white',
);

const opponentInCheck = computed(() => {
  if (finished.value || !match.value || match.value.status !== 'active') {
    return false;
  }
  const oppSeat = yourSeat.value === 1 ? 2 : 1;
  if (match.value.currentSeat !== oppSeat) {
    return false;
  }
  return chessStatus(pieces.value as ChessPiece[], opponentColor.value).inCheck;
});

const statusLine = computed(() => {
  if (!match.value) {
    return 'No match loaded.';
  }
  if (finished.value) {
    const outcome: MatchOutcome = outcomeForMatch(match.value);
    if (outcome === 'draw') {
      return stalemateFinishedLine(match.value);
    }
    return outcome === 'win' ? 'You win!' : 'You lose.';
  }
  if (turnMatch.agentStreamBusy.value) {
    return `${opponentName.value} is thinking…`;
  }
  if (isMyTurn.value && youInCheck.value) {
    return `Your turn — you are in check (${yourColor.value}).`;
  }
  if (!isMyTurn.value && opponentInCheck.value) {
    return `${opponentName.value} is in check.`;
  }
  return isMyTurn.value
    ? `Your turn — you are ${yourColor.value}.`
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
    const { inviteId } = await invites.sendGameInvite(target, GAME_ID, 'Chess', wagerLobby.pvpInviteRules());
    pendingOutgoingInviteId.value = inviteId;
    notice.value = 'Invite sent — the match opens when they accept.';
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Invite failed.';
  } finally {
    starting.value = false;
  }
}

async function makeMove(
  from: ChessSquareRef,
  to: ChessSquareRef,
  promotion?: PromotionChoice,
): Promise<void> {
  if (!isMyTurn.value) {
    return;
  }
  await turnMatch.submitMove({
    fromRow: from.row,
    fromCol: from.col,
    toRow: to.row,
    toCol: to.col,
    ...(promotion ? { promotion } : {}),
  });
  consumeWinBlockHint();
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
  if (outcome === 'win') {
    resultTitle.value = 'You won!';
    resultMessage.value = `Checkmate — you win this game.${wagerSuffix}`;
  } else if (outcome === 'loss') {
    resultTitle.value = 'You lost';
    resultMessage.value = `Checkmate — your opponent wins this game.${wagerSuffix}`;
  } else {
    const drawCopy = stalemateResultCopy(m);
    resultTitle.value = drawCopy.title;
    resultMessage.value = `${drawCopy.message}${wagerSuffix}`;
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
  window.addEventListener('chess:new-game', onNewGame);
  if (appServerUrl.value) {
    openPendingMatchIfAny();
  }
  if (isAuthenticated.value) {
    comms.connect();
  }
});

onUnmounted(() => {
  window.removeEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
  window.removeEventListener('chess:new-game', onNewGame);
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
    class="chess-app app-loaded-container text-lab-general-text w-full min-h-full h-full flex flex-col p-4 gap-4"
    :id="generateUniqueId('chess-root')"
  >
    <header class="lab-app-header flex items-start justify-between gap-3" :id="generateUniqueId('chess-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('chess-title')">Chess</h1>
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
          :pt="{ root: { attrs: { id: generateUniqueId('chess-back') } } }"
          @click="backToLobby"
        />
      </div>
    </header>

    <main class="lab-app-body flex-1 min-h-0 flex flex-col gap-4" :id="generateUniqueId('chess-main')">
      <p v-if="notice" class="text-sm text-lab-general-text-muted m-0" :id="generateUniqueId('chess-notice')">
        {{ notice }}
      </p>

      <section
        v-if="view === 'lobby'"
        class="flex flex-col gap-4"
        :id="generateUniqueId('chess-lobby')"
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
          ai-section-lead="Standard chess — drag or click to move. Promotion dialog appears when a pawn reaches the back rank."
          @play-ai="playAi"
          @invite="inviteFriend"
        />
      </section>

      <section v-else class="flex flex-col gap-3 min-h-0 flex-1" :id="generateUniqueId('chess-play')">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p class="text-sm m-0" :id="generateUniqueId('chess-status')">{{ statusLine }}</p>
          <TurnTimerHud
            v-if="match?.status === 'active'"
            :turn-remaining-ms="match.turnRemainingMs ?? 0"
          />
        </div>
        <GameBoardRow show-aside class="flex-1 min-h-0">
          <ChessGame
            :pieces="pieces"
            :your-color="yourColor"
            :you-in-check="youInCheck"
            :opponent-in-check="opponentInCheck"
            :disabled="!isMyTurn || finished"
            :quarks-hint="quarksHintMove"
            :on-move="makeMove"
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
                @purchase="() => void purchaseWinBlockHint()"
                @mock-purchase="mockWinBlockHint"
              />
              <p
                v-if="winBlockShowOverlay && isMyTurn && quarksHintAsideLine"
                class="m-0 text-xs font-semibold text-lab-general-text"
                :id="generateUniqueId('chess-hint-summary')"
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
