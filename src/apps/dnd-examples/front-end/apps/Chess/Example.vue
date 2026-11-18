<script setup lang="ts">
  import { DnDProvider, DragPreview } from '@vue-dnd-kit/core';
  import ChessGame from './ChessGame.vue';
</script>

<template>
  <DnDProvider>
    <template #preview>
      <DragPreview />
    </template>
    <ChessGame />
  </DnDProvider>
</template>
