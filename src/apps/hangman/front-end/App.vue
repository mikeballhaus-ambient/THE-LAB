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
import { detectHangmanBanterMoment } from '@/shared/game-platform/lab-assistant-banter/detectors';
import {
  TurnTimerHud,
  GameLobbyModePanel,
  GameResultModal,
  LabVirtualBankBadge,
  LabGameHintAsideControls,
} from '@/shared/game-platform/ui';
import { useCatalogMatchGameHint } from '@/shared/game-platform/composables/useCatalogMatchGameHint';
import { useLabGameHintAsideProps } from '@/shared/game-platform/composables/useLabGameHintAsideProps';
import { LAB_GAME_HINT_SKU_SAFE_LETTER } from '@/shared/game-platform/lab-game-hints';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import { useCatalogGameWagerLobby } from '@/shared/game-platform/composables/use-catalog-game-wager-lobby';
import { useGameMatchResultModalOnce } from '@/shared/game-platform/composables/useGameMatchResultModalOnce';
import {
  useLabVirtualBank,
  useLabVirtualBankOnMatchFinished,
} from '@/shared/composables/useLabVirtualBank';
import { readWagerQuarksFromState } from '@/shared/game-platform/catalog-match-wager';
import { useGameInvites } from '@/shared/game-platform/use-game-invites';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { HANGMAN_CONFIG } from '../shared/game-config';
import { HANGMAN_GAME_IDS } from '../back-end/catalog';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL } from '@/shared/constants/lab-game-assistant-opponent';
import type { HangmanState } from '../back-end/rules';
import { describeSetterChallenge } from '../back-end/rules';
import HangmanBoard from './components/GameBoard.vue';

/**
 * Hangman on the shared game-platform kit.
 *
 * Roles are per-match: one seat sets the word, the other guesses. Which payload
 * is legal is decided by the server adapter, so this file only decides which
 * control to show — the setter's word input or the guesser's alphabet.
 */

interface Props {
  serverUrl?: string;
  appDescription?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();

const PLATFORM_APP_ID = HANGMAN_CONFIG.appId;
const GAME_ID = HANGMAN_GAME_IDS.HANGMAN;
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
const secretWord = ref('');
const resultVisible = ref(false);
const resultTitle = ref('');
const resultMessage = ref('');
const resultModalOnce = useGameMatchResultModalOnce();
const lastMatchWasAi = ref(false);

const turnMatch = useTurnBasedMatch({
  serverUrl: () => appServerUrl.value,
  config: HANGMAN_CONFIG,
  getOpponentDisplayName: () => opponentName.value,
  detectBanterMoment: detectHangmanBanterMoment,
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
  config: HANGMAN_CONFIG,
  sendEnvelope: comms.sendEnvelope,
});

const match = turnMatch.match;
const state = computed<HangmanState>(() => (match.value?.state as HangmanState) ?? {});
const yourSeat = computed(() => match.value?.yourSeat ?? 0);
const role = computed<'setter' | 'guesser'>(() =>
  state.value.setterSeat === yourSeat.value ? 'setter' : 'guesser',
);
const needsWord = computed(() => role.value === 'setter' && !state.value.wordSet);
const setterChallengeBrief = computed(() => {
  if (!state.value.setterChallenge) {
    return 'Pick any word between 3 and 12 letters (A–Z only).';
  }
  return describeSetterChallenge(state.value.setterChallenge);
});

/** Mask unguessed letters. The server never sends the word before it is set. */
const pattern = computed(() => {
  const word = state.value.word ?? '';
  if (!word) {
    return '';
  }
  const guessed = new Set((state.value.guessedLetters ?? []).map((l) => l.toUpperCase()));
  if (finished.value) {
    return word
      .split('')
      .map((ch) => ch.toUpperCase())
      .join(' ');
  }
  return word
    .split('')
    .map((ch) => (guessed.has(ch.toUpperCase()) ? ch.toUpperCase() : '_'))
    .join(' ');
});

const strikes = computed(() => state.value.strikes ?? 0);
const maxStrikes = 6;
const isMyTurn = computed(
  () =>
    !!match.value &&
    match.value.status === 'active' &&
    match.value.currentSeat === match.value.yourSeat,
);
const finished = computed(() => match.value?.status === 'finished');

const safeLetterHint = useCatalogMatchGameHint({
  hostAppId: PLATFORM_APP_ID,
  skuId: LAB_GAME_HINT_SKU_SAFE_LETTER,
  serverUrl: appServerUrl,
  match,
  buildTurnKey: () =>
    `${match.value?.stateRevision ?? 0}:${(state.value.guessedLetters ?? []).length}`,
  onPurchased: () => void virtualBank.refresh(),
});
const safeLetterAside = useLabGameHintAsideProps(safeLetterHint);

const safeLetterNudge = ref<string | null>(null);

async function loadSafeLetterNudge(): Promise<void> {
  safeLetterNudge.value = null;
  const matchId = match.value?.matchId;
  const url = appServerUrl.value;
  if (!matchId || !url) {
    return;
  }
  try {
    const res = await fetch(
      `${url}/api/game-hints/safe-letter`,
      labPlatformFetchInit({
        method: 'POST',
        body: JSON.stringify({ matchId }),
      }),
    );
    const json = (await res.json()) as { success?: boolean; data?: { letter?: string } };
    if (res.ok && json.success && json.data?.letter) {
      safeLetterNudge.value = json.data.letter.toUpperCase();
    }
  } catch {
    safeLetterNudge.value = null;
  }
}

watch(
  () => safeLetterHint.showOverlay.value,
  (on) => {
    if (on && role.value === 'guesser' && state.value.wordSet) {
      void loadSafeLetterNudge();
    } else if (!on) {
      safeLetterNudge.value = null;
    }
  },
);

const showSafeLetterControls = computed(
  () =>
    role.value === 'guesser' &&
    !!state.value.wordSet &&
    !finished.value &&
    match.value?.opponentKind === 'ai',
);

const suggestedLetter = computed(() =>
  safeLetterHint.showOverlay.value ? safeLetterNudge.value : null,
);

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
  if (needsWord.value) {
    return 'Choose a secret word.';
  }
  return isMyTurn.value ? `Your turn — ${role.value}.` : `${opponentName.value}'s turn.`;
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
    const { inviteId } = await invites.sendGameInvite(target, GAME_ID, 'Hangman', wagerLobby.pvpInviteRules());
    pendingOutgoingInviteId.value = inviteId;
    notice.value = 'Invite sent — the match opens when they accept.';
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Invite failed.';
  } finally {
    starting.value = false;
  }
}

