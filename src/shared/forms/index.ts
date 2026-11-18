export type {
  FormGridFieldSlotProps,
  FormGridHorizontalAlign,
  FormGridVerticalAlign,
  IFormGridField,
} from './form-layout-types';

export type { IFormRuntimeField, LoadedFormSchema } from './form-runtime-types';

export {
  DEFAULT_FORM_GRID_COLUMNS,
  MIN_FORM_GRID_COLUMNS,
  MAX_FORM_GRID_COLUMNS,
  clampFormGridColumns,
  clampFormComponentsToGridColumns,
  formGridColumnOptions,
  GRID_COLS,
  normalizedCol,
  getFormRowIndices,
  getFormFieldsInRow,
  getFormCellSpanClass,
  getFormCellAlignClasses,
  buildFormGridFieldSlotProps,
  migrateLegacyFormGridCols,
  resolveHorizontalAlign,
  resolveVerticalAlign,
} from './form-layout';

export type { FormLabelLayout, FormFieldLayoutSource } from './form-field-layout';
export { resolveLabelLayout, getFormFieldShellClasses } from './form-field-layout';

export {
  FORM_INVALID_FIELD_KEYS_KEY,
  getFieldValidationRules,
  isFieldRequired,
  isEmptyFieldValue,
  validateFieldValue,
  validateFormFields,
} from './form-field-validation';
export type {
  FieldValidationRule,
  FieldValidationRulesMap,
  FieldValidationSource,
  FormFieldValidationError,
  ValidateFieldResult,
  ValidateFormFieldsResult,
} from './form-field-validation';

export {
  DEFAULT_LABEL_DISPLAY_STYLE,
  LABEL_FONT_WEIGHT_OPTIONS,
  LABEL_TEXT_ALIGN_OPTIONS,
  LABEL_TEXT_COLOR_OPTIONS,
  LABEL_TEXT_SIZE_OPTIONS,
  buildLabelTailwindClasses,
  isStaticLabelComponentType,
  normalizeLabelDisplayStyle,
} from './label-display-style';
export type { LabelDisplayStyle } from './label-display-style';

export {
  DEFAULT_FORM_ACTIONS_CONFIG,
  FORM_ACTIONS_BAR_ALIGN_OPTIONS,
  FORM_ACTIONS_BAR_GAP_OPTIONS,
  FORM_ACTIONS_PRIMARY_PRESETS,
  FORM_ACTIONS_SECONDARY_PRESETS,
  buildFormActionsBarClasses,
  buildFormPrimaryButtonClasses,
  buildFormSecondaryButtonClasses,
  normalizeFormActionsConfig,
  resolveFormActionsBarJustify,
  resolvePrimaryActionLabel,
} from './form-actions-config';
export type { FormActionButtonStyle, FormActionsConfig } from './form-actions-config';

export { default as FormFieldShell } from './FormFieldShell.vue';
export { default as FormActionsBar } from './FormActionsBar.vue';

export { default as FormGrid } from './FormGrid.vue';
export { default as FormField } from './FormField.vue';
export { default as FormRuntime } from './FormRuntime.vue';
export { default as FormMounter } from './FormMounter.vue';
export { default as FormLayoutPreview } from './FormLayoutPreview.vue';
export { useFormFieldReadOnly, FORM_RUNTIME_READ_ONLY_KEY } from './form-runtime-readonly';
export { createSchemaFieldValuesStore } from './design-canvas-values';
export { FORM_RUNTIME_VALUES_KEY } from './form-runtime-values';
export { loadFormSchema, type LoadFormSchemaOptions } from './load-form-schema';
export {
  hydrateFormRuntimeLookups,
  fetchLookupOptions,
  mapLookupResponseToOptions,
  type LookupOption,
  type LookupFetchContext,
} from './form-lookup-options';
export {
  resolveConnectorApiBaseUrl,
  resolveLookupFetchUrl,
  resolveEffectiveDataFetch,
  type FormLookupConnector,
} from './form-data-fetch';

export {
  buildFormSubmitPayload,
  mapRecordToFieldValues,
} from './form-submit-payload';

export {
  submitFormToFormsBuilder,
  type FormsBuilderSubmissionResult,
} from './submit-to-forms-builder';

export { submitRecordToConnectorApi, deleteRecordViaConnectorApi } from './submit-to-connector-api';

export { useConnectorFormPanel } from './useConnectorFormPanel';
export type {
  ConnectorFormSubmitMode,
  UseConnectorFormPanelOptions,
} from './useConnectorFormPanel';

export { default as ConnectorFormPanel } from './ConnectorFormPanel.vue';

export {
  mergeFormValidationIntoRuntimeFields,
  normalizeRuntimeFieldTypes,
  prepareFormRuntimeFields,
} from './form-runtime-fields';

export {
  formValidationErrorFromResult,
  formatFieldValidationErrorLine,
  formatFieldValidationErrorSummary,
  getFieldErrorsFromError,
} from './form-validation-error';
export type { FormValidationError } from './form-validation-error';

export { default as FormValidationErrorsBanner } from './FormValidationErrorsBanner.vue';

export {
  clampGroupInnerColumns,
  groupContainerChildrenStyle,
  groupContainerWrapperStyle,
  groupInnerColumnOptions,
  resolveGroupChildrenDirection,
  DEFAULT_GROUP_INNER_COLUMNS,
  MIN_GROUP_INNER_COLUMNS,
  MAX_GROUP_INNER_COLUMNS,
} from './group-container-layout';
export type { GroupChildrenDirection, GroupContainerLayoutStyle } from './group-container-layout';
