// ============================================================================
// Form Type Definitions
// ============================================================================

import { Component } from "vue"
import { DataConnector } from "./connector-types"
import { FormBuilderContractModel, LookupContract } from "@/shared/types"
import type { LabelDisplayStyle } from "@/shared/forms/label-display-style"
import type { FormActionsConfig } from "@/shared/forms/form-actions-config"

export interface FormSchemaBase {
  is_active?: boolean,
  /** Set to `null` on save to clear the form–connector link */
  dataConnecter?: DataConnector | null,
  formKey?: string
}

// FormSchema for canvas editing (uses in-memory array)
export interface FormSchema extends FormSchemaBase {
  id?: number,
  name: string
  description?: string
  components: FormComponent[],
  validationRules?: ValidationRules,
  createdAt?: string
  updatedAt?: string
  model?: FormBuilderContractModel,
  /** Root grid column count (1–8). Default 4 when omitted. */
  columns?: number,
  /** Runtime action bar (save/update/cancel) styling and labels */
  formActions?: FormActionsConfig,
}

/** Create/update API body — `dataConnecter: null` clears the link */
export type FormSchemaSaveInput = Partial<Omit<FormSchema, 'dataConnecter'>> & {
  dataConnecter?: DataConnector | null
}


export interface FormSchemaOptions extends FormSchemaBase {
  limit?: number,
  offset?: number
}

export interface FormSchemaDBReturn extends FormSchemaOptions {
  total: number,
  forms: FormSchema[]
}

export interface FormComponent {
  fieldKey: string
  label: string
  type: string // Flexible type for component type identification
  required?: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  validation?: ValidationRules
  // Note: 'value' is optional here because it's only populated after form submission
  // When reading from components_json in the database, value may not exist yet
  value?: unknown
  // Grid layout properties (for canvas editing)
  span?: number; // Number of grid columns to span (1 .. form columns)
  rowSpan?: number; // Number of grid rows to span (containers, default 1)
  row?: number; // Grid row position (0-based, starts at 0)
  col?: number; // Grid column position (0-based, starts at 0)
  /** When set, field renders inside this container's fieldKey instead of the root grid. */
  parentContainerKey?: string;
  /** Bound connector entity model property name (optional manual wiring). */
  modelProperty?: string;
  /** When true, omitted from runtime UI but still included in submit payload. */
  hidden?: boolean;
  /** When true, control is non-editable (integration presets, display-only fields). */
  readOnly?: boolean;
  container?: ContainerConfig;
  definition?: Record<string, unknown>; // Component type definition
  vAlign?: 'top' | 'middle' | 'bottom'; // Vertical alignment within grid cell
  hAlign?: 'left' | 'center' | 'right'; // Horizontal alignment within grid cell
  labelLayout?: 'vertical' | 'horizontal'; // Label stacked vs inline with control
  icon?: string; // Icon class for component (e.g., 'pi pi-key')
  dataFetch?: DataFetchConfig; // Optional connector data fetch configuration
  component?: Component

  // Type-specific properties (all optional for backward compatibility)
  maxLength?: number;       // InputText, Textarea - Maximum character count
  minLength?: number;       // InputText, Textarea - Minimum character count
  pattern?: string;         // InputText, Textarea - Regex pattern validation
  email?: boolean;          // InputText - Email format validation
  min?: number;             // NumberInput - Minimum numeric value
  max?: number;             // NumberInput - Maximum numeric value
  step?: number;            // NumberInput - Step increment for spinner buttons
  minFractionDigits?: number;
  maxFractionDigits?: number;
  numberScale?: 'usd-cents';
  allowNegative?: boolean;  // NumberInput - Allow negative numbers (default: true)
  allowClear?: boolean;     // Select, RadioButton - Allow clearing selection
  checkboxLabel?: string;   // Checkbox - Custom label text
  dateFormat?: string;      // DatePicker - Date format pattern
  showIcon?: boolean;       // DatePicker - Show calendar icon
  /** Calendar date only (no time picker); serializes YYYY-MM-DD. */
  dateOnly?: boolean;
  showTime?: boolean;
  hourFormat?: '12' | '24';
  labelDisplay?: LabelDisplayStyle;
}

export interface ValidationRules {
  [fieldKey: string]: Array<{
    rule: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'number',
    pattern?: string
    message?: string
  }>
}

// DataFetchConfig - Used for connector data fetching
export interface DataFetchConfig extends LookupContract {
  transform?: (data: Record<string, unknown>) => Record<string, unknown>;  // Optional transform function
}

export interface GroupContainerStyle {
  showTitle?: boolean;
  backgroundColor?: string;
  borderRadius?: string;
  padding?: string;
  margin?: string;
  borderWidth?: string;
  borderColor?: string;
  /** Stack children vertically (default) or in a horizontal grid with wrapping. */
  childrenDirection?: 'vertical' | 'horizontal';
  /** When horizontal, number of columns before wrapping (1–8). */
  innerColumns?: number;
  innerLayout?: 'flex' | 'grid';
  flexDirection?: 'row' | 'column';
  gap?: string;
}

export interface TabPanelDef {
  title: string;
  childFieldKeys: string[];
}

export interface ContainerConfig {
  kind: 'group' | 'tabs';
  groupStyle?: GroupContainerStyle;
  tabs?: TabPanelDef[];
}