import { inject, unref, type InjectionKey, type Ref } from 'vue';

export const FORM_RUNTIME_READ_ONLY_KEY: InjectionKey<boolean | Ref<boolean>> =
  Symbol('formRuntimeReadOnly');

export function useFormFieldReadOnly(): boolean {
  const flag = inject(FORM_RUNTIME_READ_ONLY_KEY, false);
  return unref(flag);
}
