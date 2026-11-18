import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowMessageTemplate } from '@/shared/types/lab-workflow';
import { getPayloadValueAtPath } from '@/shared/utils/lab-payload-path';

export interface WorkflowNotificationCopy {
  title: string;
  body: string;
}

/** Everything a template may read. `payload` is preferred; `item` wins when both define a path. */
export interface WorkflowTemplateScope {
  payload: Record<string, unknown>;
  item?: Record<string, unknown>;
}

const TEMPLATE_REF = /\{\{\s*(?:payload\.)?([\w.]+)\s*\}\}/g;

function stringifyTemplateValue(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Render `{{payload.path}}` references in a message template (W4.3).
 *
 * ## Why unresolved references become empty, not literal
 *
 * The alternative — leaving `{{payload.missing}}` in place — ships a notification whose body shows
 * template syntax. A user cannot act on that, cannot tell whether the workflow is broken, and the
 * run history records a success. Substituting nothing produces a slightly terse message that is
 * still true, and the missing value is visible as the gap we did not fill.
 *
 * `{{path}}` without the `payload.` prefix is accepted too, because business authors write the field
 * name they see in the payload.
 *
 * Deliberately not an expression language: no conditionals, no arithmetic, no function calls. A
 * template that can execute code is a template that can exfiltrate data through someone's inbox.
 */
/** Recursively render `{{payload.path}}` references inside JSON body values. */
export function renderWorkflowJsonTemplates(
  value: unknown,
  scope: WorkflowTemplateScope,
): unknown {
  if (typeof value === 'string') {
    if (!value.includes('{{')) {
      return value;
    }
    return renderWorkflowMessageTemplate(value, scope);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => renderWorkflowJsonTemplates(entry, scope));
  }
  if (value != null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        renderWorkflowJsonTemplates(entry, scope),
      ]),
    );
  }
  return value;
}

export function renderWorkflowMessageTemplate(
  template: string | undefined,
  scope: WorkflowTemplateScope,
): string {
  if (!template) {
    return '';
  }
  return template.replace(TEMPLATE_REF, (_match, path: string) => {
    // Prefer the item so a loop iteration or a multi-item batch renders per row.
    const fromItem = scope.item ? getPayloadValueAtPath(scope.item, path) : undefined;
    const value =
      fromItem !== undefined ? fromItem : getPayloadValueAtPath(scope.payload, path);
    return stringifyTemplateValue(value);
  });
}

function defaultCopyForEvent(
  envelope: LabDomainEventEnvelopeV1,
  workflowName: string,
): WorkflowNotificationCopy {
  if (envelope.type === 'app-lab-tasklist.task.created') {
    const titleField = getPayloadValueAtPath(envelope.payload, 'title');
    const taskTitle =
      typeof titleField === 'string' && titleField.trim()
        ? titleField.trim()
        : 'Untitled task';
    return {
      title: 'New task assigned to you',
      body: `"${taskTitle}" was created and assigned to you.`,
    };
  }

  return {
    title: `Workflow: ${workflowName}`,
    body: `Automation ran for ${envelope.type}`,
  };
}

/**
 * Notification copy for one item.
 *
 * The built-in copy stays the fallback so an existing workflow keeps its wording; a template
 * overrides only the field it supplies. A template that renders to whitespace is treated as absent —
 * an empty notification is never what the author meant.
 */
export function workflowNotificationCopyForEvent(
  envelope: LabDomainEventEnvelopeV1,
  workflowName: string,
  message?: LabWorkflowMessageTemplate,
  item?: Record<string, unknown>,
): WorkflowNotificationCopy {
  const fallback = defaultCopyForEvent(envelope, workflowName);
  const scope: WorkflowTemplateScope = { payload: envelope.payload, item };

  const title = renderWorkflowMessageTemplate(message?.title, scope).trim();
  const body = renderWorkflowMessageTemplate(message?.body, scope).trim();

  return {
    title: title || fallback.title,
    body: body || fallback.body,
  };
}

export function workflowCommsDmTextForEvent(
  envelope: LabDomainEventEnvelopeV1,
  customText?: string,
  item?: Record<string, unknown>,
): string {
  const rendered = renderWorkflowMessageTemplate(customText, {
    payload: envelope.payload,
    item,
  }).trim();
  if (rendered) {
    return rendered;
  }
  if (envelope.type === 'app-lab-tasklist.task.created') {
    const titleField = getPayloadValueAtPath(envelope.payload, 'title');
    const taskTitle =
      typeof titleField === 'string' && titleField.trim()
        ? titleField.trim()
        : 'Untitled task';
    return `A new task was assigned to you: "${taskTitle}". Open Task List to view it.`;
  }
  return `THE-LAB automation: ${envelope.type}`;
}
