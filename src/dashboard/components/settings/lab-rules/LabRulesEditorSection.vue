<script setup lang="ts">
defineProps<{
  step: number;
  title: string;
  subtitle?: string;
  variant?: 'details' | 'input' | 'conditions' | 'output';
}>();
</script>

<template>
  <section
    class="lab-rules-editor-section"
    :class="`lab-rules-editor-section--${variant ?? 'details'}`"
  >
    <header class="lab-rules-editor-section__head">
      <span class="lab-rules-editor-section__step" aria-hidden="true">{{ step }}</span>
      <div class="min-w-0 flex-1">
        <h3 class="lab-rules-editor-section__title">{{ title }}</h3>
        <p v-if="subtitle" class="lab-rules-editor-section__subtitle">{{ subtitle }}</p>
      </div>
      <slot name="head-actions" />
    </header>
    <div class="lab-rules-editor-section__body">
      <slot />
    </div>
  </section>
</template>
