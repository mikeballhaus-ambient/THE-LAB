import type { UIChatMessage } from '@/shared/types';
import { DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS } from '@/shared/types/lab-sidecar-activity-settings';

export type LabSidecarActivityPhase = 'idle' | 'thinking' | 'working';

export const LAB_SIDECAR_THINKING_LABEL = DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS.thinkingLabel;

/** Rotated while MCP tools run (hidden from Sidecar transcript). */
export const LAB_SIDECAR_WORKING_LABELS: readonly string[] =
  DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS.workingLabels;

export const LAB_SIDECAR_WORKING_ROTATE_MS = DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS.rotateIntervalMs;

export function getMessagesSinceLastUser(messages: UIChatMessage[]): UIChatMessage[] {
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserIdx = i;
      break;
    }
  }
  return lastUserIdx >= 0 ? messages.slice(lastUserIdx + 1) : messages;
}

/** Tool/system activity in the current turn (Sidecar hides these rows). */
export function turnHasToolActivity(turnMessages: UIChatMessage[]): boolean {
  return turnMessages.some((m) => m.role === 'system' && m.systemLog);
}

export function getLabSidecarActivityPhase(
  messages: UIChatMessage[],
  isAwaiting: boolean,
): LabSidecarActivityPhase {
  if (!isAwaiting) return 'idle';
  const turn = getMessagesSinceLastUser(messages);
  if (turnHasToolActivity(turn)) return 'working';
  return 'thinking';
}

export function pickLabSidecarWorkingLabel(
  index: number,
  labels: readonly string[] = LAB_SIDECAR_WORKING_LABELS,
): string {
  const list = labels;
  if (list.length === 0) return 'Working in the lab…';
  const safe = ((index % list.length) + list.length) % list.length;
  return list[safe];
}
