import type { DataConnector, FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import type { FormBuilderContractModelProperty } from '@/shared/types';
import type { FieldValidationRule } from '@/shared/forms/form-field-validation';
import { clampFormGridColumns, DEFAULT_FORM_GRID_COLUMNS, normalizedCol } from '@/shared/forms/form-layout';

const SKIP_FIELD_KEYS = new Set(['id']);

function markOccupied(
  row: number,
  col: number,
  span: number,
  gridCols: number,
  occupied: Set<string>,
): void {
  for (let c = col; c < col + span && c < gridCols; c += 1) {
    occupied.add(`${row},${c}`);
  }
}

function seedOccupiedFromCanvas(
  existingComponents: Array<Pick<FormComponent, 'row' | 'col' | 'span'>>,
  gridCols: number,
): Set<string> {
  const occupied = new Set<string>();
  for (const c of existingComponents) {
    const row = c.row ?? 0;
    const col = normalizedCol(c.col);
    const span = c.span ?? 1;
    markOccupied(row, col, span, gridCols, occupied);
  }
  return occupied;
}

function nextSlot(
  occupied: Set<string>,
  gridCols: number,
  startIndex = 0,
): { row: number; col: number; nextIndex: number } {
  let index = startIndex;
  for (;;) {
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    if (!occupied.has(`${row},${col}`)) {
      return { row, col, nextIndex: index + 1 };
    }
    index += 1;
  }
}

function lookupOptionCount(lookup: { endpoint?: { response?: unknown } }): number {
  const response = lookup.endpoint?.response;
  return Array.isArray(response) ? response.length : 0;
}

/** Radio when fewer than 3 options; Select when 3 or more (or unknown). */
export function controlTypeForLookupOptionCount(count: number): 'Select' | 'RadioButton' {
  return count > 0 && count < 3 ? 'RadioButton' : 'Select';
}

export function controlTypeForProperty(
  prop: FormBuilderContractModelProperty,
  lookup: { forProperty: string; endpoint?: { response?: unknown } } | undefined,
  resolvedOptionCount?: number,
): string {
  if (prop.controlType?.trim()) {
    return prop.controlType.trim();
  }
  if (prop.type === 'array') {
    return 'MultiSelect';
  }

  if (lookup) {
    const count = resolvedOptionCount ?? lookupOptionCount(lookup);
    return controlTypeForLookupOptionCount(count);
  }

  switch (prop.type) {
    case 'number':
      return 'NumberInput';
    case 'boolean':
      return 'Checkbox';
    case 'date':
      return 'DatePicker';
    default: {
      const key = prop.name.toLowerCase();
      if (key === 'definitionjson' || key.endsWith('definitionjson')) {
        return 'LabCollapsibleJson';
      }
      if (key === 'columnsjson') {
        return 'LabKanbanBoardColumns';
      }
      if (key.includes('desc') || key.includes('note') || key.endsWith('json')) {
        return 'Textarea';
      }
      return 'InputText';
    }
  }
}

/** Build form canvas components from a connector entity model and lookup endpoints. */
export function buildComponentsFromConnector(
  connector: DataConnector,
  existingFieldKeys: Iterable<string> = [],
  existingComponents: Array<Pick<FormComponent, 'row' | 'col' | 'span'>> = [],
  gridCols: number = DEFAULT_FORM_GRID_COLUMNS,
  lookupOptionCounts?: Map<string, number>,
): FormComponent[] {
  const cols = clampFormGridColumns(gridCols);
  const existing = new Set(existingFieldKeys);
  const properties = connector.entityModel?.properties ?? [];
  const lookups = connector.endpoints?.lookups ?? [];
  const lookupByProperty = new Map(lookups.map((l) => [l.forProperty, l]));

  const occupied = seedOccupiedFromCanvas(existingComponents, cols);
  let slotIndex = 0;
  const components: FormComponent[] = [];

  for (const prop of properties) {
    if (SKIP_FIELD_KEYS.has(prop.name) || existing.has(prop.name)) {
      continue;
    }

    if (prop.hidden === true) {
      const { row, col, nextIndex } = nextSlot(occupied, cols, slotIndex);
      slotIndex = nextIndex;
      markOccupied(row, col, 1, cols, occupied);
      components.push({
        fieldKey: prop.name,
        label: prop.label?.trim() || prop.name,
        type: controlTypeForProperty(prop, lookupByProperty.get(prop.name), lookupOptionCounts?.get(prop.name)),
        required: prop.required === true,
        hidden: true,
        row,
        col,
        span: 1,
        hAlign: 'left',
        vAlign: 'top',
        labelLayout: 'vertical',
      });
      continue;
    }

    const lookup = lookupByProperty.get(prop.name);
    const type = controlTypeForProperty(prop, lookup, lookupOptionCounts?.get(prop.name));

    const { row, col, nextIndex } = nextSlot(occupied, cols, slotIndex);
    slotIndex = nextIndex;
    markOccupied(row, col, 1, cols, occupied);

    const component: FormComponent = {
      fieldKey: prop.name,
      label: prop.label?.trim() || prop.name.replace(/_/g, ' '),
      type,
      required: prop.required === true,
      row,
      col,
      span: 1,
      hAlign: 'left',
      vAlign: 'top',
      labelLayout: 'vertical',
    };

    if (prop.type === 'number' && prop.numberScale === 'usd-cents') {
      component.numberScale = 'usd-cents';
      component.minFractionDigits = 2;
      component.maxFractionDigits = 2;
      component.step = 0.01;
    }

    if (prop.type === 'date' && prop.dateOnly === true) {
      component.dateOnly = true;
    }

    if (lookup) {
      component.dataFetch = {
        forProperty: lookup.forProperty,
        endpoint: lookup.endpoint,
      };
    }

    components.push(component);
  }

  return components;
}

/** Form-level validation rules from entity model (visible, non-id properties only). */
export function buildValidationRulesFromEntityProperties(
  properties: FormBuilderContractModelProperty[],
): Record<string, FieldValidationRule[]> {
  const rules: Record<string, FieldValidationRule[]> = {};
  for (const prop of properties) {
    if (SKIP_FIELD_KEYS.has(prop.name) || prop.hidden === true || prop.required !== true) {
      continue;
    }
    const label = prop.label?.trim() || prop.name.replace(/_/g, ' ');
    rules[prop.name] = [{ rule: 'required', message: `${label} is required.` }];
  }
  return rules;
}
