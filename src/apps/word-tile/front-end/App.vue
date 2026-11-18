<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useLabComms } from '@/shared/composables/useLabComms';
import { fetchActivePlatformUsersForClient } from '@/shared/services/platform-user-client';
import { displayLabUserName } from '@/shared/utils/lab-comms-ui';
import { getLabSessionId } from '@/shared/composables/useLabPlatformAuth';
import type { GameDifficulty } from '@/shared/game-platform/types';
import {
  useLabVirtualBank,
  useLabVirtualBankOnMatchFinished,
} from '@/shared/composables/useLabVirtualBank';
import { useCatalogGameWagerLobby } from '@/shared/game-platform/composables/use-catalog-game-wager-lobby';
import { useGameMatchResultModalOnce } from '@/shared/game-platform/composables/useGameMatchResultModalOnce';
import { readWagerQuarksFromState } from '@/shared/game-platform/catalog-match-wager';
import type { User } from '@/shared/types/user';
import { LAB_COMMS_EVENTS } from '@/shared/types';
import {
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE,
  LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY,
  type GameInviteDeclinePayload,
  type GameMatchReadyPayload,
} from '@/shared/types/lab-comms-game-invite';
import {
  clearGamePendingMatch,
  readGamePendingMatch,
  GAME_PENDING_MATCH_EVENT,
  type GamePendingMatch,
} from '@/shared/config/game-pending-match';
import { WORD_TILE_GAME_IDS } from '../shared/types';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL } from '@/shared/constants/lab-game-assistant-opponent';
import { useGameCatalog } from './composables/useGameCatalog';
import { outcomeForMatch, useTurnBasedMatch, type MatchView } from './composables/useTurnBasedMatch';
import { useWordTileInvites } from './composables/useWordTileInvites';
import {
  GameLobbyModePanel,
  GamePlayShell,
  GameResultModal,
  LabVirtualBankBadge,
} from '@/shared/game-platform/ui';
import TileWordGridGame from './games/tile-word-grid/TileWordGridGame.vue';


const WORD_TILE_APP_ID = 'app-word-tile';

interface Props {
  serverUrl?: string;
  /** Registry app description (injected by AppLifecycle). */
  appDescription?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const platformUrl = `${import.meta.env.VITE_API_BASE_URL}:${import.meta.env.VITE_API_BASE_PORT}`;
const appServerUrl = computed(() => props.serverUrl?.replace(/\/$/, '') ?? '');
const isAuthenticated = ref(Boolean(getLabSessionId()));

const view = ref<'lobby' | 'play'>('lobby');
const activeGameId = ref<string | null>(null);
const roster = ref<User[]>([]);
const difficulty = ref<GameDifficulty>('medium');
const wagerLobby = useCatalogGameWagerLobby(difficulty);
const starting = ref(false);
const notice = ref<string | null>(null);
const selectedOpponentId = ref<number | null>(null);
const pendingOutgoingInviteId = ref<string | null>(null);

const resultVisible = ref(false);
const resultTitle = ref('');
const resultMessage = ref('');
const resultPersonalBest = ref(false);
const resultModalOnce = useGameMatchResultModalOnce();
const lastMatchWasAi = ref(false);
const queuedPendingMatch = ref<GamePendingMatch | null>(null);
const openingPendingMatch = ref(false);

const difficultyOptions: ReadonlyArray<{ label: string; value: GameDifficulty }> = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
  { label: 'Boss', value: 'boss' },
];

const { games, loading, error: catalogError, refresh } = useGameCatalog(appServerUrl);
const turnMatch = useTurnBasedMatch(() => appServerUrl.value || 'http://localhost:3014', {
  getOpponentDisplayName: () => opponentDisplayName.value,
});
const {
  playerTurns,
  livePlayerTurn,
  waitingForOpponent,
  agentResolvingMove,
} = turnMatch;

const comms = useLabComms({
  serverUrl: platformUrl,
  isAuthenticated,
  onMatchState: (payload) => {
    turnMatch.applyMatchFromSocket(payload.match as unknown as MatchView);
  },
});

const invites = useWordTileInvites(() => appServerUrl.value, comms.sendEnvelope);

const virtualBank = useLabVirtualBank({ serverUrl: () => appServerUrl.value });
useLabVirtualBankOnMatchFinished(
  virtualBank,
  computed(() => turnMatch.match.value?.status),
);

function handleMatchReady(payload: GameMatchReadyPayload): void {
  if (payload.appId && payload.appId !== WORD_TILE_APP_ID) {
    return;
  }
  pendingOutgoingInviteId.value = null;
  activeGameId.value = payload.gameId;
  lastMatchWasAi.value = false;
  view.value = 'play';
  void turnMatch.load(payload.matchId);
}

