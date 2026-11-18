import { ref, computed } from 'vue';
import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types/form-types';
import type { Ref, ComputedRef } from 'vue';

type UseFormCanvasReturn = {
  components: Ref<FormComponent[]>;
  selectedComponentIndex: Ref<number | null>;
  selectedComponent: ComputedRef<FormComponent | null>;
  addComponent: (component: FormComponent) => void;
  removeComponent: (index: number) => void;
  moveComponent: (fromIndex: number, toIndex: number) => void;
  selectComponent: (index: number) => void;
  updateComponent: (index: number, updates: Partial<FormComponent>) => void;
};

export function useFormCanvas(): UseFormCanvasReturn {
  const components = ref<FormComponent[]>([]);
  const selectedComponentIndex = ref<number | null>(null);

  function addComponent(component: FormComponent): void {
    components.value.push(component);
    selectedComponentIndex.value = components.value.length - 1;
  }

  function removeComponent(index: number): void {
    if (index >= 0 && index < components.value.length) {
      components.value.splice(index, 1);
      if (selectedComponentIndex.value !== null && selectedComponentIndex.value === index) {
        selectedComponentIndex.value = null;
      } else if (selectedComponentIndex.value !== null && selectedComponentIndex.value > index) {
        selectedComponentIndex.value -= 1;
      }
    }
  }

  function moveComponent(fromIndex: number, toIndex: number): void {
    if (fromIndex >= 0 && fromIndex < components.value.length &&
        toIndex >= 0 && toIndex < components.value.length) {
      const item = components.value[fromIndex];
      components.value.splice(fromIndex, 1);
      components.value.splice(toIndex, 0, item);
    }
  }

  function selectComponent(index: number): void {
    selectedComponentIndex.value = index;
  }

  function updateComponent(index: number, updates: Partial<FormComponent>): void {
    if (index >= 0 && index < components.value.length) {
      components.value[index] = { ...components.value[index], ...updates };
    }
  }

  const selectedComponent = computed(() => {
    return selectedComponentIndex.value !== null && 
           selectedComponentIndex.value < components.value.length
      ? components.value[selectedComponentIndex.value]
      : null;
  });

  return {
    components,
    selectedComponentIndex,
    selectedComponent,
    addComponent,
    removeComponent,
    moveComponent,
    selectComponent,
    updateComponent,
  };
}
