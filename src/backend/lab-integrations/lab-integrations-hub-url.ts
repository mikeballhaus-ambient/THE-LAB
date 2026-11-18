/** Hub discovery URL stored on Forms Builder connector rows (registry snapshot on :3000). */
export function buildLabIntegrationsHubDiscoveryUrl(hostAppId: string, serviceId: string): string {
  const raw = process.env.BACKEND_URL ?? 'http://localhost:3000';
  const base = raw.replace(/\/$/, '');
  const withPort = /:\d+$/.test(base) ? base : `${base}:3000`;
  return `${withPort}/api/platform/lab-integrations/hub/${encodeURIComponent(hostAppId)}/services/${encodeURIComponent(serviceId)}/discovery`;
}
