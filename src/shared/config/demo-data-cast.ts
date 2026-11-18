import type { UserRole } from '@/shared/types/user';

/**
 * Canonical demo cast and account list for every app's demo seed pack.
 *
 * **Single source of truth for demo content.** App seed modules must take person names from
 * {@link DEMO_CAST} and company names from {@link DEMO_ACCOUNTS} — never invent either.
 *
 * `DEMO_CAST` mirrors `DEMO_LAB_USER_SEEDS` in `src/backend/db/Auth/seed-demo-users.ts`
 * (ids 3–12) and is asserted against it by `src/tests/shared/demo-data-cast.test.ts`.
 * The literals live here rather than being imported from the backend module because
 * `src/shared` must stay loadable from the browser bundle and must not depend on
 * `src/backend`.
 *
 * Bootstrap **Admin** (userId `1`) is deliberately not part of `DEMO_CAST`: it is the
 * "approver of last resort" / author fallback, not a demo persona. See {@link DEMO_ADMIN}.
 */

export interface DemoCastMember {
  /** Platform `users.id`. */
  id: number;
  /** Exact display name — the value written to every free-text person column. */
  name: string;
  email: string;
  role: UserRole;
}

/** Bootstrap admin — author/approver fallback when no cast member fits. */
export const DEMO_ADMIN: DemoCastMember = {
  id: 1,
  name: 'Admin',
  email: 'admin@http://localhost',
  role: 'admin',
};

/** Fixed demo users (ids 3–12), matching `DEMO_LAB_USER_SEEDS`. */
export const DEMO_CAST: readonly DemoCastMember[] = [
  { id: 3, name: 'Mia Chen', email: 'mia.chen@lab.local', role: 'member' },
  { id: 4, name: 'Jordan Lee', email: 'jordan.lee@lab.local', role: 'member' },
  { id: 5, name: 'Sam Patel', email: 'sam.patel@lab.local', role: 'member' },
  { id: 6, name: 'Taylor Nguyen', email: 'taylor.nguyen@lab.local', role: 'admin' },
  { id: 7, name: 'Riley Brooks', email: 'riley.brooks@lab.local', role: 'member' },
  { id: 8, name: 'Casey Hayes', email: 'casey.hayes@lab.local', role: 'member' },
  { id: 9, name: 'Quinn Reed', email: 'quinn.reed@lab.local', role: 'viewer' },
  { id: 10, name: 'Drew Ward', email: 'drew.ward@lab.local', role: 'member' },
  { id: 11, name: 'Blake Torres', email: 'blake.torres@lab.local', role: 'member' },
  { id: 12, name: 'Cameron Foster', email: 'cameron.foster@lab.local', role: 'member' },
] as const;

/** Cast plus the bootstrap admin, for seeds that may fall back to id 1. */
export const DEMO_CAST_WITH_ADMIN: readonly DemoCastMember[] = [DEMO_ADMIN, ...DEMO_CAST];

/**
 * Canonical demo companies. `Northwind Labs` and `Summit Health` are the hero accounts that
 * carry the Northwind/Summit story across CRM, Ledger, Task List and Help Desk.
 */
export const DEMO_ACCOUNTS = [
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
] as const;

export type DemoAccountName = (typeof DEMO_ACCOUNTS)[number];

/**
 * Fixed "today" for all demo data (`YYYY-MM-DD`).
 *
 * Demo rows are written relative to this date rather than `datetime('now')` so screenshots,
 * charts and date filters stay stable as the lab ages.
 */
export const DEMO_TODAY = '2026-10-15';

/** Cast member by index, cycling through ids 2–11 (mirrors `demoLabUserIdForIndex`). */
export function demoCastMemberForIndex(index: number): DemoCastMember {
  return DEMO_CAST[Math.abs(index) % DEMO_CAST.length];
}

/** Display name for a row index — the value written to free-text person columns. */
export function demoCastNameForIndex(index: number): string {
  return demoCastMemberForIndex(index).name;
}

/** Platform user id for a row index. */
export function demoCastIdForIndex(index: number): number {
  return demoCastMemberForIndex(index).id;
}

/** Lookup by exact display name (case-insensitive). */
export function demoCastByName(name: string): DemoCastMember | undefined {
  const needle = name.trim().toLowerCase();
  return DEMO_CAST_WITH_ADMIN.find((member) => member.name.toLowerCase() === needle);
}

/** Platform user id for an exact display name; falls back to admin when unknown. */
export function demoCastIdForName(name: string): number {
  return demoCastByName(name)?.id ?? DEMO_ADMIN.id;
}

/** Display name for a platform user id in the demo cast; undefined when not in the cast. */
export function demoCastNameForId(id: number): string | undefined {
  return DEMO_CAST_WITH_ADMIN.find((member) => member.id === id)?.name;
}

/** True when a name is part of the canonical cast (admin included). */
export function isDemoCastName(name: string): boolean {
  return demoCastByName(name) !== undefined;
}

/** True when a company is part of the canonical account list. */
export function isDemoAccountName(name: string): boolean {
  return (DEMO_ACCOUNTS as readonly string[]).includes(name);
}

/** Cast members who can actually act in the lab (viewers cannot launch apps). */
export const DEMO_ACTIVE_CAST: readonly DemoCastMember[] = DEMO_CAST.filter(
  (member) => member.role !== 'viewer',
);

/** Shift a `YYYY-MM-DD` demo date by whole days (UTC, no local-time surprises). */
export function shiftDemoDate(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}
