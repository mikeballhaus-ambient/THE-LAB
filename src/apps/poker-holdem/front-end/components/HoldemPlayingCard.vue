<script setup lang="ts">
import LabPlayingCard from '@/shared/game-platform/ui/LabPlayingCard.vue';

defineProps<{
  code?: string;
  faceDown?: boolean;
  size?: 'sm' | 'md';
}>();
</script>

<template>
  <LabPlayingCard :code="code" :face-down="faceDown" :size="size" class="holdem-card-compat" />
</template>
