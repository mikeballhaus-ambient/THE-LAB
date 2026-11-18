import { SOCKET_EVENTS, DeleteSessionEventData } from '../../../shared/types';
import { VSCodeLogger } from '../../utils/logger';
import { FailureTracker } from '../../utils/failure-tracker';
import type { AppSocketRouteContext } from '../app-socket/deps';

/** Session lifecycle + client error logging (rm-46 **4.1**). */
export function registerSessionSocketRoutes(ctx: AppSocketRouteContext): void {
  const { socket } = ctx;

  socket.on(SOCKET_EVENTS.DELETE_SESSION, async (data: DeleteSessionEventData) => {
    try {
      FailureTracker.getInstance().clearSession(data.sessionId);
    } catch {
      (await VSCodeLogger.getInstance()).error('Error removing session from failure tracking');
    }
  });

  socket.on(SOCKET_EVENTS.ERROR, async (data: { message: string }) => {
    try {
      (await VSCodeLogger.getInstance()).error(`Client error: ${data.message}`);
    } catch {
      (await VSCodeLogger.getInstance()).error('Error handling socket error');
    }
  });
}
