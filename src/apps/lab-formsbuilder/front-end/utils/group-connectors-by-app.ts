import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types';

export interface ConnectorAppGroup {
  appName: string;
  connectors: DataConnector[];
}

/**
 * Groups connectors by appName for list UIs (sorted app names, then entity names).
 */
export function groupConnectorsByApp(connectors: DataConnector[]): ConnectorAppGroup[] {
  const map = new Map<string, DataConnector[]>();

  for (const connector of connectors) {
    const key = (connector.appName ?? '').trim() || 'Unknown app';
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(connector);
    } else {
      map.set(key, [connector]);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(([appName, list]) => ({
      appName,
      connectors: [...list].sort((left, right) =>
        (left.entityName ?? '').localeCompare(right.entityName ?? '', undefined, {
          sensitivity: 'base',
        }),
      ),
    }));
}
