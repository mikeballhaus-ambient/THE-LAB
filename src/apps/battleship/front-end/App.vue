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
import { detectBattleshipBanterMoment } from '@/shared/game-platform/lab-assistant-banter/detectors';
import { useGameInvites } from '@/shared/game-platform/use-game-invites';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { BATTLESHIP_CONFIG, BATTLESHIP_FLEET_SHIP_COUNT } from '../shared/game-config';
import { BATTLESHIP_GAME_IDS } from '../back-end/catalog';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL, GAME_LOBBY_OR_INVITE_FRIEND_TAGLINE } from '@/shared/constants/lab-game-assistant-opponent';
import BattleshipBoard from './components/GameBoard.vue';
import {
  GameLobbyModePanel,
  LabVirtualBankBadge,
  LabGameHintAsideControls,
  GameBoardRow,
} from '@/shared/game-platform/ui';
import { useCatalogMatchGameHint } from '@/shared/game-platform/composables/useCatalogMatchGameHint';
import { useLabGameHintAsideProps } from '@/shared/game-platform/composables/useLabGameHintAsideProps';
import { LAB_GAME_HINT_SKU_HUNT_LINE } from '@/shared/game-platform/lab-game-hints';
import { computeBattleshipHuntLineHint } from '../shared/battleship-hunt-line-hint';
import { useCatalogGameWagerLobby } from '@/shared/game-platform/composables/use-catalog-game-wager-lobby';
import {
  useLabVirtualBank,
  useLabVirtualBankOnMatchFinished,
} from '@/shared/composables/useLabVirtualBank';

/**
 * Battleship on the shared game-platform kit.
 *
 * `match.state` is already **redacted per seat** by the adapter's
 * `redactStateForSeat` hook, so the enemy fleet simply is not present in this
 * payload. The board therefore cannot leak it, and this file has no rules.
 */

interface Props {
  serverUrl?: string;
  appDescription?: string;
}

interface BsShip {
  id: number;
  cells: { row: number; col: number }[];
}

interface BsState {
  /** Your own fleet (enemy fleet is redacted away). */
  fleets?: Record<number, BsShip[]>;
  shotsAt?: Record<number, Record<string, 'hit' | 'miss'>>;
  turnHistory?: number[];
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();

const PLATFORM_APP_ID = BATTLESHIP_CONFIG.appId;
const GAME_ID = BATTLESHIP_GAME_IDS.BATTLESHIP;
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
const lastMatchWasAi = ref(false);
const pendingOutgoingInviteId = ref<string | null>(null);

const turnMatch = useTurnBasedMatch({
  serverUrl: () => appServerUrl.value,
  config: BATTLESHIP_CONFIG,
  getOpponentDisplayName: () => opponentName.value,
  detectBanterMoment: detectBattleshipBanterMoment,
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
  config: BATTLESHIP_CONFIG,
  sendEnvelope: comms.sendEnvelope,
});

const match = turnMatch.match;

const virtualBank = useLabVirtualBank({ serverUrl: () => appServerUrl.value });
useLabVirtualBankOnMatchFinished(
  virtualBank,
  computed(() => match.value?.status),
);

const state = computed<BsState>(() => (match.value?.state as BsState) ?? {});
const yourSeat = computed(() => match.value?.yourSeat ?? 1);

const ownFleet = computed<BsShip[]>(() => state.value.fleets?.[yourSeat.value] ?? []);
const ownShipCells = computed(() =>
  ownFleet.value.flatMap((ship) => ship.cells.map((c) => `${c.row},${c.col}`)),
);
const myShots = computed(() => state.value.shotsAt?.[yourSeat.value] ?? {});
const incomingShots = computed(() => {
  const opponent = yourSeat.value === 1 ? 2 : 1;
  return state.value.shotsAt?.[opponent] ?? {};
});

const opponentSeat = computed(() => (yourSeat.value === 1 ? 2 : 1));

/** Match scores track enemy ships still afloat from your shots (see adapter `rules.scores`). */
const enemyShipsAfloat = computed(
  () => match.value?.scores?.[yourSeat.value] ?? BATTLESHIP_FLEET_SHIP_COUNT,
);
const enemyShipsSunk = computed(() => BATTLESHIP_FLEET_SHIP_COUNT - enemyShipsAfloat.value);
const ownShipsAfloat = computed(
  () => match.value?.scores?.[opponentSeat.value] ?? BATTLESHIP_FLEET_SHIP_COUNT,
);

const isMyTurn = computed(
  () =>
    !!match.value &&
    match.value.status === 'active' &&
    match.value.currentSeat === match.value.yourSeat,
);
const finished = computed(() => match.value?.status === 'finished');

const huntHint = useCatalogMatchGameHint({
  hostAppId: PLATFORM_APP_ID,
  skuId: LAB_GAME_HINT_SKU_HUNT_LINE,
  serverUrl: appServerUrl,
  match,
  buildTurnKey: () =>
    `${match.value?.stateRevision ?? 0}:${match.value?.currentSeat ?? 0}:${Object.keys(myShots.value).length}`,
  onPurchased: () => void virtualBank.refresh(),
});

const huntAside = useLabGameHintAsideProps(huntHint);

const quarksHintResult = computed(() => {
  if (!huntHint.showOverlay.value || !isMyTurn.value || finished.value) {
    return null;
  }
  return computeBattleshipHuntLineHint(myShots.value);
});

const quarksHintFireCell = computed(() => {
  const hint = quarksHintResult.value;
  return hint ? { row: hint.row, col: hint.col } : null;
});

const quarksHintAsideLine = computed(() => {
  const hint = quarksHintResult.value;
  if (!hint) {
    return null;
  }
  if (hint.kind === 'search') {
    return `Highlighted: row ${hint.row}, col ${hint.col} — parity search while hunting.`;
  }
  return `Highlighted: row ${hint.row}, col ${hint.col} — next cell along your hit line.`;
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
  return isMyTurn.value ? 'Your turn — fire at the enemy board.' : `${opponentName.value}'s turn.`;
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
    const { inviteId } = await invites.sendGameInvite(target, GAME_ID, 'Battleship', wagerLobby.pvpInviteRules());
    pendingOutgoingInviteId.value = inviteId;
    notice.value = 'Invite sent — the match opens when they accept.';
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Invite failed.';
  } finally {
    starting.value = false;
  }
}

async function fireAt(row: number, col: number): Promise<void> {
  if (!isMyTurn.value) {
    return;
  }
  await turnMatch.submitMove({ type: 'fire', row, col });
  huntHint.consumeUnlock();
}

function backToLobby(): void {
  view.value = 'lobby';
  notice.value = null;
  pendingOutgoingInviteId.value = null;
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
  window.addEventListener('battleship:new-game', onNewGame);
  if (appServerUrl.value) {
    openPendingMatchIfAny();
  }
  if (isAuthenticated.value) {
    comms.connect();
  }
});