async function setWord(word: string): Promise<void> {
  if (!isMyTurn.value) {
    return;
  }
  try {
    await turnMatch.submitMove({ type: 'set', word });
    secretWord.value = '';
  } catch (e) {
    notice.value = e instanceof Error ? e.message : 'Could not set word';
  }
}

async function guessLetter(letter: string): Promise<void> {
  if (!isMyTurn.value) {
    return;
  }
  await turnMatch.submitMove({ type: 'guess', letter });
  safeLetterHint.consumeUnlock();
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
  const word = (m.state as HangmanState).word?.toUpperCase() ?? '';
  if (outcome === 'win') {
    resultMessage.value = (word
      ? `You guessed the word: ${word}.`
      : 'You guessed every letter.') + wagerSuffix;
  } else if (outcome === 'loss') {
    resultMessage.value = (word
      ? `The word was ${word}.`
      : 'The setter wins this round.') + wagerSuffix;
  } else {
    resultMessage.value = `This match ended in a draw.${wagerSuffix}`;
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
  window.addEventListener('hangman:new-game', onNewGame);
  if (appServerUrl.value) {
    openPendingMatchIfAny();
  }
  if (isAuthenticated.value) {
    comms.connect();
  }
});

onUnmounted(() => {
  window.removeEventListener(GAME_PENDING_MATCH_EVENT, onPendingMatchSaved);
  window.removeEventListener('hangman:new-game', onNewGame);
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
    class="hangman-app app-loaded-container text-lab-general-text w-full min-h-full h-full flex flex-col p-4 gap-4"
    :id="generateUniqueId('hangman-root')"
  >
    <header class="lab-app-header flex items-start justify-between gap-3" :id="generateUniqueId('hangman-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('hangman-title')">Hangman</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'One player sets a word, the other guesses it.' }}
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
          :pt="{ root: { attrs: { id: generateUniqueId('hangman-back') } } }"
          @click="backToLobby"
        />
      </div>
    </header>

    <main class="lab-app-body flex-1 min-h-0 flex flex-col gap-4" :id="generateUniqueId('hangman-main')">
      <p v-if="notice" class="text-sm text-lab-general-text-muted m-0" :id="generateUniqueId('hangman-notice')">
        {{ notice }}
      </p>

      <section
        v-if="view === 'lobby'"
        class="flex flex-col gap-4"
        :id="generateUniqueId('hangman-lobby')"
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
          ai-section-lead="One seat sets a secret word; the other guesses letter by letter. Six wrong guesses and the setter wins."
          @play-ai="playAi"
          @invite="inviteFriend"
        />
      </section>

      <section v-else class="flex flex-col gap-3 min-h-0 flex-1" :id="generateUniqueId('hangman-play')">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p class="text-sm m-0 font-medium" :id="generateUniqueId('hangman-status')">{{ statusLine }}</p>
          <TurnTimerHud
            v-if="match?.status === 'active'"
            :turn-remaining-ms="match.turnRemainingMs ?? 0"
          />
        </div>
        <LabGameHintAsideControls
          v-if="showSafeLetterControls"
          :sku-label="safeLetterAside.skuLabel"
          :cost-quarks="safeLetterAside.costQuarks"
          :unlocked="safeLetterAside.unlocked"
          :loading="safeLetterAside.loading"
          :disabled="!isAuthenticated || !isMyTurn"
          :dev-mock-enabled="safeLetterAside.devMockEnabled"
          class="mb-2"
          @purchase="
            async () => {
              const ok = await safeLetterHint.purchaseHint();
              if (ok) {
                await loadSafeLetterNudge();
              }
            }
          "
          @mock-purchase="
            () => {
              safeLetterHint.mockPurchaseHint();
              void loadSafeLetterNudge();
            }
          "
        />
        <HangmanBoard
          v-model:word="secretWord"
          :role="role"
          :pattern="pattern"
          :secret-word="state.word ?? ''"
          :word-set="state.wordSet ?? false"
          :finished="finished"
          :guessed-letters="state.guessedLetters ?? []"
          :strikes="strikes"
          :max-strikes="maxStrikes"
          :needs-word="needsWord"
          :setter-challenge-brief="setterChallengeBrief"
          :suggested-letter="suggestedLetter"
          :disabled="!isMyTurn || finished"
          :on-set-word="setWord"
          :on-guess="guessLetter"
        />
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
