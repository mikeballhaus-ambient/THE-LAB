import type { InjectionKey, Ref } from 'vue';

export const FORM_DESIGN_GRID_COLUMNS_KEY: InjectionKey<Ref<number>> = Symbol(
  'formDesignGridColumns',
);
