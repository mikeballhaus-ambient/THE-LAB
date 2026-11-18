import { fetchPlatformUserById } from '@/shared/services/platform-user-client.node';

/**
 * Validate that a value refers to an active THE-LAB user.
 *
 * Connector payloads carry user references as `string | number` depending on the app
 * (Task List `assigneeId` is a stringified id, Help Desk mixes string and integer columns).
 * This normalizes both shapes to a stringified id and rejects anything that is not an
 * active platform user.
 *
 * Lives in `src/shared/server/` so catalog apps can share it without importing each other.
 *
 * @returns the stringified user id, or `undefined` when no reference was supplied
 * @throws when the value is malformed or does not resolve to an active user
 */
export async function validateLabUserReference(
  rawUserId: string | number | null | undefined,
  actorUserId: number,
  fieldName = 'userId',
): Promise<string | undefined> {
  if (rawUserId == null || String(rawUserId).trim() === '') {
    return undefined;
  }

  const id = Number.parseInt(String(rawUserId).trim(), 10);
  if (Number.isNaN(id) || id < 1) {
    throw new Error(`${fieldName} must be a positive THE-LAB user id`);
  }

  const user = await fetchPlatformUserById(actorUserId, id);
  if (!user || user.status !== 'active') {
    throw new Error(`${fieldName} does not match an active THE-LAB user`);
  }

  return String(id);
}

/**
 * @deprecated Use {@link validateLabUserReference}. Kept while Task List call sites migrate;
 * the message text is preserved so existing error assertions keep passing.
 */
export async function validateTaskAssigneeId(
  assigneeId: string | undefined,
  actorUserId: number,
): Promise<string | undefined> {
  if (assigneeId == null || String(assigneeId).trim() === '') {
    return undefined;
  }
  return validateLabUserReference(assigneeId, actorUserId, 'assigneeId');
}
