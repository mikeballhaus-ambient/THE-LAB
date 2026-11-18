<script setup lang="ts">
  import { DnDProvider, DragPreview } from '@vue-dnd-kit/core';
  import CheckersGame from './CheckersGame.vue';
</script>

<template>
  <DnDProvider>

      <template #preview>
        <DragPreview />
      </template>
      <CheckersGame />
    </DnDProvider>
</template>
