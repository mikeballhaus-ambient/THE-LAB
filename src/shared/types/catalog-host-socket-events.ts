/**
 * Catalog integration host apps (Wave C + catalog manifests) broadcast domain mutations on
 * their **app** Socket.IO server so open workspace UIs refresh without manual reload.
 *
 * Event name is identical on every host; clients connect to `props.serverUrl` only.
 */
export const CATALOG_HOST_SOCKET_EVENTS = {
  DATA_CHANGED: 'catalog-host:data-changed',
} as const;

export type CatalogHostDataChangeSource = 'rest' | 'connector';

export interface CatalogHostDataChangedPayload {
  hostAppId: string;
  source: CatalogHostDataChangeSource;
  /** `/api/...` path without query string */
  path: string;
  /** Connector segment when `source === 'connector'` */
  connectorSegment?: string;
  entityKey?: string;
  /** create | update | delete when emitted from connector CRUD */
  action?: 'create' | 'update' | 'delete';
  recordId?: string | number;
  at: string;
}
