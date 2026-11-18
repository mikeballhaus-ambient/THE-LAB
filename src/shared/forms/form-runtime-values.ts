import type { InjectionKey } from 'vue';

export interface FormRuntimeValuesStore {
  getValue: (fieldKey: string) => unknown;
  setValue: (fieldKey: string, value: unknown) => void;
}

export const FORM_RUNTIME_VALUES_KEY: InjectionKey<FormRuntimeValuesStore> =
  Symbol('formRuntimeValues');
