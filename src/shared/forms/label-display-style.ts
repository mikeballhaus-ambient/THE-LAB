export interface LabelDisplayStyle {
  textSize?: string;
  textColor?: string;
  fontWeight?: string;
  textAlign?: string;
  customClasses?: string;
}

export const DEFAULT_LABEL_DISPLAY_STYLE: LabelDisplayStyle = {
  textSize: 'text-base',
  textColor: 'text-lab-general-text',
  fontWeight: 'font-medium',
  textAlign: 'text-left',
  customClasses: '',
};

export const LABEL_TEXT_SIZE_OPTIONS = [
  { label: 'Extra small', value: 'text-xs' },
  { label: 'Small', value: 'text-sm' },
  { label: 'Base', value: 'text-base' },
  { label: 'Large', value: 'text-lg' },
  { label: 'Extra large', value: 'text-xl' },
  { label: '2XL', value: 'text-2xl' },
] as const;

export const LABEL_TEXT_COLOR_OPTIONS = [
  { label: 'Primary', value: 'text-lab-general-text' },
  { label: 'Secondary', value: 'text-lab-card-title' },
  { label: 'Muted', value: 'text-lab-general-text-muted' },
  { label: 'Accent', value: 'text-lab-button-outlined-text' },
  { label: 'Success', value: 'text-emerald-400' },
  { label: 'Warning', value: 'text-amber-400' },
  { label: 'Danger', value: 'text-red-400' },
] as const;

export const LABEL_FONT_WEIGHT_OPTIONS = [
  { label: 'Normal', value: 'font-normal' },
  { label: 'Medium', value: 'font-medium' },
  { label: 'Semibold', value: 'font-semibold' },
  { label: 'Bold', value: 'font-bold' },
] as const;

export const LABEL_TEXT_ALIGN_OPTIONS = [
  { label: 'Left', value: 'text-left' },
  { label: 'Center', value: 'text-center' },
  { label: 'Right', value: 'text-right' },
] as const;

export function normalizeLabelDisplayStyle(style?: LabelDisplayStyle | null): LabelDisplayStyle {
  return {
    ...DEFAULT_LABEL_DISPLAY_STYLE,
    ...(style ?? {}),
  };
}

/** Compose Tailwind utility classes for static label text (no inline styles). */
export function buildLabelTailwindClasses(style?: LabelDisplayStyle | null): string {
  const normalized = normalizeLabelDisplayStyle(style);
  return [
    normalized.textSize,
    normalized.textColor,
    normalized.fontWeight,
    normalized.textAlign,
    normalized.customClasses?.trim(),
  ]
    .filter(Boolean)
    .join(' ');
}

export function isStaticLabelComponentType(type: string | undefined): boolean {
  return type === 'Label';
}
