import type { UserRole } from '@/shared/types/user';

/** Owner/admin may create, edit, and delete chart-of-accounts rows. */
export function isPlatformLedgerAccountAdmin(role: UserRole | undefined): boolean {
  return role === 'owner' || role === 'admin';
}
