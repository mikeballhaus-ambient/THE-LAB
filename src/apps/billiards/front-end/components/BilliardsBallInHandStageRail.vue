<script setup lang="ts">
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import BilliardsSpareCue from './BilliardsSpareCue.vue';

defineProps<{
  disabled?: boolean;
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <div
    :id="generateUniqueId('billiards-ball-in-hand-rail')"
    class="billiards-stage-rail-control billiards-ball-in-hand-stage-rail"
  >
    <div class="billiards-stage-rail-control__row">
      <span class="billiards-stage-rail-control__label">BALL IN HAND</span>
      <BilliardsSpareCue :disabled="disabled" :show-label="false" bare stage-pad />
    </div>
  </div>
</template>

<style scoped src="../styles/billiards-stage-rail-control.css"></style>
