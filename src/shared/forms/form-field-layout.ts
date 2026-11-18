import type { IFormGridField } from './form-layout-types';

export type FormLabelLayout = 'vertical' | 'horizontal';

export interface FormFieldLayoutSource extends Pick<IFormGridField, 'hAlign' | 'vAlign'> {
  labelLayout?: FormLabelLayout;
}

export function resolveLabelLayout(source: FormFieldLayoutSource | undefined): FormLabelLayout {
  return source?.labelLayout ?? 'vertical';
}

export function getFormFieldShellClasses(source: FormFieldLayoutSource | undefined): {
  root: string;
  label: string;
  control: string;
} {
  const layout = resolveLabelLayout(source);
  if (layout === 'horizontal') {
    return {
      root: 'flex w-full min-w-0 flex-row items-center gap-2',
      label: 'shrink-0 text-inherit leading-tight',
      control: 'min-w-0 flex-1 basis-auto w-auto',
    };
  }
  return {
    root: 'flex w-full min-w-0 flex-col items-start gap-1',
    label: 'text-inherit leading-tight',
    control: 'w-full min-w-0',
  };
}
