import type {
  FormBuilderContractActionItem,
  FormBuilderContractActionItemWithOptions,
} from '@/shared/types';

/** `{BASEURL}:{PORT}` as used in Forms Builder connector contracts. */
export function resolveConnectorApiBase(baseUrl: string, port: number): string {
  return `${baseUrl.replace(/\/$/, '')}:${port}`;
}

export interface StandardConnectorCrudPathsOptions {
  /** Path segment after `/api/connector/`, e.g. `tasks`, `leads`. */
  segment: string;
  /** Optional query filter key on `getAll` (e.g. `taskListId`). */
  getAllFilter?: string;
}

/** Standard CRUD URL shapes shared across CRM, task-list, help-desk (rm-46 **3.6**). */
export function buildStandardConnectorCrudPaths(
  options: StandardConnectorCrudPathsOptions,
): {
  getAll: FormBuilderContractActionItemWithOptions;
  get: FormBuilderContractActionItem;
  create: FormBuilderContractActionItem;
  update: FormBuilderContractActionItem;
  delete: FormBuilderContractActionItem;
} {
  const base = `/api/connector/${options.segment}`;
  const getAll: FormBuilderContractActionItemWithOptions = {
    url: base,
    type: 'GET',
    data: {},
  };
  if (options.getAllFilter) {
    getAll.filter = options.getAllFilter;
  }
  return {
    getAll,
    get: {
      url: `${base}/:id`,
      type: 'GET',
      data: { id: 'number' },
    },
    create: {
      url: base,
      type: 'POST',
      data: {},
    },
    update: {
      url: `${base}/:id`,
      type: 'POST',
      data: { id: 'number' },
    },
    delete: {
      url: `${base}/:id`,
      type: 'DELETE',
      data: { id: 'number' },
    },
  };
}

export interface ConnectorDiscoveryIndexEntity {
  entityKey: string;
  name: string;
  /** Relative discovery route segment or absolute discovery URL path. */
  discoveryPath: string;
}

export function resolveConnectorDiscoveryUrl(discoveryPath: string): string {
  if (discoveryPath.startsWith('/')) {
    return discoveryPath;
  }
  return `/api/connector/discovery/${discoveryPath}`;
}

/** Root discovery document listing entity contracts (help-desk / CRM pattern). */
export function buildConnectorDiscoveryIndex(
  appName: string,
  entities: ConnectorDiscoveryIndexEntity[],
): {
  appName: string;
  entities: Array<{ entityKey: string; name: string; discoveryUrl: string }>;
} {
  return {
    appName,
    entities: entities.map((entity) => ({
      entityKey: entity.entityKey,
      name: entity.name,
      discoveryUrl: resolveConnectorDiscoveryUrl(entity.discoveryPath),
    })),
  };
}
