export interface FormActionButtonStyle {
  /** Tailwind utility classes applied to the button element */
  customClasses?: string;
}

export interface FormActionsConfig {
  showSave?: boolean;
  showCancel?: boolean;
  saveLabel?: string;
  updateLabel?: string;
  cancelLabel?: string;
  /** Horizontal alignment of the action bar */
  barAlign?: 'left' | 'center' | 'right';
  /** Tailwind gap class between buttons (e.g. gap-2) */
  barGap?: string;
  barCustomClasses?: string;
  primaryButton?: FormActionButtonStyle;
  secondaryButton?: FormActionButtonStyle;
}

export const DEFAULT_FORM_ACTIONS_CONFIG: FormActionsConfig = {
  showSave: true,
  showCancel: true,
  saveLabel: 'Save',
  updateLabel: 'Update',
  cancelLabel: 'Cancel',
  barAlign: 'right',
  barGap: 'gap-2',
  barCustomClasses: 'lab-form-action-bar',
  primaryButton: {
    customClasses: 'lab-form-action-primary',
  },
  secondaryButton: {
    customClasses: 'lab-form-action-secondary',
  },
};

export const FORM_ACTIONS_BAR_ALIGN_OPTIONS = [
  { label: 'Left', value: 'justify-start' },
  { label: 'Center', value: 'justify-center' },
  { label: 'Right', value: 'justify-end' },
] as const;

export const FORM_ACTIONS_BAR_GAP_OPTIONS = [
  { label: 'Tight', value: 'gap-1' },
  { label: 'Normal', value: 'gap-2' },
  { label: 'Relaxed', value: 'gap-4' },
] as const;

export const FORM_ACTIONS_PRIMARY_PRESETS = [
  {
    label: 'Platform primary (default)',
    value: 'lab-form-action-primary',
  },
  {
    label: 'Emerald',
    value:
      'px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-lab-general-text text-sm font-medium disabled:opacity-50',
  },
  {
    label: 'Slate solid',
    value:
      'px-4 py-2 rounded-md bg-lab-general-bg-muted hover:bg-lab-general-bg-muted text-lab-general-text text-sm font-medium disabled:opacity-50',
  },
] as const;

export const FORM_ACTIONS_SECONDARY_PRESETS = [
  {
    label: 'Outlined (default)',
    value: 'lab-form-action-secondary',
  },
  {
    label: 'Ghost',
    value:
      'px-4 py-2 rounded-md text-lab-general-text-muted text-sm font-medium hover:bg-lab-general-bg-muted/60 disabled:opacity-50',
  },
  {
    label: 'Muted border',
    value:
      'px-4 py-2 rounded-md border border-lab-general-border/40 text-lab-general-text-muted text-sm font-medium hover:border-lab-button-border-hover disabled:opacity-50',
  },
] as const;

export function normalizeFormActionsConfig(
  config?: FormActionsConfig | null,
): FormActionsConfig {
  return {
    ...DEFAULT_FORM_ACTIONS_CONFIG,
    ...(config ?? {}),
    primaryButton: {
      ...DEFAULT_FORM_ACTIONS_CONFIG.primaryButton,
      ...(config?.primaryButton ?? {}),
    },
    secondaryButton: {
      ...DEFAULT_FORM_ACTIONS_CONFIG.secondaryButton,
      ...(config?.secondaryButton ?? {}),
    },
  };
}

export function resolveFormActionsBarJustify(
  align?: FormActionsConfig['barAlign'],
): string {
  switch (align) {
    case 'left':
      return 'justify-start';
    case 'center':
      return 'justify-center';
    case 'right':
    default:
      return 'justify-end';
  }
}

export function buildFormActionsBarClasses(config?: FormActionsConfig | null): string {
  const normalized = normalizeFormActionsConfig(config);
  return [
    'flex flex-wrap items-center w-full',
    resolveFormActionsBarJustify(normalized.barAlign),
    normalized.barGap,
    normalized.barCustomClasses?.trim(),
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildFormPrimaryButtonClasses(config?: FormActionsConfig | null): string {
  return normalizeFormActionsConfig(config).primaryButton?.customClasses?.trim() ?? '';
}

export function buildFormSecondaryButtonClasses(config?: FormActionsConfig | null): string {
  return normalizeFormActionsConfig(config).secondaryButton?.customClasses?.trim() ?? '';
}

export function resolvePrimaryActionLabel(
  config: FormActionsConfig | null | undefined,
  isEditMode: boolean,
): string {
  const normalized = normalizeFormActionsConfig(config);
  return isEditMode ? normalized.updateLabel ?? 'Update' : normalized.saveLabel ?? 'Save';
}
