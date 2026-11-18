import type { LabPayloadRecipient } from '@/shared/utils/lab-payload-path';
import { resolvePayloadRecipient } from '@/shared/utils/lab-payload-path';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import userService from '../db/Auth/auth-service';

/**
 * Turn a payload-named recipient into a concrete lab user id.
 *
 * ## Why this lives in one place
 *
 * Three step kinds can address a person (`notify_users` with a path and
 * `comms_system_dm_payload_user`), and every one of them needs the same two rules:
 *
 * 1. **A user id and an email are both acceptable.** Insisting on the id forces the author to add a
 *    `set_fields` node that invents a field the payload does not contain, and that node's mapping is
 *    then a lie about the event's shape.
 * 2. **An unreadable recipient is never fatal.** A payload naming a deleted account must cost that
 *    one recipient, not the run — the same reasoning as
 *    [`insertWorkflowNotification`](lab-workflow-step-runner.ts:134), which is why this returns
 *    `null` rather than throwing.
 *
 * ## Why the system user is excluded
 *
 * A DM *from* THE-LAB *to* THE-LAB is a no-op that still writes a channel row and broadcasts to the
 * recipient's room. When a payload field is absent the temptation is to treat "no id" as "the system
 * user", and that guess would quietly create a self-conversation instead of surfacing the missing
 * field — so it is refused here, once, rather than at each call site.
 */
export function resolveLabWorkflowRecipientUserId(
  recipient: LabPayloadRecipient,
  options: { allowSystemUser?: boolean } = {},
): number | null {
  if (!recipient) {
    return null;
  }

  const userId = 'userId' in recipient
    ? recipient.userId
    : (userService.getUserByEmailIgnoreCase(recipient.email)?.userId ?? null);

  if (userId == null || userId <= 0) {
    return null;
  }
  if (!options.allowSystemUser && userId === LAB_PLATFORM_SYSTEM_USER_ID) {
    return null;
  }
  return userId;
}

/**
 * Resolve a payload path on one item straight to a user id.
 *
 * Takes the item and the path separately because a batched or looped run resolves **per item** — the
 * whole point of the array contract — and passing a pre-resolved path would silently resolve against
 * the first row for every recipient.
 */
export function resolveLabWorkflowPayloadUserId(
  item: Record<string, unknown>,
  path: string,
  options: { allowSystemUser?: boolean } = {},
): number | null {
  if (!path?.trim()) {
    return null;
  }
  return resolveLabWorkflowRecipientUserId(resolvePayloadRecipient(item, path), options);
}

/** A stable, human-readable name for a run-log entry when only the source value is known. */
export function describeLabWorkflowRecipient(
  recipient: LabPayloadRecipient,
): string {
  if (!recipient) {
    return 'none';
  }
  return 'userId' in recipient ? `user ${recipient.userId}` : recipient.email;
}
