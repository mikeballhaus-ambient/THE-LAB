<script setup lang="ts">
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { GameCatalogEntry } from '../types';
import GameIcon from './GameIcon.vue';

defineProps<{
  games: GameCatalogEntry[];
  loading: boolean;
}>();

const emit = defineEmits<{
  play: [gameId: string];
}>();

const { generateUniqueId } = useUniqueElementId();

function playerModeLabel(mode: GameCatalogEntry['playerMode']): string {
  return mode === 'solo' ? 'Solo' : 'Multiplayer';
}

function playerModeIcon(mode: GameCatalogEntry['playerMode']): string {
  return mode === 'solo' ? 'fa-solid fa-user' : 'fa-solid fa-users';
}
</script>

<template>
  <div
    class="grid gap-4 grid-cols-1 w-full"
    :id="generateUniqueId('tw-lobby-grid')"
  >
    <article
      v-for="game in games"
      :key="game.id"
      :id="generateUniqueId(`tw-lobby-game-card-${game.id}`)"
      class="app-card-grid"
    >
      <header
        :id="generateUniqueId(`tw-lobby-game-header-${game.id}`)"
        class="app-card-grid__header"
      >
        <div class="app-card-grid__title-row">
          <div class="app-card-grid__identity">
            <GameIcon :icon="game.faIcon" size="md" />
            <div class="min-w-0">
              <h3
                :id="generateUniqueId(`tw-lobby-game-title-${game.id}`)"
                class="app-card-grid__title text-lab-card-title"
              >
                {{ game.name }}
              </h3>
            </div>
          </div>
          <p
            class="app-card-grid__meta-line"
            :id="generateUniqueId(`tw-lobby-game-modes-${game.id}`)"
          >
            <span class="inline-flex items-center gap-1">
              <i
                :class="playerModeIcon(game.playerMode)"
                class="text-[0.65rem]"
                aria-hidden="true"
              ></i>
              <span>{{ playerModeLabel(game.playerMode) }}</span>
            </span>
          </p>
        </div>
      </header>
      <p class="app-card-grid__description">{{ game.description }}</p>
      <footer
        :id="generateUniqueId(`tw-lobby-game-footer-${game.id}`)"
        class="app-card-grid__footer"
      >
        <Button
          outlined
          size="small"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId(`tw-play-${game.id}`) } } }"
          @click="emit('play', game.id)"
        >
          <span class="text-sm flex items-center gap-2 whitespace-nowrap">
            <i class="fa fa-play" aria-hidden="true"></i>
            <span>Play</span>
          </span>
        </Button>
      </footer>
    </article>
  </div>
</template>
