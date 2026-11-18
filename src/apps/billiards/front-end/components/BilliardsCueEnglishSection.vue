<script setup lang="ts">
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import BilliardsEnglishPad from './BilliardsEnglishPad.vue';

defineProps<{
  disabled?: boolean;
  /** Shown under the pad when `disabled` (explains why crosshair / drag is off). */
  disabledHint?: string;
  /** Tighter section + half-size english ball (vs match aside). */
  compact?: boolean;
  /** `stage-pad-only` = english ball only, top-right on stage chrome. */
  layout?: 'stack' | 'stage-rail' | 'stage-pad-only';
}>();

const englishX = defineModel<number>('englishX', { default: 0 });
const englishY = defineModel<number>('englishY', { default: 0 });

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <div
    v-if="layout === 'stage-pad-only'"
    :id="generateUniqueId('billiards-shoot-section')"
    class="billiards-stage-rail-control billiards-cue-english-stage-pad"
  >
    <div class="billiards-stage-rail-control__row">
      <span class="billiards-stage-rail-control__label">CUE SPIN</span>
      <BilliardsEnglishPad
        v-model:english-x="englishX"
        v-model:english-y="englishY"
        :disabled="disabled"
        :compact="compact"
      />
    </div>
    <p v-if="disabled && disabledHint" class="billiards-stage-rail-control__hint">
      {{ disabledHint }}
    </p>
  </div>
  <section
    v-else
    :id="generateUniqueId('billiards-shoot-section')"
    class="lab-form-section billiards-cue-english-section w-fit max-w-full shrink-0"
    :class="{
      'billiards-cue-english-section--compact': compact,
      'billiards-cue-english-section--stage-rail': layout === 'stage-rail',
    }"
  >
    <div
      class="billiards-cue-english-section__main"
      :class="layout === 'stage-rail' ? 'billiards-cue-english-section__main--rail' : ''"
    >
      <h4 :id="generateUniqueId('billiards-shoot-title')" class="lab-form-section__title">
        <span class="lab-form-section__icon"><i class="pi pi-compass" aria-hidden="true" /></span>
        CUE ENGLISH
      </h4>
      <div
        class="lab-form-section__children"
        :class="compact ? 'pt-[0.35rem]' : 'pt-[0.65rem]'"
      >
        <BilliardsEnglishPad
          v-model:english-x="englishX"
          v-model:english-y="englishY"
          :disabled="disabled"
          :compact="compact"
        />
      </div>
    </div>
    <p
      v-if="disabled && disabledHint"
      class="billiards-cue-english-hint m-0 mt-2 text-xs leading-snug text-lab-general-text-muted"
      :class="compact ? 'max-w-full' : 'max-w-[12rem]'"
    >
      {{ disabledHint }}
    </p>
  </section>
</template>

<style scoped>
.billiards-cue-english-section.lab-form-section {
  position: relative;
  z-index: 2;
  padding-block: 0.65rem 0.75rem;
  padding-inline: 0.75rem;
}

.billiards-cue-english-section--compact.lab-form-section {
  padding-block: 0.45rem 0.5rem;
  padding-inline: 0.5rem;
}

.billiards-cue-english-section--compact :deep(.lab-form-section__title) {
  font-size: 0.7rem;
  letter-spacing: 0.04em;
}

.billiards-cue-english-section--compact :deep(.lab-form-section__icon) {
  font-size: 0.75rem;
}

.billiards-cue-english-section--stage-rail {
  padding-block: 0.35rem 0.4rem;
  padding-inline: 0.55rem;
  margin-bottom: 0.35rem;
}

.billiards-cue-english-section__main--rail {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.billiards-cue-english-section__main--rail .lab-form-section__title {
  margin: 0;
  flex-shrink: 0;
}

.billiards-cue-english-section__main--rail .lab-form-section__children {
  padding-top: 0;
}

</style>

<style scoped src="../styles/billiards-stage-rail-control.css"></style>
