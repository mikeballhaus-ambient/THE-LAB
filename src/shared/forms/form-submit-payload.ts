import type { IFormRuntimeField } from './form-runtime-types';
import { formatCalendarDate, formatLocalDateTime, parseDueDateValue } from '@/shared/utils/calendar-date';

export const FORM_NON_DATA_FIELD_TYPES = new Set([
  'Label',
  'Group',
  'Tabs',
  'LabApprovalPolicySteps',
  'LabRuleDefinitionGuide',
  'LabWorkflowDefinitionGuide',
]);

const NON_DATA_FIELD_TYPES = FORM_NON_DATA_FIELD_TYPES;

const OPTION_FIELD_TYPES = new Set(['Select', 'RadioButton']);
const MULTI_OPTION_FIELD_TYPES = new Set(['MultiSelect']);

/** Id column paired with manifest person / lab-user lookup fields (not always `{prop}Id`). */
const LOOKUP_ID_PROPERTY: Record<string, string> = {
  guestName: 'guestUserId',
  teamMember: 'userId',
};

function lookupIdProperty(modelProperty: string): string {
  return LOOKUP_ID_PROPERTY[modelProperty] ?? `${modelProperty}Id`;
}

function fieldHasLookupOptions(field: IFormRuntimeField): boolean {
  return Boolean(field.dataFetch) || (field.options?.length ?? 0) > 0;
}

function rawValueFromRecord(
  field: IFormRuntimeField,
  record: Record<string, unknown>,
  prop: string,
): unknown {
  if (OPTION_FIELD_TYPES.has(field.type) && fieldHasLookupOptions(field)) {
    const idProp = lookupIdProperty(prop);
    if (Object.prototype.hasOwnProperty.call(record, idProp)) {
      const idRaw = record[idProp];
      if (idRaw != null && idRaw !== '') {
        return idRaw;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(record, prop)) {
    return record[prop];
  }

  return undefined;
}

/** Map stored enum labels or legacy casing to the option `value` declared on the field. */
function matchEnumOptionValue(field: IFormRuntimeField, raw: unknown): unknown {
  if (!OPTION_FIELD_TYPES.has(field.type) || !field.options?.length) {
    return raw;
  }
  if (raw == null || raw === '') {
    return raw;
  }
  const text = String(raw).trim();
  for (const opt of field.options) {
    const value = String(opt.value);
    const label = opt.label != null ? String(opt.label) : value;
    if (value === text || label === text) {
      return value;
    }
    if (value.toLowerCase() === text.toLowerCase() || label.toLowerCase() === text.toLowerCase()) {
      return value;
    }
  }
  return raw;
}

/** Parse connector/API date strings for PrimeVue DatePicker. */
export function parseDateFieldValue(raw: unknown): Date | undefined {
  return parseDueDateValue(raw);
}

/** Normalize connector record values for runtime controls (edit / preview). */
export function coerceRecordValueForField(
  field: IFormRuntimeField,
  raw: unknown,
): unknown {
  if (raw === undefined) {
    return undefined;
  }

  if (field.type === 'DatePicker') {
    return parseDateFieldValue(raw);
  }

  if (OPTION_FIELD_TYPES.has(field.type)) {
    if (raw === null || raw === '') {
      return undefined;
    }
    return String(raw);
  }

  if (MULTI_OPTION_FIELD_TYPES.has(field.type)) {
    if (!Array.isArray(raw)) {
      return raw === null || raw === '' ? [] : [String(raw)];
    }
    return raw.map((item) => String(item));
  }

  if (field.type === 'NumberInput' && field.numberScale === 'usd-cents') {
    if (raw === null || raw === '') {
      return undefined;
    }
    const cents = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(cents)) {
      return undefined;
    }
    return cents / 100;
  }

  return raw;
}

/** Serialize runtime control values for connector CRUD bodies. */
export function serializeFieldValueForConnector(
  field: IFormRuntimeField,
  raw: unknown,
): unknown {
  if (raw === undefined) {
    return undefined;
  }
  if (field.type === 'DatePicker') {
    if (raw instanceof Date) {
      if (Number.isNaN(raw.getTime())) {
        return undefined;
      }
      return field.dateOnly === true ? formatCalendarDate(raw) : formatLocalDateTime(raw);
    }
    const text = String(raw).trim();
    return text || undefined;
  }
  if (field.type === 'NumberInput' && field.numberScale === 'usd-cents') {
    if (raw === null || raw === '') {
      return undefined;
    }
    const dollars = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(dollars)) {
      return undefined;
    }
    return Math.round(dollars * 100);
  }
  return raw;
}

export function buildFormSubmitPayload(
  fields: IFormRuntimeField[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.fieldKey || NON_DATA_FIELD_TYPES.has(field.type)) {
      continue;
    }
    const prop = field.modelProperty ?? field.fieldKey;
    const raw =
      values[field.fieldKey] !== undefined ? values[field.fieldKey] : field.value;
    if (raw !== undefined) {
      data[prop] = serializeFieldValueForConnector(field, raw);
    }
  }
  return data;
}

export function mapRecordToFieldValues(
  fields: IFormRuntimeField[],
  record: Record<string, unknown>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.fieldKey || NON_DATA_FIELD_TYPES.has(field.type)) {
      continue;
    }
    const prop = field.modelProperty ?? field.fieldKey;
    const raw = rawValueFromRecord(field, record, prop);
    if (raw === undefined) {
      continue;
    }
    const normalized = matchEnumOptionValue(field, raw);
    const coerced = coerceRecordValueForField(field, normalized);
    if (coerced !== undefined) {
      values[field.fieldKey] = coerced;
    }
  }
  return values;
}
