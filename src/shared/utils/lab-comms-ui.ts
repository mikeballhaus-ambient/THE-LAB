import type { LabPresenceStatus } from '@/shared/types/lab-comms';
import type { User } from '@/shared/types/user';
import { isLabPlatformSystemUserId } from '@/shared/config/lab-platform-system-user';
import { humanizeLabUserDisplayName } from '@/shared/utils/lab-user-display';

const PRESENCE_SORT: Record<LabPresenceStatus, number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

export function displayLabUserName(user: User): string {
  const fromName = user.name?.trim();
  if (fromName) {
    return humanizeLabUserDisplayName(fromName);
  }
  const fromEmail = user.email?.trim();
  if (fromEmail) {
    return fromEmail;
  }
  return `User ${user.userId}`;
}

export function isEligibleGameInviteTargetUserId(userId: number, selfUserId: number): boolean {
  return userId > 0 && userId !== selfUserId && !isLabPlatformSystemUserId(userId);
}

/** Lobby / PvP invite opponent list — excludes the signed-in user and the platform system account. */
export function filterUsersForGameInvitePicker(users: User[], selfUserId: number): User[] {
  return users.filter(
    (u) => u.status === 'active' && isEligibleGameInviteTargetUserId(u.userId, selfUserId),
  );
}

/** Same eligibility rules for game lobby roster rows (`userId` or legacy `id`). */
export function filterRosterUsersForGameInvitePicker<
  T extends { userId?: number; id?: number; status?: User['status'] },
>(users: readonly T[], selfUserId: number): T[] {
  return users.filter((u) => {
    const userId = u.userId ?? u.id ?? 0;
    return (
      isEligibleGameInviteTargetUserId(userId, selfUserId) &&
      (u.status === undefined || u.status === 'active')
    );
  });
}

export function sortUsersForLabMessagesPicker(
  users: User[],
  selfUserId: number,
  presenceFor: (userId: number) => LabPresenceStatus,
): User[] {
  return filterUsersForGameInvitePicker(users, selfUserId)
    .sort((a, b) => {
      const order =
        PRESENCE_SORT[presenceFor(a.userId)] - PRESENCE_SORT[presenceFor(b.userId)];
      if (order !== 0) {
        return order;
      }
      return displayLabUserName(a).localeCompare(displayLabUserName(b), undefined, {
        sensitivity: 'base',
      });
    });
}

export function reduceUnreadSummary(
  current: { total: number; byPartnerId: Record<number, number> },
  incoming: { total: number; byPartnerId: Record<number, number> },
): { total: number; byPartnerId: Record<number, number> } {
  return {
    total: incoming.total,
    byPartnerId: { ...incoming.byPartnerId },
  };
}
