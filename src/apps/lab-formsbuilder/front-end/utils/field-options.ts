export const MANUAL_OPTIONS_CONTROL_TYPES = new Set(['Select', 'RadioButton', 'MultiSelect']);

export function supportsManualFieldOptions(componentType: string): boolean {
  return MANUAL_OPTIONS_CONTROL_TYPES.has(componentType);
}

export type FieldOptionRow = { label: string; value: string };

export function optionRowsFromComponent(
  options?: Array<{ label: string; value: string }>,
): FieldOptionRow[] {
  if (!options?.length) {
    return [{ label: 'Option 1', value: 'option-1' }];
  }
  return options.map(o => ({
    label: o.label ?? '',
    value: o.value ?? '',
  }));
}

export function buildFieldOptionsFromRows(
  rows: FieldOptionRow[],
): Array<{ label: string; value: string }> {
  const mapped = rows.map((row, index) => ({
    label: row.label.trim() || `Option ${index + 1}`,
    value: row.value.trim() || `option-${index + 1}`,
  }));
  if (mapped.length === 0) {
    return [{ label: 'Option 1', value: 'option-1' }];
  }
  return mapped;
}
