import type { Server as SocketIOServer } from 'socket.io';
import {
  LAB_EVENTS_SOCKET,
  type LabWorkflowRunStepStreamEvent,
} from '@/shared/types/lab-events-socket-events';

export const LAB_EVENTS_SOCKET_NAMESPACE = '/lab-events';

function userRoom(userId: number): string {
  return `user:${userId}`;
}

/**
 * Stream one node transition to the author who started the run.
 *
 * Deliberately silent when `io` or `userId` is missing: a workflow also runs from the scheduler, the
 * webhook route and the MCP tools, and none of those have a canvas to colour. Streaming is a
 * designer affordance, not part of execution, so a missing socket must never fail a run.
 */
export function emitWorkflowRunStep(
  io: SocketIOServer | undefined,
  userId: number | null | undefined,
  event: LabWorkflowRunStepStreamEvent,
): void {
  if (!io || !userId) {
    return;
  }
  io.of(LAB_EVENTS_SOCKET_NAMESPACE)
    .to(userRoom(userId))
    .emit(LAB_EVENTS_SOCKET.WORKFLOW_RUN_STEP, event);
}
