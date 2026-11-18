<script setup lang="ts">
/**
 * Canonical section card for About dialog (AGENTS §13 — no step numerals).
 */
withDefaults(
  defineProps<{
    title: string;
    /** Full class string on the <i> element (Font Awesome). */
    iconClass: string;
    /** Top-level intro row uses the outer card; grids use nested sections. */
    nested?: boolean;
  }>(),
  { nested: true },
);
</script>

<template>
  <section
    class="lab-form-section about-topic-block mb-0"
    :class="{
      'lab-form-section--nested': nested,
      'about-topic-block--intro': !nested,
    }"
    v-bind="$attrs"
  >
    <h4 class="lab-form-section__title">
      <span class="lab-form-section__icon" aria-hidden="true"><i :class="iconClass" /></span>
      {{ title }}
    </h4>
    <div class="about-topic-block__body text-xs text-lab-general-text-muted leading-relaxed">
      <slot />
    </div>
  </section>
</template>
