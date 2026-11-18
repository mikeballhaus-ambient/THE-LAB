<script setup lang="ts">
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = withDefaults(
  defineProps<{
    title: string;
    lead?: string;
    /** Full PrimeIcons class, e.g. `pi pi-list`. */
    icon?: string;
    sectionClass?: string;
    nested?: boolean;
    idPrefix?: string;
  }>(),
  {
    lead: '',
    icon: 'pi pi-list',
    sectionClass: '',
    nested: false,
    idPrefix: 'catalog-section',
  },
);

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <section
    :class="[
      'lab-form-section',
      nested ? 'lab-form-section--nested' : '',
      props.sectionClass,
    ]"
    :id="generateUniqueId(idPrefix)"
  >
    <h4 class="lab-form-section__title m-0" :id="generateUniqueId(`${idPrefix}-title`)">
      <span class="lab-form-section__icon" aria-hidden="true">
        <i :class="icon" />
      </span>
      {{ title }}
    </h4>
    <p v-if="lead" class="lab-form-section__lead m-0" :id="generateUniqueId(`${idPrefix}-lead`)">
      {{ lead }}
    </p>
    <slot />
  </section>
</template>
