import { describe, expect, test } from '@jest/globals';
import {
  filterUsersForGameInvitePicker,
  reduceUnreadSummary,
  sortUsersForLabMessagesPicker,
} from '@/shared/utils/lab-comms-ui';
import type { User } from '@/shared/types/user';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';

function user(id: number, name: string): User {
  return {
    userId: id,
    name,
    role: 'member',
    status: 'active',
    lastSeen: '',
    createdAt: '',
  };
}

describe('lab comms UI helpers', () => {
  test('sortUsersForLabMessagesPicker orders presence then name', () => {
    // Human ids start at 3 so none of them collides with the reserved automation id.
    const list = [user(3, 'Zoe'), user(4, 'Amy'), user(5, 'Bob')];
    const sorted = sortUsersForLabMessagesPicker(list, 1, (id) => {
      if (id === 4) return 'green';
      if (id === 5) return 'yellow';
      return 'red';
    });
    expect(sorted.map((u) => u.userId)).toEqual([4, 5, 3]);
  });

  test('sortUsersForLabMessagesPicker excludes platform system user', () => {
    const list = [user(3, 'Other'), user(LAB_PLATFORM_SYSTEM_USER_ID, 'THE-LAB')];
    const sorted = sortUsersForLabMessagesPicker(list, 1, () => 'red');
    expect(sorted.map((u) => u.userId)).toEqual([3]);
  });

  test('sortUsersForLabMessagesPicker excludes self', () => {
    const list = [user(1, 'Me'), user(3, 'Other')];
    const sorted = sortUsersForLabMessagesPicker(list, 1, () => 'red');
    expect(sorted).toHaveLength(1);
    expect(sorted[0].userId).toBe(3);
  });

  test('filterUsersForGameInvitePicker excludes self and system user', () => {
    const list = [user(1, 'Me'), user(3, 'Other'), user(LAB_PLATFORM_SYSTEM_USER_ID, 'THE-LAB')];
    const filtered = filterUsersForGameInvitePicker(list, 1);
    expect(filtered.map((u) => u.userId)).toEqual([3]);
  });

  test('reduceUnreadSummary replaces totals', () => {
    const next = reduceUnreadSummary(
      { total: 1, byPartnerId: { 2: 1 } },
      { total: 3, byPartnerId: { 2: 2, 5: 1 } },
    );
    expect(next.total).toBe(3);
    expect(next.byPartnerId).toEqual({ 2: 2, 5: 1 });
  });
});
