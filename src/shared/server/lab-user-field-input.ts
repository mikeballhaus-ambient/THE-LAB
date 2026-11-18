import { z } from 'zod';
import { fetchPlatformUserById } from '@/shared/services/platform-user-client.node';

/**
 * Accept the two shapes a person field can arrive in.
 *
 * Forms Builder renders a `lab-user` lookup as a Select whose option `value` is the platform
 * user **id**. Legacy clients (and the app's own inline UI) still send the display **name**.
 * Catalog schemas must accept both or the lookup-shaped payload fails validation — that was
 * the 31.2/31.5 regression.
 *
 * Normalized result:
 * - `userId`  — platform `users.id`, when the client sent an id
 * - `name`    — display name, resolved from the platform when only an id was sent
 * - `raw`     — whatever was supplied, for callers that want the original
 */
export interface LabUserFieldValue {
  userId?: number;
  name: string;
  raw: string | number | null;
}

/** Zod shape for a person field: string name, numeric id, or empty. */
export const labUserFieldSchema = z.union([z.string(), z.number()]).nullish();

/** True when the value looks like a platform user id rather than a name. */
export function isLabUserLookupId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Resolve a submitted person field into `{ userId, name }`.
 *
 * When only an id is supplied the display name is fetched from the platform so the text
 * mirror column stays populated. Failure to resolve is non-fatal: the name falls back to an
 * empty string and the caller still stores the id.
 */
export async function resolveLabUserFieldValue(
  value: unknown,
  actorUserId: number,
  options: { fieldName?: string; platformName?: string } = {},
): Promise<LabUserFieldValue> {
  const fieldName = options.fieldName ?? 'user';

  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    return { name: '', raw: null };
  }

  if (isLabUserLookupId(value)) {
    if (typeof options.platformName === 'string' && options.platformName.trim() !== '') {
      return { userId: value, name: options.platformName.trim(), raw: value };
    }

    let name = '';
    try {
      const user = await fetchPlatformUserById(actorUserId, value);
      name = user?.name?.trim() ?? '';
    } catch {
      /* offline / unauthenticated — keep the id, leave the mirror blank */
    }
    return { userId: value, name, raw: value };
  }

  if (typeof value === 'number') {
    throw new Error(`${fieldName} must be a positive THE-LAB user id`);
  }

  const text = String(value).trim();
  // A numeric string is ambiguous — treat it as an id, matching Forms Builder's numeric values.
  if (/^\d+$/.test(text)) {
    const id = Number.parseInt(text, 10);
    let name = '';
    try {
      const user = await fetchPlatformUserById(actorUserId, id);
      name = user?.name?.trim() ?? '';
    } catch {
      /* ignore */
    }
    return { userId: id, name, raw: text };
  }

  return { name: text, raw: text };
}
