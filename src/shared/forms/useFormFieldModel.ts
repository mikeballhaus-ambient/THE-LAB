import { computed, inject, type WritableComputedRef } from 'vue';
import type { IFormRuntimeField } from './form-runtime-types';
import { FORM_RUNTIME_VALUES_KEY } from './form-runtime-values';

/** Two-way binding for runtime controls (FormMounter) or direct field.value fallback. */
export function useFormFieldModel<T = unknown>(field: IFormRuntimeField): WritableComputedRef<T> {
  const store = inject(FORM_RUNTIME_VALUES_KEY, null);

  return computed({
    get: (): T => {
      if (store && field.fieldKey) {
        const stored = store.getValue(field.fieldKey);
        if (stored !== undefined) {
          return stored as T;
        }
      }
      return field.value as T;
    },
    set: (value: T) => {
      if (store && field.fieldKey) {
        store.setValue(field.fieldKey, value);
        return;
      }
      field.value = value;
    },
  });
}
