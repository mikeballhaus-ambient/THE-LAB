<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { BilliardsBall } from '../../shared/billiards-types';
import type { BilliardsBallPose } from '../../shared/billiards-rapier-sim';
import { useBilliardsThreeTable } from '../composables/useBilliardsThreeTable';

const props = defineProps<{
  balls: BilliardsBall[];
  poses: BilliardsBallPose[] | null;
  themeHost?: HTMLElement | null;
  isRolling?: boolean;
  /** Dev: wireframe overlay matching Rapier felt + cushion cuboids. */
  showColliderDebug?: boolean;
  /**
   * When true, the WebGL canvas ignores pointer events so DnD drops hit the table droppable
   * (ball-in-hand spare-cue drag was dropping on the canvas and never firing onDrop).
   */
  pointerEventsNone?: boolean;
}>();

const { generateUniqueId } = useUniqueElementId();
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');
const themeRef = computed(() => props.themeHost ?? null);
const ballsRef = computed(() => props.balls);
const isRollingRef = computed(() => props.isRolling ?? false);
const showColliderDebugRef = computed(() => props.showColliderDebug ?? false);

useBilliardsThreeTable(
  canvasRef,
  themeRef,
  ballsRef,
  computed(() => props.poses),
  isRollingRef,
  showColliderDebugRef,
);
</script>

<template>
  <div
    class="billiards-table-3d-host absolute inset-0 z-[1]"
    :class="{ 'billiards-table-3d-host--no-pointer': pointerEventsNone }"
  >
    <canvas
      ref="canvasRef"
      :id="generateUniqueId('billiards-table-3d-canvas')"
      class="billiards-table-3d block h-full w-full touch-none"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.billiards-table-3d-host {
  overflow: hidden;
}

.billiards-table-3d-host--no-pointer {
  pointer-events: none;
}

.billiards-table-3d {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
