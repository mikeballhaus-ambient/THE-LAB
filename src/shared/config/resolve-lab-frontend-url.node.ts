/** Vite dev server / production dashboard origin (OAuth redirect target). */
export function resolveLabFrontendUrl(): string {
  const explicit =
    process.env.LAB_FRONTEND_URL?.trim() ||
    process.env.VITE_LAB_FRONTEND_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const host = (process.env.VITE_API_BASE_URL ?? 'http://localhost').replace(/\/$/, '');
  if (host.match(/:\d+$/)) {
    return host.replace(/:\d+$/, ':5173');
  }
  return `${host}:5173`;
}
