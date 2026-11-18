import { randomBytes } from 'crypto';

import { UserService } from '@/backend/db/Auth/auth-service';
import { authRepository } from '@/backend/db/Auth/auth-repository';
import { MICROSOFT_ENTRA_OIDC_PROVIDER_ID } from '@/shared/config/lab-microsoft-entra-oidc-extras';

function isLabUserNameTaken(name: string, excludeUserId?: number): boolean {
  const existing = UserService.getInstance().getUserByName(name);
  if (!existing) {
    return false;
  }
  if (excludeUserId != null && existing.userId === excludeUserId) {
    return false;
  }
  return true;
}

/** Legacy slug usernames for password login uniqueness — prefer {@link deriveUniqueLabUserDisplayName} for SSO. */
export function deriveUniqueUsername(base: string): string {
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 48) || 'sso_user';
  if (!isLabUserNameTaken(sanitized)) {
    return sanitized;
  }
  for (let i = 0; i < 20; i++) {
    const candidate = `${sanitized}_${randomBytes(3).toString('hex')}`;
    if (!isLabUserNameTaken(candidate)) {
      return candidate;
    }
  }
  return `${sanitized}_${Date.now()}`;
}

export function deriveUniqueLabUserDisplayName(base: string, excludeUserId?: number): string {
  const normalized = base.trim().replace(/\s+/g, ' ').slice(0, 96) || 'SSO User';
  if (!isLabUserNameTaken(normalized, excludeUserId)) {
    return normalized;
  }
  for (let i = 2; i < 100; i++) {
    const candidate = `${normalized.slice(0, 88)} (${i})`;
    if (!isLabUserNameTaken(candidate, excludeUserId)) {
      return candidate;
    }
  }
  return `${normalized.slice(0, 80)} ${randomBytes(3).toString('hex')}`;
}

function syncSsoUserDisplayName(userId: number, displayName: string): void {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return;
  }
  const userService = UserService.getInstance();
  const current = userService.getUserById(userId);
  if (!current?.name?.trim()) {
    const name = deriveUniqueLabUserDisplayName(trimmed, userId);
    userService.updateUser(userId, { name });
    return;
  }
  const desired = deriveUniqueLabUserDisplayName(trimmed, userId);
  if (current.name.trim() === desired) {
    return;
  }
  const legacySlug =
    current.name === deriveUniqueUsername(trimmed) ||
    (current.name.includes('_') && !current.name.includes(' ') && trimmed.replace(/\s+/g, '_') === current.name);
  if (legacySlug || current.name.trim().toLowerCase() === trimmed.toLowerCase()) {
    userService.updateUser(userId, { name: desired });
  }
}

export interface ResolveSsoUserInput {
  provider: string;
  providerSubject: string;
  email: string;
  displayName: string;
  idpEmailVerified: boolean;
}

export async function resolveSsoUserId(input: ResolveSsoUserInput): Promise<number> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error('Identity provider did not return an email');
  }

  const userService = UserService.getInstance();
  let userId: number;

  const isEntraProvider = input.provider === MICROSOFT_ENTRA_OIDC_PROVIDER_ID;
  /** Entra workspace login → member; Google/GitHub still require verified email claim. */
  const grantMemberAccess = input.idpEmailVerified || isEntraProvider;

  const existingIdentity = authRepository.findAuthIdentityByProviderSubject(
    input.provider,
    input.providerSubject,
  );

  if (existingIdentity) {
    userId = existingIdentity.userid;
    authRepository.updateAuthIdentityEmail(
      existingIdentity.id,
      email,
      input.idpEmailVerified,
    );
    const displayName =
      input.displayName.trim() || email.split('@')[0] || 'SSO User';
    syncSsoUserDisplayName(userId, displayName);
  } else {
    const displayName =
      input.displayName.trim() || email.split('@')[0] || 'SSO User';
    const name = deriveUniqueLabUserDisplayName(displayName);
    const newUser = await userService.registerSsoUser({
      name,
      email,
      role: grantMemberAccess ? 'member' : 'viewer',
      provider: input.provider,
      providerSubject: input.providerSubject,
      idpEmailVerified: grantMemberAccess,
    });
    userId = newUser.userId;
  }

  if (grantMemberAccess) {
    await userService.promoteUserAfterEmailVerification(userId);
  }

  return userId;
}