async function applyPendingMatch(pending: GamePendingMatch): Promise<void> {
  if (pending.appId !== WORD_TILE_APP_ID) {
    return;
  }
  if (openingPendingMatch.value) {
    return;
  }
  if (!appServerUrl.value) {
    queuedPendingMatch.value = pending;
    return;
  }
  openingPendingMatch.value = true;
  clearGamePendingMatch();
  try {
    if (games.value.length === 0) {
      await refresh();
    }
    activeGameId.value = pending.gameId;
    lastMatchWasAi.value = false;
    view.value = 'play';
    await turnMatch.load(pending.matchId);
  } finally {
    openingPendingMatch.value = false;
  }
}

function openPendingMatchIfAny(): void {
  const pending = readGamePendingMatch();
  if (pending && pending.appId !== WORD_TILE_APP_ID) {
    return;
  }
  if (!pending) {
    return;
  }
  void applyPendingMatch(pending);
}

function onPendingMatchSaved(event: Event): void {
  const detail = (event as CustomEvent<GamePendingMatch>).detail;
  const pending =
    detail?.matchId && detail?.gameId && detail?.appId === WORD_TILE_APP_ID
      ? detail
      : readGamePendingMatch();
  if (pending && pending.appId !== WORD_TILE_APP_ID) {
    return;
  }
  if (!pending) {
    return;
  }
  void applyPendingMatch(pending);
}

function handleInviteDeclineEnvelope(payload: GameInviteDeclinePayload): void {
  if (pendingOutgoingInviteId.value !== payload.inviteId) {
    return;
  }
  pendingOutgoingInviteId.value = null;
}

onMounted(async () => {
  window.addEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
  if (appServerUrl.value) {
    await refresh();
    openPendingMatchIfAny();
  }
  try {
    roster.value = await fetchActivePlatformUsersForClient();
  } catch {
    roster.value = [];
  }
  if (isAuthenticated.value) {
    comms.connect();
  }
});

onUnmounted(() => {
  window.removeEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
});

watch(
  () => comms.socket.value,
  (sock, prev) => {
    prev?.off(LAB_COMMS_EVENTS.MESSAGE);
    sock?.on(LAB_COMMS_EVENTS.MESSAGE, (envelope) => {
      if (envelope.type === LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY) {
        handleMatchReady(envelope.payload as GameMatchReadyPayload);
      }
      if (envelope.type === LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE) {
        handleInviteDeclineEnvelope(envelope.payload as GameInviteDeclinePayload);
      }
    });
  },
);

watch(appServerUrl, (url) => {
  if (!url) {
    return;
  }
  turnMatch.ensureSocket();
  void refresh().then(() => {
    openPendingMatchIfAny();
    if (queuedPendingMatch.value) {
      const queued = queuedPendingMatch.value;
      queuedPendingMatch.value = null;
      void applyPendingMatch(queued);
    }
  });
});

watch(
  games,
  (list) => {
    if (list.length === 0 || activeGameId.value) {
      return;
    }
    activeGameId.value =
      list.find((g) => g.id === WORD_TILE_GAME_IDS.TILE_WORD_GRID)?.id ?? list[0]!.id;
  },
  { immediate: true },
);

const activeGameMeta = computed(() => games.value.find((g) => g.id === activeGameId.value));

async function refreshInviteRoster(): Promise<void> {
  try {
    roster.value = await fetchActivePlatformUsersForClient();
  } catch {
    roster.value = [];
  }
  comms.requestChannels();
}

function backToLobby(): void {
  resultModalOnce.clearShown();
  resultVisible.value = false;
  pendingOutgoingInviteId.value = null;
  view.value = 'lobby';
  void refresh();
}

async function playAi(): Promise<void> {
  if (!activeGameId.value || !appServerUrl.value || starting.value) {
    return;
  }
  starting.value = true;
  notice.value = null;
  lastMatchWasAi.value = true;
  try {
    await turnMatch.createAiMatch(activeGameId.value, difficulty.value, wagerLobby.aiCreateRules());
    view.value = 'play';
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Could not start a match.';
  } finally {
    starting.value = false;
  }
}

async function inviteFriend(): Promise<void> {
  const target = selectedOpponentId.value;
  if (!activeGameId.value || !appServerUrl.value || !target) {
    notice.value = 'Pick someone to invite.';
    return;
  }
  starting.value = true;
  notice.value = null;
  const name = activeGameMeta.value?.name ?? 'Game';
  try {
    const { inviteId } = await invites.sendGameInvite(
      target,
      activeGameId.value,
      name,
      wagerLobby.pvpInviteRules(),
    );
    pendingOutgoingInviteId.value = inviteId;
    notice.value = 'Invite sent — the match opens when they accept.';
  } catch (e) {
    pendingOutgoingInviteId.value = null;
    notice.value = e instanceof Error ? e.message : 'Invite failed.';
  } finally {
    starting.value = false;
  }
}

const opponentDisplayName = computed(() => {
  const m = turnMatch.match.value;
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
  const user = roster.value.find((u) => u.userId === oppId);
  return user ? displayLabUserName(user) : `User ${oppId}`;
});

