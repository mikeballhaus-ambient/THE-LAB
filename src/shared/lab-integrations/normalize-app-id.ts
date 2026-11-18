/** Registry app ids use the `app-` prefix (e.g. `app-lab-tasklist`). Bindings may use short ids. */
export function toRegistryAppId(appId: string): string {
  const trimmed = appId.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.startsWith('app-') ? trimmed : `app-${trimmed}`;
}

export function appIdsMatch(a: string, b: string): boolean {
  return toRegistryAppId(a) === toRegistryAppId(b);
}
