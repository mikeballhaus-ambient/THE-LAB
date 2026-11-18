<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

withDefaults(
  defineProps<{
    showAside?: boolean;
    /** `start` = left of board (billiards cue gutter); default `end` = right. */
    asidePosition?: 'start' | 'end';
  }>(),
  {
    asidePosition: 'end',
  },
);

const { generateUniqueId } = useUniqueElementId();
const mainRef = ref<HTMLElement | null>(null);
/** Cap the aside to the board column height so turn feeds scroll instead of stretching the page. */
const asideHeightPx = ref<number | null>(null);

let resizeObserver: ResizeObserver | null = null;

function syncAsideHeight(): void {
  const main = mainRef.value;
  asideHeightPx.value = main && main.offsetHeight > 0 ? main.offsetHeight : null;
}

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    syncAsideHeight();
  });
  const main = mainRef.value;
  if (main) {
    resizeObserver.observe(main);
    syncAsideHeight();
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});
</script>

<template>
  <div
    class="tw-game-board-row flex w-full max-w-full flex-row items-start justify-start gap-4 max-[52rem]:flex-col"
  >
    <aside
      v-if="showAside && asidePosition === 'start'"
      class="tw-game-board-row__aside flex min-h-0 w-full min-w-[min(100%,12rem)] max-w-none flex-1 basis-0 flex-col overflow-hidden max-[52rem]:w-full max-[52rem]:max-w-full"
      :id="generateUniqueId('tw-game-board-aside')"
      :style="
        asideHeightPx != null
          ? { height: `${asideHeightPx}px`, maxHeight: `${asideHeightPx}px` }
          : undefined
      "
    >
      <slot name="aside" />
    </aside>
    <div ref="mainRef" class="tw-game-board-row__main min-w-0 flex-[0_1_auto]">
      <slot />
    </div>
    <aside
      v-if="showAside && asidePosition !== 'start'"
      class="tw-game-board-row__aside flex min-h-0 w-full min-w-[min(100%,12rem)] max-w-none flex-1 basis-0 flex-col overflow-hidden max-[52rem]:w-full max-[52rem]:max-w-full"
      :id="generateUniqueId('tw-game-board-aside')"
      :style="
        asideHeightPx != null
          ? { height: `${asideHeightPx}px`, maxHeight: `${asideHeightPx}px` }
          : undefined
      "
    >
      <slot name="aside" />
    </aside>
  </div>
</template>
