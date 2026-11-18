/**
 * Reserved lab user for automation (Messages DMs, workflow notifications). No password — it is not
 * intended for interactive sign-in.
 *
 * ## Why this is a constant and not a lookup
 *
 * A DM channel id is `dm:lowerId:higherId` and is written into `lab_comms_messages`, read cursors and
 * history-clear rows. Those are opaque strings, so the automation sender must be a **stable** id across
 * every database — a per-install id resolved at runtime would make channels non-portable and would make
 * existing rows point at a different person after a reseed.
 *
 * ## Why 2 specifically
 *
 * The row is created immediately after the admin, inside the `users` count === 0 bootstrap block, so the
 * id is deterministic on every database created from scratch:
 *
 * - `1` — bootstrap admin
 * - `2` — this automation account
 * - `3`–`12` — demo lab users ([`seed-demo-users.ts`](../../backend/db/Auth/seed-demo-users.ts))
 *
 * The automation account sits **before** the demo block rather than after it because a demo pack can be
 * removed and re-applied at any time (`lab-demo-users` in Settings → Demo data). An id inside or after
 * that range belongs to a slot whose occupant can change; an id reserved before any pack runs cannot.
 *
 * `id = 0` is deliberately **not** used: the comms layer treats `<= 0` as "no user", because a failed id
 * parse yields 0.
 *
 * ## A row, but not a person
 *
 * The row exists because `lab_comms_messages.sender_user_id` and `lab_comms_channel_members.user_id` are
 * foreign keys into `users` — a sender has to be a real row, the same way Slack and Discord model bots.
 * What makes this a *feature* rather than a fake user is the `users.is_system` flag: the UI decides
 * "automation channel" from that flag (surfaced as `partnerKind` on the channel summary), never by
 * comparing a partner id against this constant.
 */
export const LAB_PLATFORM_SYSTEM_USER_ID = 2;

export const LAB_PLATFORM_SYSTEM_USER_EMAIL = 'system@the-lab.platform';

export const LAB_PLATFORM_SYSTEM_USER_NAME = 'THE-LAB';

/** First id occupied by the demo user pack (the automation account owns the slot before it). */
export const LAB_DEMO_USER_MIN_ID = 3;

/** Last id occupied by the demo user pack. */
export const LAB_DEMO_USER_MAX_ID = 12;

export function isLabPlatformSystemUserId(userId: number): boolean {
  return userId === LAB_PLATFORM_SYSTEM_USER_ID;
}