watch(
  () => turnMatch.match.value?.matchId,
  (matchId, prev) => {
    resultModalOnce.onMatchIdChange(matchId, prev);
    if (matchId && matchId !== prev) {
      resultVisible.value = false;
    }
    if (matchId) {
      void refreshInviteRoster();
    }
  },
);

function onMatchFinished(): void {
  const m = turnMatch.match.value;
  if (!m || m.status !== 'finished') {
    return;
  }
  if (!resultModalOnce.beginShow(m.matchId)) {
    return;
  }
  const you = m.scores[m.yourSeat] ?? 0;
  const opp = m.scores[m.yourSeat === 1 ? 2 : 1] ?? 0;
  const outcome = outcomeForMatch(m);
  resultTitle.value =
    outcome === 'win' ? 'You won!' : outcome === 'draw' ? 'Draw' : 'You lost';
  resultMessage.value = `Final score ${you} – ${opp}${wagerLobby.wagerOutcomeSuffix(readWagerQuarksFromState(m.state), outcome)}`;
  resultPersonalBest.value = false;
  resultVisible.value = true;
}

async function playAgain(): Promise<void> {
  resultVisible.value = false;
  if (lastMatchWasAi.value) {
    await playAi();
    return;
  }
  backToLobby();
}

</script>

<template>
  <div
    class="word-tile-app app-loaded-container text-lab-general-text w-full min-h-full h-full flex flex-col p-4 gap-4"
    :id="generateUniqueId('word-tile-root')"
  >
    <header
      class="lab-app-header flex items-start justify-between gap-3"
      :id="generateUniqueId('word-tile-header')"
    >
      <div class="min-w-0">
        <h1 :id="generateUniqueId('word-tile-title')" class="text-2xl font-semibold m-0">Word Tile</h1>
        <p
          v-if="props.appDescription"
          :id="generateUniqueId('word-tile-subtitle')"
          class="text-sm text-lab-general-text-muted m-0 mt-1"
        >
          {{ props.appDescription }}
        </p>
      </div>
      <LabVirtualBankBadge
        v-if="isAuthenticated"
        :balance="virtualBank.balance.value"
        :loading="virtualBank.loading.value"
      />
    </header>

    <main :id="generateUniqueId('word-tile-main')" class="flex-1 min-h-0 flex flex-col lab-app-body">
      <div
        v-if="view === 'lobby'"
        class="flex flex-col gap-4 min-h-0 overflow-y-auto max-w-lg"
        :id="generateUniqueId('tw-lobby-layout')"
      >
        <p
          v-if="catalogError"
          class="text-sm text-red-400 m-0"
          :id="generateUniqueId('tw-catalog-error')"
        >
          Could not load games: {{ catalogError }}
        </p>
        <p
          v-if="notice"
          class="text-sm text-lab-general-text-muted m-0"
          :id="generateUniqueId('word-tile-notice')"
        >
          {{ notice }}
        </p>
        <GameLobbyModePanel
          v-if="activeGameId"
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
          ai-section-lead="Place letter tiles on the shared board — score premium squares and outplay the lab AI."
          @play-ai="playAi"
          @invite="inviteFriend"
        />
        <p
          v-else-if="loading"
          class="text-sm text-lab-general-text-muted m-0"
          :id="generateUniqueId('tw-lobby-loading')"
        >
          Loading game…
        </p>
      </div>
      <GamePlayShell
        v-else-if="view === 'play' && activeGameId"
        :title="activeGameMeta?.name ?? 'Game'"
        :fa-icon="activeGameMeta?.faIcon ?? 'fa-gamepad'"
        @lobby="backToLobby"
      >
        <p
          v-if="turnMatch.loading.value && !turnMatch.match.value"
          class="text-sm text-lab-general-text-muted m-0 text-center py-8"
        >
          Loading match…
        </p>
        <p
          v-else-if="turnMatch.error.value && !turnMatch.match.value"
          class="text-sm text-red-400 m-0 text-center py-8"
        >
          {{ turnMatch.error.value }}
        </p>
        <TileWordGridGame
          v-else-if="activeGameId === WORD_TILE_GAME_IDS.TILE_WORD_GRID && turnMatch.match.value"
          :match="turnMatch.match.value"
          :server-url="appServerUrl"
          :opponent-display-name="opponentDisplayName"
          :on-move="turnMatch.submitMove"
          :player-turns="playerTurns"
          :live-player-turn="livePlayerTurn"
          :waiting-for-opponent="waitingForOpponent"
          :agent-resolving-move="agentResolvingMove"
          @finished="onMatchFinished"
        />
      </GamePlayShell>
    </main>

    <GameResultModal
      v-model:visible="resultVisible"
      :title="resultTitle"
      :message="resultMessage"
      :personal-best="resultPersonalBest"
      @lobby="backToLobby"
      @again="playAgain"
    />
  </div>
</template>
