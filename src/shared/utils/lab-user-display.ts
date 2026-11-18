/**
 * Display helpers for platform user names (OIDC JIT, messaging, user management).
 */

/** Turns slug-style names (Michael_Ballhaus, login-with-dashes) into readable labels. */
export function humanizeLabUserDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/\s/.test(trimmed)) {
    return trimmed;
  }
  if (!/[_-]/.test(trimmed)) {
    return trimmed;
  }

  const spaced = trimmed.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced.replace(/(^|[\s])(\p{Ll})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}
