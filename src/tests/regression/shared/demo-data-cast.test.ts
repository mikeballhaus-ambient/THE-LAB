import { describe, expect, test } from '@jest/globals';
import {
  DEMO_ACCOUNTS,
  DEMO_ADMIN,
  DEMO_CAST,
  DEMO_CAST_WITH_ADMIN,
  DEMO_TODAY,
  demoCastIdForIndex,
  demoCastIdForName,
  demoCastMemberForIndex,
  isDemoAccountName,
  isDemoCastName,
} from '@/shared/config/demo-data-cast';
import { DEMO_LAB_USER_SEEDS } from '@/backend/db/Auth/seed-demo-users';

describe('demo-data-cast', () => {
  test('cast matches DEMO_LAB_USER_SEEDS exactly (id, name, email)', () => {
    expect(
      DEMO_CAST.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
      })),
    ).toEqual(
      DEMO_LAB_USER_SEEDS.map((seed) => ({
        id: seed.id,
        name: seed.name,
        email: seed.email,
        role: seed.role,
      })),
    );
  });

  test('accounts match the CRM COMPANIES list', () => {
    // Mirrors `COMPANIES` in src/apps/lab-crm/back-end/db/seed-demo-records.ts — the CRM
    // module is not importable from shared (app → core decoupling), so the literal is
    // asserted here. Update both lists together.
    expect([...DEMO_ACCOUNTS]).toEqual([
      'Northwind Labs',
      'Summit Health',
      'Brightline Retail',
      'Cascade Energy',
      'Harbor Finance',
      'Redwood Manufacturing',
      'Pioneer Logistics',
      'Atlas Media',
      'Vertex Systems',
      'Silverline Consulting',
    ]);
  });

  test('admin is the fallback and is not part of the demo cast', () => {
    expect(DEMO_ADMIN.id).toBe(1);
    expect(DEMO_ADMIN.name).toBe('Admin');
    expect(DEMO_CAST.some((member) => member.id === 1)).toBe(false);
    expect(DEMO_CAST_WITH_ADMIN[0]).toEqual(DEMO_ADMIN);
    expect(demoCastIdForName('Nobody At All')).toBe(DEMO_ADMIN.id);
  });

  test('index helpers cycle through cast ids 3–12', () => {
    expect(demoCastIdForIndex(0)).toBe(3);
    expect(demoCastIdForIndex(9)).toBe(12);
    expect(demoCastIdForIndex(10)).toBe(3);
    // Negative indexes mirror `demoLabUserIdForIndex` (Math.abs), so -1 → index 1.
    expect(demoCastMemberForIndex(-1).name).toBe('Jordan Lee');
  });

  test('name lookups are case-insensitive and include admin', () => {
    expect(demoCastIdForName('mia chen')).toBe(3);
    expect(demoCastIdForName('  Admin  ')).toBe(1);
    expect(isDemoCastName('Taylor Nguyen')).toBe(true);
    expect(isDemoCastName('Avery Chen')).toBe(false); // CRM contact — external party
  });

  test('account lookup is exact', () => {
    expect(isDemoAccountName('Northwind Labs')).toBe(true);
    expect(isDemoAccountName('northwind labs')).toBe(false);
  });

  test('demo today is fixed, not now', () => {
    expect(DEMO_TODAY).toBe('2026-10-15');
  });

  test('cast excludes the viewer from actionable assignments', () => {
    expect(DEMO_CAST.find((member) => member.name === 'Quinn Reed')?.role).toBe('viewer');
  });
});
