import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import type { FormsBuilderContract, FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';
import { DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';
import {
  LAB_APPROVAL_REQUEST_DIALOG_SLOTS,
  PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS,
} from '@/shared/lab-integrations/platform-catalog-integration-services';

const APPROVAL_REQUEST_SUBMIT_SLOTS = new Set<string>([
  LAB_APPROVAL_REQUEST_DIALOG_SLOTS.submit,
]);

const APPROVAL_REQUEST_DECIDE_SLOTS = new Set<string>([
  LAB_APPROVAL_REQUEST_DIALOG_SLOTS.decide,
  'crm.approval.request.decide.dialog',
]);

export const APPROVAL_REQUEST_SUBMIT_STUB_FIELDS = ['policyId', 'description'] as const;

export const APPROVAL_REQUEST_DECIDE_STUB_FIELDS = ['decision', 'comment'] as const;

export const APPROVAL_DECISION_SELECT_OPTIONS = [
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
] as const;

const SUBMIT_FIELD_SPAN = 2;

function allowedFieldsForSlot(slot: string): readonly string[] | null {
  if (APPROVAL_REQUEST_SUBMIT_SLOTS.has(slot)) {
    return APPROVAL_REQUEST_SUBMIT_STUB_FIELDS;
  }
  if (APPROVAL_REQUEST_DECIDE_SLOTS.has(slot)) {
    return APPROVAL_REQUEST_DECIDE_STUB_FIELDS;
  }
  return null;
}

function enrichDecisionProperty(
  prop: FormBuilderContractModelProperty,
): FormBuilderContractModelProperty {
  if (prop.name !== 'decision') {
    return prop;
  }
  return {
    ...prop,
    label: 'Decision',
    required: true,
    hidden: false,
    controlType: 'Select',
    lookupProvider: 'enum',
    options: [...APPROVAL_DECISION_SELECT_OPTIONS],
  };
}

function enrichSubmitProperty(
  prop: FormBuilderContractModelProperty,
): FormBuilderContractModelProperty {
  if (prop.name === 'policyId') {
    return {
      ...prop,
      label: 'Policy',
      required: true,
      hidden: false,
      controlType: 'Select',
    };
  }
  if (prop.name === 'description') {
    return {
      ...prop,
      label: 'Comments',
      required: false,
      hidden: false,
      controlType: 'Textarea',
    };
  }
  return prop;
}

/** Stack submit fields: readonly policy row, then comments textarea (both span 2). */
export function layoutApprovalRequestSubmitStubComponents(
  components: FormComponent[],
): FormComponent[] {
  const span = Math.min(SUBMIT_FIELD_SPAN, DEFAULT_FORM_GRID_COLUMNS);
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const laidOut: FormComponent[] = [];
  const policy = byKey.get('policyId');
  if (policy) {
    laidOut.push({
      ...policy,
      row: 0,
      col: 0,
      span,
      readOnly: true,
      label: 'Policy',
    });
    byKey.delete('policyId');
  }
  const comments = byKey.get('description');
  if (comments) {
    laidOut.push({
      ...comments,
      row: 1,
      col: 0,
      span,
      type: 'Textarea',
      label: 'Comments',
      required: false,
    });
    byKey.delete('description');
  }
  for (const rest of byKey.values()) {
    laidOut.push(rest);
  }
  return laidOut;
}

/** Decide dialog: decision select + comment textarea (full width). */
export function layoutApprovalRequestDecideStubComponents(components: FormComponent[]): FormComponent[] {
  const span = Math.min(SUBMIT_FIELD_SPAN, DEFAULT_FORM_GRID_COLUMNS);
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const laidOut: FormComponent[] = [];
  const decision = byKey.get('decision');
  if (decision) {
    laidOut.push({
      ...decision,
      row: 0,
      col: 0,
      span,
      type: 'Select',
      readOnly: false,
      required: true,
      label: 'Decision',
    });
    byKey.delete('decision');
  }
  const comment = byKey.get('comment');
  if (comment) {
    laidOut.push({
      ...comment,
      row: 1,
      col: 0,
      span,
      type: 'Textarea',
      readOnly: false,
      label: 'Comment',
      required: false,
    });
    byKey.delete('comment');
  }
  for (const rest of byKey.values()) {
    laidOut.push(rest);
  }
  return laidOut;
}

export function layoutApprovalRequestStubComponents(
  serviceId: string,
  slot: string,
  components: FormComponent[],
): FormComponent[] {
  if (serviceId !== PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS) {
    return components;
  }
  if (APPROVAL_REQUEST_SUBMIT_SLOTS.has(slot)) {
    return layoutApprovalRequestSubmitStubComponents(components);
  }
  if (APPROVAL_REQUEST_DECIDE_SLOTS.has(slot)) {
    return layoutApprovalRequestDecideStubComponents(components);
  }
  return components;
}

function layoutRuntimeSubmitComponents<T extends { fieldKey?: string; span?: number; row?: number; col?: number; type?: string; label?: string; required?: boolean; readOnly?: boolean }>(
  components: T[],
): T[] {
  const span = Math.min(SUBMIT_FIELD_SPAN, DEFAULT_FORM_GRID_COLUMNS);
  return components.map((field) => {
    if (field.fieldKey === 'policyId') {
      return {
        ...field,
        row: 0,
        col: 0,
        span,
        readOnly: true,
        label: 'Policy',
      };
    }
    if (field.fieldKey === 'description') {
      return {
        ...field,
        row: 1,
        col: 0,
        span,
        type: 'Textarea',
        label: 'Comments',
        required: false,
      };
    }
    return field;
  });
}

/** Filter connector contract when provisioning approval request form stubs per slot. */
export function filterContractForApprovalRequestSlot(
  slot: string,
  contract: FormsBuilderContract,
): FormsBuilderContract {
  const allow = allowedFieldsForSlot(slot);
  if (!allow) {
    return contract;
  }
  const allowed = new Set(allow);
  const properties = (contract.entityModel?.properties ?? [])
    .filter((prop) => allowed.has(prop.name))
    .map((prop) => {
      const visible = { ...prop, hidden: false };
      if (APPROVAL_REQUEST_DECIDE_SLOTS.has(slot)) {
        return enrichDecisionProperty(visible);
      }
      return enrichSubmitProperty(visible);
    });
  return {
    ...contract,
    entityModel: {
      ...contract.entityModel,
      properties,
    },
  };
}

function layoutRuntimeDecideComponents<
  T extends {
    fieldKey?: string;
    span?: number;
    row?: number;
    col?: number;
    type?: string;
    label?: string;
    required?: boolean;
    readOnly?: boolean;
    options?: { value: string; label: string }[];
  },
>(components: T[]): T[] {
  const span = Math.min(SUBMIT_FIELD_SPAN, DEFAULT_FORM_GRID_COLUMNS);
  return components.map((field) => {
    if (field.fieldKey === 'decision') {
      return {
        ...field,
        row: 0,
        col: 0,
        span,
        type: 'Select',
        readOnly: false,
        required: true,
        label: 'Decision',
        options: [...APPROVAL_DECISION_SELECT_OPTIONS],
      };
    }
    if (field.fieldKey === 'comment') {
      return {
        ...field,
        row: 1,
        col: 0,
        span,
        type: 'Textarea',
        readOnly: false,
        label: 'Comment',
        required: false,
      };
    }
    return field;
  });
}

/** Trim stale full-service stubs loaded from Forms Builder at runtime. */
export function filterComponentsForApprovalRequestSlot(
  slot: string,
  components: ReadonlyArray<{
    fieldKey?: string;
    type?: string;
    readOnly?: boolean;
    options?: { value: string; label: string }[];
  }>,
): Array<{ fieldKey?: string; type?: string; readOnly?: boolean; options?: { value: string; label: string }[] }> {
  const allow = allowedFieldsForSlot(slot);
  if (!allow) {
    return [...components];
  }
  const allowed = new Set(allow);
  let filtered = components
    .filter((field) => field.fieldKey && allowed.has(field.fieldKey))
    .map((field) => {
      if (APPROVAL_REQUEST_DECIDE_SLOTS.has(slot) && field.fieldKey === 'decision') {
        return {
          ...field,
          type: 'Select',
          readOnly: false,
          options: [...APPROVAL_DECISION_SELECT_OPTIONS],
        };
      }
      return field;
    });
  if (APPROVAL_REQUEST_SUBMIT_SLOTS.has(slot)) {
    filtered = layoutRuntimeSubmitComponents(filtered);
  }
  if (APPROVAL_REQUEST_DECIDE_SLOTS.has(slot)) {
    filtered = layoutRuntimeDecideComponents(filtered);
  }
  return filtered;
}

export function isApprovalRequestIntegrationSlot(slot: string): boolean {
  return allowedFieldsForSlot(slot) !== null;
}

export function isApprovalRequestSubmitSlot(slot: string): boolean {
  return APPROVAL_REQUEST_SUBMIT_SLOTS.has(slot);
}

export function isApprovalRequestDecideSlot(slot: string): boolean {
  return APPROVAL_REQUEST_DECIDE_SLOTS.has(slot);
}
