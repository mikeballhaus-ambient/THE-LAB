/** Main THE-LAB backend (platform APIs), default port 3000 — browser / Vite. */
export function resolvePlatformBackendUrlForClient(): string {
  const explicit =
    (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim() ||
    (import.meta.env.VITE_THE_LAB_BACKEND_URL as string | undefined)?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const host = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost').replace(/\/$/, '');
  const port = import.meta.env.VITE_API_BASE_PORT ?? '3000';
  if (host.endsWith(':3000')) {
    return host;
  }
  if (host.match(/:\d+$/)) {
    return host;
  }
  return `${host}:${port}`;
}
