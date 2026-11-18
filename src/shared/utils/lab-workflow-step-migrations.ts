import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';

type LegacyNotifyPayloadUserStep = {
  kind: 'notify_payload_user';
  path: string;
  message?: { title?: string; body?: string };
};

export function migrateLabWorkflowStep(step: LabWorkflowStepV1): LabWorkflowStepV1 {
  const raw = step as LabWorkflowStepV1 | LegacyNotifyPayloadUserStep;
  if (raw.kind !== 'notify_payload_user') {
    return step;
  }
  return {
    kind: 'notify_users',
    userIds: [],
    path: raw.path,
    message: raw.message,
  };
}

/**
 * Rewrites persisted graphs that still use `notify_payload_user` before Zod validation.
 * Safe to run repeatedly (idempotent).
 */
export function migrateLabWorkflowDefinitionInput(input: unknown): unknown {
  if (!input || typeof input !== 'object') {
    return input;
  }
  const def = input as Record<string, unknown>;
  if (def.schemaVersion === 2 && Array.isArray(def.nodes)) {
    return {
      ...def,
      nodes: def.nodes.map((node) => {
        if (!node || typeof node !== 'object') {
          return node;
        }
        const n = node as Record<string, unknown>;
        if (n.kind !== 'action' || !n.step || typeof n.step !== 'object') {
          return node;
        }
        return {
          ...n,
          step: migrateLabWorkflowStep(n.step as LabWorkflowStepV1),
        };
      }),
    };
  }
  if (def.schemaVersion === 1 && Array.isArray(def.steps)) {
    return {
      ...def,
      steps: def.steps.map((step) => migrateLabWorkflowStep(step as LabWorkflowStepV1)),
    };
  }
  return input;
}
