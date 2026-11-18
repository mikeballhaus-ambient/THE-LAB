/** Main THE-LAB backend (platform identity API), default port 3000. */
export function resolvePlatformBackendUrl(): string {
  const explicit = process.env.BACKEND_URL?.trim() || process.env.THE_LAB_BACKEND_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const host = (process.env.VITE_API_BASE_URL ?? process.env.BASEURL ?? 'http://localhost').replace(
    /\/$/,
    '',
  );
  if (host.endsWith(':3000')) {
    return host;
  }
  return `${host}:3000`;
}
