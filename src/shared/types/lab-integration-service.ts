/**
 * rm-64 — Integration service contract for server/hybrid apps.
 * Types only; routing and base classes land with Platform Connector Hub / rm-64 implementation.
 */

import type {
  FormBuilderContractModelProperty,
  FormsBuilderCapability,
  FormsBuilderContract,
  LookupContract,
} from './forms-builder-integration';

/**
 * Globally unique service id (mandatory on every exposed integration service).
 * Convention: qualified `{hostAppId}.{surface}` e.g. `task-list.tasks`.
 */
export type IntegrationServiceId = string;

export type IntegrationServiceTier = 'domain' | 'table' | 'platform';

export interface IntegrationServiceConnectorRef {
  /** URL segment under `/api/connector/` */
  segment: string;
  /** Path under `/api/discovery/` when served by app server */
  discoveryPath?: string;
}

export interface IntegrationServiceIntegrationMeta {
  requiresHostAppId?: boolean;
  contextKeys?: string[];
  /** Host manifest slots that default-bind to this service */
  formSlots?: string[];
}

/** Slice stored on app registry row and used by registry-only wizard. */
export interface IntegrationServiceDescriptor {
  serviceId: IntegrationServiceId;
  label: string;
  description?: string;
  tier: IntegrationServiceTier;
  entityName: string;
  capabilities: FormsBuilderCapability[];
  connector: IntegrationServiceConnectorRef;
  integration?: IntegrationServiceIntegrationMeta;
  /** Forms Builder entity model properties (discovery). */
  properties: FormBuilderContractModelProperty[];
  primaryKeyType: 'string' | 'number';
  /** For tier `table` — backing SQLite table in app DB. */
  tableName?: string;
}

/** @deprecated Prefer {@link AppLabIntegrationManifestV1} from `lab-integration-manifest.ts` */
export type LabIntegrationManifest = import('./lab-integration-manifest').AppLabIntegrationManifestV1;

/** Per-request context for connector adapters (host scope, actor). */
export interface IntegrationRequestContext {
  hostAppId?: string;
  labUserId?: number;
}

/**
 * Backend integration service — implement per domain surface (Tasks, Contacts, …).
 * HTTP layer calls these methods; discovery is derived from {@link IntegrationServiceDescriptor}.
 */
export interface LabIntegrationService<
  TRecord = Record<string, unknown>,
  TCreate = Record<string, unknown>,
  TUpdate = Record<string, unknown>,
> {
  getDescriptor(): IntegrationServiceDescriptor;

  list(
    query: Record<string, string | undefined>,
    ctx: IntegrationRequestContext,
  ): Promise<TRecord[]>;

  getById(id: string | number, ctx: IntegrationRequestContext): Promise<TRecord | null>;

  create(body: TCreate, ctx: IntegrationRequestContext): Promise<TRecord>;

  update(id: string | number, body: TUpdate, ctx: IntegrationRequestContext): Promise<TRecord>;

  delete(id: string | number, ctx: IntegrationRequestContext): Promise<boolean>;

  toConnectorRecord(record: TRecord): Record<string, unknown>;

  /** Override to supply FB lookup contracts; default none. */
  getLookupContracts?(apiBase: string): LookupContract[];

  /** Default implementation can use descriptor + shared connector-discovery helpers. */
  buildDiscovery(baseUrl: string, port: number): FormsBuilderContract;
}
