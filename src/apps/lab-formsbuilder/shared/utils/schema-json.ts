import type { FormBuilderContractModel } from '@/shared/types';
import type { FormActionsConfig } from '@/shared/forms/form-actions-config';
import {
  clampFormGridColumns,
  DEFAULT_FORM_GRID_COLUMNS,
} from '@/shared/forms/form-layout';
import { normalizeFormActionsConfig } from '@/shared/forms/form-actions-config';

const GRID_COLUMNS_JSON_KEY = 'gridColumns';
const FORM_ACTIONS_JSON_KEY = 'formActions';

export interface ParsedFormSchemaJson {
  model: FormBuilderContractModel | Record<string, unknown>;
  columns: number;
  formActions?: FormActionsConfig;
}

export function parseFormSchemaJson(raw: string | null | undefined): ParsedFormSchemaJson {
  if (!raw) {
    return { model: {}, columns: DEFAULT_FORM_GRID_COLUMNS };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') {
      return { model: {}, columns: DEFAULT_FORM_GRID_COLUMNS };
    }
    const columns = clampFormGridColumns(parsed[GRID_COLUMNS_JSON_KEY]);
    const formActionsRaw = parsed[FORM_ACTIONS_JSON_KEY];
    const formActions =
      formActionsRaw && typeof formActionsRaw === 'object' && !Array.isArray(formActionsRaw)
        ? normalizeFormActionsConfig(formActionsRaw as FormActionsConfig)
        : undefined;
    const model = { ...parsed };
    delete model[GRID_COLUMNS_JSON_KEY];
    delete model[FORM_ACTIONS_JSON_KEY];
    return { model, columns, formActions };
  } catch {
    return { model: {}, columns: DEFAULT_FORM_GRID_COLUMNS };
  }
}

export function serializeFormSchemaJson(
  model: FormBuilderContractModel | Record<string, unknown> | undefined,
  columns?: number,
  formActions?: FormActionsConfig,
): string {
  const base =
    model && typeof model === 'object' && !Array.isArray(model)
      ? { ...model }
      : {};
  const clamped = clampFormGridColumns(columns ?? DEFAULT_FORM_GRID_COLUMNS);
  if (clamped !== DEFAULT_FORM_GRID_COLUMNS) {
    (base as Record<string, unknown>)[GRID_COLUMNS_JSON_KEY] = clamped;
  }
  if (formActions) {
    (base as Record<string, unknown>)[FORM_ACTIONS_JSON_KEY] = normalizeFormActionsConfig(formActions);
  }
  return JSON.stringify(base);
}
