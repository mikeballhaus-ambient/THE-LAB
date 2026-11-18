<script setup lang="ts">
import { computed, inject, ref, unref } from 'vue';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import type { FormComponent } from '../../../shared/types';
import ContainerChildPlacedContent from './ContainerChildPlacedContent.vue';
import {
  getChildComponents,
  groupContainerChildrenStyle,
  groupContainerWrapperStyle,
} from '../../utils/container-types';
import { FORM_COMPONENTS_KEY } from '@/shared/forms/form-components-context';
import { FORM_DESIGN_CONTAINER_DROP_KEY } from './design-container-context';

const props = defineProps<{
  component: FormComponent;
}>();

const allComponents = computed(
  () =>
    (unref(inject(FORM_COMPONENTS_KEY, ref<IFormRuntimeField[]>([]))) ?? []) as FormComponent[],
);
const containerDropEnabled = inject(FORM_DESIGN_CONTAINER_DROP_KEY, null);

const children = computed(() => getChildComponents(props.component, allComponents.value));

const wrapperStyle = computed(() =>
  groupContainerWrapperStyle(props.component.container?.groupStyle),
);

const childrenLayoutStyle = computed(() =>
  groupContainerChildrenStyle(props.component.container?.groupStyle),
);

const showTitle = computed(
  () => props.component.container?.groupStyle?.showTitle !== false,
);
</script>

<template>
  <div class="group-container w-full h-full min-h-[4rem] box-border" :style="wrapperStyle">
    <div v-if="showTitle" class="text-sm font-semibold text-lab-general-text mb-1">
      {{ component.label }}
    </div>
    <div
      v-if="containerDropEnabled"
      class="container-drop-zone min-h-[3rem] w-full rounded-md border border-dashed border-lab-general-border/80 bg-lab-general-bg-muted/50 p-2 transition-colors box-border"
      :style="childrenLayoutStyle"
      :data-container-key="component.fieldKey"
    >
      <ContainerChildPlacedContent
        v-for="child in children"
        :key="child.fieldKey"
        :component="child"
        :all-components="allComponents"
      />
      <p v-if="children.length === 0" class="text-lab-general-text-muted text-xs m-0 text-center py-2 pointer-events-none">
        Drop components here
      </p>
    </div>
    <div
      v-else
      class="group-container__body w-full min-h-[2rem] box-border"
      :style="childrenLayoutStyle"
    >
      <ContainerChildPlacedContent
        v-for="child in children"
        :key="child.fieldKey"
        :component="child"
        :all-components="allComponents"
      />
      <p v-if="children.length === 0" class="text-lab-general-text-muted text-xs m-0">
        Assign fields to this group via Parent container in the property panel.
      </p>
    </div>
  </div>
</template>
