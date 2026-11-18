<script setup lang="ts">
import { DnDProvider } from '@vue-dnd-kit/core';
import ConstraintBox from './ConstraintBox.vue';
import DragChip from './DragChip.vue';
</script>

<template>
  <DnDProvider>
    <ConstraintBox :restrict-to-area="true" label="Constraint area" class="bounds-box">
      <DragChip>Drag me</DragChip>
    </ConstraintBox>
  </DnDProvider>
</template>

<style scoped>
.bounds-box {
  min-height: 200px;
}
</style>
