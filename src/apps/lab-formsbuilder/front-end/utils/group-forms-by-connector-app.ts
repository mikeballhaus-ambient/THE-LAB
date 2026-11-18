import type { FormSchema } from '@/apps/lab-formsbuilder/shared/types';

export const UNLINKED_FORMS_GROUP_KEY = '__unlinked__';
export const UNLINKED_FORMS_GROUP_LABEL = 'No linked connector';

export interface FormConnectorAppGroup {
  /** Stable accordion panel value */
  key: string;
  /** Display label (connector app name) */
  label: string;
  forms: FormSchema[];
}

function resolveConnectorAppKey(form: FormSchema): { key: string; label: string } {
  const appName = (form.dataConnecter?.appName ?? '').trim();
  if (!appName) {
    return { key: UNLINKED_FORMS_GROUP_KEY, label: UNLINKED_FORMS_GROUP_LABEL };
  }
  return { key: appName, label: appName };
}

/**
 * Groups forms by linked data connector `appName` (sorted apps, unlinked last).
 */
export function groupFormsByConnectorApp(forms: FormSchema[]): FormConnectorAppGroup[] {
  const map = new Map<string, FormConnectorAppGroup>();

  for (const form of forms) {
    const { key, label } = resolveConnectorAppKey(form);
    const existing = map.get(key);
    if (existing) {
      existing.forms.push(form);
    } else {
      map.set(key, { key, label, forms: [form] });
    }
  }

  const groups = [...map.values()].map((group) => ({
    ...group,
    forms: [...group.forms].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }),
    ),
  }));

  return groups.sort((left, right) => {
    if (left.key === UNLINKED_FORMS_GROUP_KEY) {
      return 1;
    }
    if (right.key === UNLINKED_FORMS_GROUP_KEY) {
      return -1;
    }
    return left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });
  });
}
