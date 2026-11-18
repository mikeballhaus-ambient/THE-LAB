import type { FormRuntimeValuesStore } from './form-runtime-values';

type SchemaField = { fieldKey?: string; value?: unknown };

/** Binds FORM_RUNTIME_VALUES_KEY to live designer schema components (mutates .value in place). */
export function createSchemaFieldValuesStore(
  getComponents: () => SchemaField[],
): FormRuntimeValuesStore {
  return {
    getValue(fieldKey: string) {
      return getComponents().find(c => c.fieldKey === fieldKey)?.value;
    },
    setValue(fieldKey: string, value: unknown) {
      const comp = getComponents().find(c => c.fieldKey === fieldKey);
      if (comp) {
        comp.value = value;
      }
    },
  };
}
