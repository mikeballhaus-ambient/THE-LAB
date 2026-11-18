<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import GameResultModal from '@/shared/game-platform/ui/GameResultModal.vue';
import KlondikeGame from './games/klondike/KlondikeGame.vue';
import { useSolitaireSession } from './composables/useSolitaireSession';
import { SOLITAIRE_GAME_IDS, type GameRunPayload } from '../shared/types';

/** Matches registry seed (`SOLITAIRE_APP_DESCRIPTION` in catalog-app-registration-specs). */
const DEFAULT_SUBTITLE =
  'Klondike solitaire — beat your personal best time and move count.';

interface Props {
  serverUrl?: string;
  appDescription?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const session = useSolitaireSession();

const gameKey = ref(0);
const resultVisible = ref(false);
const resultTitle = ref('You won!');
const resultMessage = ref('');
const resultPersonalBest = ref(false);
const submitError = ref('');

const appServerUrl = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

const subtitle = computed(() => {
  const raw = props.appDescription?.trim();
  if (!raw || /leaderboard/i.test(raw)) {
    return DEFAULT_SUBTITLE;
  }
  return raw;
});

onMounted(() => {
  if (appServerUrl.value) {
    session.connect(appServerUrl.value);
  }
});

function startNewGame(): void {
  resultVisible.value = false;
  submitError.value = '';
  gameKey.value += 1;
}

async function onKlondikeWon(payload: { elapsedMs: number; moves: number }): Promise<void> {
  const durationMs = payload.elapsedMs;
  resultTitle.value = 'You won!';
  resultMessage.value = `Time ${Math.round(durationMs / 1000)}s · ${payload.moves} moves`;
  resultPersonalBest.value = false;
  submitError.value = '';
  resultVisible.value = true;

  if (!appServerUrl.value) {
    return;
  }

  const body: GameRunPayload = {
    gameId: SOLITAIRE_GAME_IDS.KLONDIKE,
    outcome: 'win',
    primaryValue: durationMs,
    secondaryValue: payload.moves,
    durationMs,
    runId: crypto.randomUUID(),
  };

  try {
    const data = await session.submitRun(body);
    resultPersonalBest.value = data.personalBest;
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Could not save this run';
    resultMessage.value = `${resultMessage.value}\n\n${submitError.value}`;
  }
}
</script>

<template>
  <div
    class="solitaire-app app-loaded-container text-lab-general-text w-full min-w-0 min-h-full h-full flex flex-col p-4 gap-4"
    :id="generateUniqueId('solitaire-root')"
  >
    <header
      class="lab-app-header flex items-start justify-between gap-3"
      :id="generateUniqueId('solitaire-header')"
    >
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('solitaire-title')">
          Solitaire
        </h1>
        <p
          class="text-sm text-lab-general-text-muted m-0 mt-1"
          :id="generateUniqueId('solitaire-subtitle')"
        >
          {{ subtitle }}
        </p>
      </div>
      <Button
        label="New game"
        icon="pi pi-refresh"
        size="small"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId('solitaire-new-game') } } }"
        @click="startNewGame"
      />
    </header>

    <main class="lab-app-body w-full min-w-0 flex-1 min-h-0" :id="generateUniqueId('solitaire-body')">
      <KlondikeGame :key="gameKey" :server-url="appServerUrl" @won="onKlondikeWon" />
    </main>

    <GameResultModal
      v-model:visible="resultVisible"
      :title="resultTitle"
      :message="resultMessage"
      :personal-best="resultPersonalBest"
      @lobby="startNewGame"
      @again="startNewGame"
    />
  </div>
</template>
