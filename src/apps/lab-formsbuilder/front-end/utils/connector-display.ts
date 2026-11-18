/** Human-readable connector label when one app exposes multiple discovery entities. */
export function formatConnectorDisplayName(connector: {
  appName: string;
  entityName: string;
}): string {
  return `${connector.appName} — ${connector.entityName}`;
}
