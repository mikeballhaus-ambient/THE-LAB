import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { prepareFormRuntimeFields } from '@/shared/forms/form-runtime-fields';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';

/**
 * Designer preview uses `component.type`; canvas may still show a control from `definition.type`
 * when wiring changed type (e.g. Select → Radio). Prefer the definition type for preview parity.
 */
export function normalizeComponentsForRuntimePreview(
  components: FormComponent[] | undefined,
): FormComponent[] {
  return prepareFormRuntimeFields((components ?? []) as IFormRuntimeField[]) as FormComponent[];
}
