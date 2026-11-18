<script setup lang="ts">
  import { DnDProvider } from '@vue-dnd-kit/core';
  import ModifierCard from './ModifierCard.vue';
  import DropZone from './DropZone.vue';
</script>

<template>
  <DnDProvider>
    <div class="layout">
      <div class="cards">
        <ModifierCard label="Drag freely" />
        <ModifierCard
          label="Alt + Drag"
          :require-alt="true"
        />
      </div>

      <DropZone />
    </div>
  </DnDProvider>
</template>

<style scoped>
  .layout {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .cards {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
</style>
