import type { InjectionKey, Ref } from 'vue';
import type { IFormRuntimeField } from './form-runtime-types';

/** All form fields for runtime containers and the forms-builder design canvas (provided as a ref). */
export const FORM_COMPONENTS_KEY: InjectionKey<Ref<IFormRuntimeField[]>> = Symbol('formRuntimeComponents');
