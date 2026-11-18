import type { IFormGridField } from './form-layout-types';

/**
 * Field metadata returned from forms-builder APIs and used at runtime.
 * Layout (row/col/span/align) is consumed by FormGrid; type/label by FormField.
 */
import type { LabelDisplayStyle } from '@/shared/forms/label-display-style';
import type { FormActionsConfig } from '@/shared/forms/form-actions-config';
import type { FieldValidationRulesMap } from '@/shared/forms/form-field-validation';

export interface IFormRuntimeField extends IFormGridField {
  type: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  value?: unknown;
  dataFetch?: unknown;
  validation?: FieldValidationRulesMap;
  parentContainerKey?: string;
  container?: {
    tabs?: Array<{ title: string; childFieldKeys?: string[] }>;
  };
  checkboxLabel?: string;
  modelProperty?: string;
  hidden?: boolean;
  /** When true, control is non-editable at runtime. */
  readOnly?: boolean;
  min?: number;
  max?: number;
  step?: number;
  dateFormat?: string;
  /** NumberInput: fixed decimal places (defaults: 2 for `numberScale` usd-cents, else 0). */
  minFractionDigits?: number;
  maxFractionDigits?: number;
  /** API stores integer cents; runtime shows USD with two decimal places. */
  numberScale?: 'usd-cents';
  showIcon?: boolean;
  /** When true, DatePicker is calendar-only (no time); serializes YYYY-MM-DD. Default is date+time. */
  dateOnly?: boolean;
  /** When false, hide time even if dateOnly is not set (rare). Default shows time unless dateOnly. */
  showTime?: boolean;
  hourFormat?: '12' | '24';
  labelDisplay?: LabelDisplayStyle;
  definition?: { type?: string } | unknown;
}

export interface LoadedFormSchema {
  formKey?: string;
  name?: string;
  description?: string;
  components: IFormRuntimeField[];
  validationRules?: FieldValidationRulesMap;
  dataConnecter?: unknown;
  model?: unknown;
  /** Root grid column count (1–8). Defaults to 4 when omitted. */
  columns?: number;
  /** Save / update / cancel bar shown below fields (FormMounter & preview). */
  formActions?: FormActionsConfig;
}