onUnmounted(() => {
  window.removeEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
  window.removeEventListener('battleship:new-game', onNewGame);
});

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
    class="battleship-app app-loaded-container text-lab-general-text w-full min-h-full h-full flex flex-col p-4 gap-4"
    :id="generateUniqueId('battleship-root')"
  >
    <header class="lab-app-header flex items-start justify-between gap-3" :id="generateUniqueId('battleship-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('battleship-title')">Battleship</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || `Sink the enemy fleet before yours goes down. ${GAME_LOBBY_OR_INVITE_FRIEND_TAGLINE}` }}
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
          :pt="{ root: { attrs: { id: generateUniqueId('battleship-back') } } }"
          @click="backToLobby"
        />
      </div>
    </header>

    <main class="lab-app-body flex-1 min-h-0 flex flex-col gap-4" :id="generateUniqueId('battleship-main')">
      <p v-if="notice" class="text-sm text-lab-general-text-muted m-0" :id="generateUniqueId('battleship-notice')">
        {{ notice }}
      </p>

      <section
        v-if="view === 'lobby'"
        class="flex flex-col gap-4 max-w-md"
        :id="generateUniqueId('battleship-lobby')"
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
          ai-section-lead="Sink the enemy fleet before yours goes down — coordinate your shots on the redacted enemy board."
          @play-ai="playAi"
          @invite="inviteFriend"
        />
      </section>

      <section v-else class="flex flex-col gap-3 min-h-0 flex-1" :id="generateUniqueId('battleship-play')">
        <p class="text-sm m-0" :id="generateUniqueId('battleship-status')">{{ statusLine }}</p>
        <GameBoardRow show-aside class="flex-1 min-h-0 w-full">
          <BattleshipBoard
            :own-ship-cells="ownShipCells"
            :my-shots="myShots"
            :incoming-shots="incomingShots"
            :enemy-ships-sunk="enemyShipsSunk"
            :enemy-ship-total="BATTLESHIP_FLEET_SHIP_COUNT"
            :ships-afloat="ownShipsAfloat"
            :total-ships="BATTLESHIP_FLEET_SHIP_COUNT"
            :hint-fire-cell="quarksHintFireCell"
            :disabled="!isMyTurn || finished"
            :on-fire="fireAt"
          />
          <template #aside>
            <div
              v-if="!finished"
              class="flex min-h-0 w-full max-w-xs flex-col gap-3"
              :id="generateUniqueId('battleship-hint-aside')"
            >
              <LabGameHintAsideControls
                :sku-label="huntAside.skuLabel"
                :cost-quarks="huntAside.costQuarks"
                :unlocked="huntAside.unlocked"
                :loading="huntAside.loading"
                :disabled="!isAuthenticated || !isMyTurn"
                :dev-mock-enabled="huntAside.devMockEnabled"
                @purchase="() => void huntHint.purchaseHint()"
                @mock-purchase="huntHint.mockPurchaseHint"
              />
              <p
                v-show="isMyTurn"
                class="m-0 min-h-[2.75rem] text-xs font-semibold text-lab-general-text"
                :class="
                  huntHint.showOverlay.value && quarksHintAsideLine
                    ? 'opacity-100'
                    : 'opacity-0'
                "
                :aria-hidden="!(huntHint.showOverlay.value && quarksHintAsideLine)"
              >
                {{ quarksHintAsideLine ?? '\u00a0' }}
              </p>
            </div>
          </template>
        </GameBoardRow>
      </section>
    </main>
  </div>
</template>
