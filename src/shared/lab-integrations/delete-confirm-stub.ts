import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import type { FormActionsConfig } from '@/shared/forms/form-actions-config';
import { DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';

const DANGER_PRIMARY_CLASSES =
  'px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-lab-button-text text-sm font-medium disabled:opacity-50';

export function isLabIntegrationDeleteSlot(slot: string): boolean {
  return slot.includes('.delete.');
}

export function defaultDeleteConfirmMessage(slot: string, entityName: string): string {
  if (slot.includes('task-list')) {
    return (
      'Remove this task list? Tasks are unlinked from the list; task records themselves are not deleted. ' +
      'This cannot be undone.'
    );
  }
  if (slot.includes('task')) {
    return 'Delete this task permanently? This cannot be undone.';
  }
  return `Delete this ${entityName}? This cannot be undone.`;
}

export function primaryDeleteActionLabel(slot: string): string {
  return slot.includes('task-list') ? 'Remove list' : 'Delete';
}

export function buildDeleteConfirmFormComponents(message: string): FormComponent[] {
  const cols = DEFAULT_FORM_GRID_COLUMNS;
  return [
    {
      fieldKey: 'confirmMessage',
      label: message,
      type: 'Label',
      row: 0,
      col: 0,
      span: cols,
      hAlign: 'left',
      vAlign: 'top',
      labelLayout: 'vertical',
    },
  ];
}

export function buildDeleteConfirmFormActions(slot: string): FormActionsConfig {
  const verb = primaryDeleteActionLabel(slot);
  return {
    showSave: true,
    showCancel: true,
    saveLabel: verb,
    updateLabel: verb,
    cancelLabel: 'Cancel',
    barAlign: 'right',
    barGap: 'gap-2',
    barCustomClasses: 'lab-form-action-bar',
    primaryButton: { customClasses: DANGER_PRIMARY_CLASSES },
    secondaryButton: { customClasses: 'lab-form-action-secondary' },
  };
}
