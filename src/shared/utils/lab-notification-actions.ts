import type { LabNotificationAction } from '@/shared/types/lab-notification-action';
import { LabNotificationActionsSchema } from '@/shared/types/schemas/lab-notification-action-schema';
import {
  renderWorkflowJsonTemplates,
  type WorkflowTemplateScope,
} from '@/shared/utils/lab-workflow-notification-copy';

export function parseLabNotificationActionsJson(json: string | null | undefined): LabNotificationAction[] | undefined {
  if (!json?.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    const result = LabNotificationActionsSchema.safeParse(parsed);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export function serializeLabNotificationActions(actions: LabNotificationAction[] | undefined): string | null {
  if (!actions?.length) {
    return null;
  }
  const result = LabNotificationActionsSchema.safeParse(actions);
  if (!result.success) {
    return null;
  }
  return JSON.stringify(result.data);
}

/** Resolve `{{payload.*}}` templates in workflow-authored action definitions. */
export function resolveLabNotificationActionsForScope(
  actions: LabNotificationAction[] | undefined,
  scope: WorkflowTemplateScope,
): LabNotificationAction[] | undefined {
  if (!actions?.length) {
    return undefined;
  }
  const rendered = renderWorkflowJsonTemplates(actions, scope) as LabNotificationAction[];
  const result = LabNotificationActionsSchema.safeParse(rendered);
  return result.success ? result.data : undefined;
}
