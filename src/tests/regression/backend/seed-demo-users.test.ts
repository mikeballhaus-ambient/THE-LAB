import { describe, test, expect } from '@jest/globals';
import { LAB_DEMO_USER_MAX_ID, LAB_DEMO_USER_MIN_ID, LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import {
  DEMO_LAB_USER_SEEDS,
  demoLabUserIdForIndex,
} from '@/backend/db/Auth/seed-demo-users';

describe('seed-demo-users', () => {
  test('seeds ten users with ids 3–12 (admin 1 and automation 2 are reserved)', () => {
    expect(DEMO_LAB_USER_SEEDS).toHaveLength(10);
    expect(DEMO_LAB_USER_SEEDS[0].id).toBe(LAB_DEMO_USER_MIN_ID);
    expect(DEMO_LAB_USER_SEEDS[9].id).toBe(LAB_DEMO_USER_MAX_ID);
    // The demo pack must never claim a slot that a reserved platform account owns.
    expect(DEMO_LAB_USER_SEEDS.some((s) => s.id === LAB_PLATFORM_SYSTEM_USER_ID)).toBe(false);
  });

  test('demoLabUserIdForIndex maps into seeded id range', () => {
    expect(demoLabUserIdForIndex(0)).toBe(LAB_DEMO_USER_MIN_ID);
    expect(demoLabUserIdForIndex(9)).toBe(LAB_DEMO_USER_MAX_ID);
    expect(demoLabUserIdForIndex(10)).toBe(LAB_DEMO_USER_MIN_ID);
  });
});
