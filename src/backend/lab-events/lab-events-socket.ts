import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { User } from '@/shared/types/user';
import { LAB_EVENTS_SOCKET } from '@/shared/types/lab-events-socket-events';
import { authSocketMiddleware } from '../middleware/auth';
import { labEventsService } from '../db/LabEvents/lab-events-service';

type AuthSocket = Socket & {
  user?: User;
  userId?: string;
};

function resolveUserId(socket: AuthSocket): number | null {
  const raw = socket.user?.userId ?? socket.userId;
  if (raw == null) {
    return null;
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function pushUnreadCount(socket: AuthSocket, userId: number): Promise<void> {
  const count = await labEventsService.countUnreadNotificationsForUser(userId);
  socket.emit(LAB_EVENTS_SOCKET.UNREAD_COUNT, { userId, count });
}

export function registerLabEventsSocket(io: SocketIOServer): void {
  const nsp = io.of('/lab-events');

  nsp.use(authSocketMiddleware);
  nsp.use((socket, next) => {
    const userId = resolveUserId(socket as AuthSocket);
    if (!userId) {
      return next(new Error('Authentication required for lab events'));
    }
    next();
  });

  nsp.on('connection', (socket: AuthSocket) => {
    const userId = resolveUserId(socket);
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${userId}`);

    void pushUnreadCount(socket, userId);

    socket.on(LAB_EVENTS_SOCKET.SUBSCRIBE, () => {
      void pushUnreadCount(socket, userId);
    });
  });
}
