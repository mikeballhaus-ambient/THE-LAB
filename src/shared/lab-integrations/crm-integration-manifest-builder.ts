import { DEFAULT_ENTITY_SEEDS } from '@/apps/lab-crm/back-end/db/seed-default-entities';
import type { EntityProperty } from '@/apps/lab-crm/shared/types/entity.types';

/** Entity row used to build CRM integration services (defaults + custom definitions). */
export interface CrmManifestEntitySource {
  entityKey: string;
  name: string;
  description?: string;
  properties: EntityProperty[];
}

export const DEFAULT_CRM_MANIFEST_ENTITY_KEYS = new Set(
  DEFAULT_ENTITY_SEEDS.map((seed) => seed.entityKey),
);

/** Product nav uses Task List / Help Desk slots instead of `crm.tasks.*` / `crm.tickets.*`. */
export const CRM_CROSS_APP_ONLY_ENTITY_KEYS = new Set(['tasks', 'tickets']);

export function isCrmProductEntityKey(entityKey: string): boolean {
  return !CRM_CROSS_APP_ONLY_ENTITY_KEYS.has(entityKey);
}
import type {
  AppLabIntegrationManifestV1,
  IntegrationSlotDecl,
} from '@/shared/types/lab-integration-manifest';
import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';
import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import { TASK_LIST_INTEGRATION_MANIFEST } from '@/backend/db/Apps/integration-manifest-seeds';
import { HELP_DESK_INTEGRATION_MANIFEST } from '@/backend/db/Apps/integration-manifest-seeds';
import {
  PLATFORM_LAB_APPROVAL_REQUESTS_SERVICE,
  PLATFORM_LAB_LEDGER_ACCOUNTS_SERVICE,
  PLATFORM_LAB_LEDGER_ENTRIES_SERVICE,
  PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS,
  PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS,
  PLATFORM_SERVICE_ID_LAB_LEDGER_ENTRIES,
} from '@/shared/lab-integrations/platform-catalog-integration-services';
import { CRM_LEDGER_ACTIVITY_CHART_SLOT } from '@/apps/lab-crm/shared/constants/crm-integration-slots';

function propertyToManifestType(
  prop: EntityProperty,
): FormBuilderContractModelProperty['type'] {
  switch (prop.type) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'datetime':
      return 'date';
    case 'array':
      return 'array';
    case 'lookup':
    case 'labUser':
      return 'number';
    default:
      return 'string';
  }
}

function buildEntityService(source: CrmManifestEntitySource): IntegrationServiceDescriptor {
  const properties: FormBuilderContractModelProperty[] = [
    { name: 'id', type: 'number', label: 'ID', hidden: true },
    ...source.properties.map((p) => ({
      name: p.name,
      type: propertyToManifestType(p),
      label: p.label,
      required: p.required,
      hidden: false,
    })),
  ];
  return {
    serviceId: `crm.${source.entityKey}`,
    label: source.name,
    description: source.description ?? `${source.name} records`,
    tier: 'domain',
    entityName: source.name.replace(/\s+/g, ''),
    capabilities: ['CRUD', 'Lookups'],
    connector: {
      segment: source.entityKey,
      discoveryPath: `/connector/discovery/${source.entityKey}`,
    },
    integration: {
      formSlots: [
        `crm.${source.entityKey}.create.dialog`,
        `crm.${source.entityKey}.edit.dialog`,
        `crm.${source.entityKey}.delete.dialog`,
      ],
    },
    primaryKeyType: 'number',
    properties,
  };
}

function entityFormSlots(entityKey: string, label: string): IntegrationSlotDecl[] {
  return [
    {
      kind: 'form.surface',
      slot: `crm.${entityKey}.create.dialog`,
      label: `Create ${label}`,
      contextKeys: ['entityKey'],
      requiresServiceId: `crm.${entityKey}`,
      defaultPresentation: 'dialog',
      regionId: 'dialogs',
    },
    {
      kind: 'form.surface',
      slot: `crm.${entityKey}.edit.dialog`,
      label: `Edit ${label}`,
      contextKeys: ['entityKey', 'recordId'],
      requiresServiceId: `crm.${entityKey}`,
      defaultPresentation: 'dialog',
      regionId: 'dialogs',
    },
    {
      kind: 'form.surface',
      slot: `crm.${entityKey}.delete.dialog`,
      label: `Delete ${label}`,
      contextKeys: ['entityKey', 'recordId'],
      requiresServiceId: `crm.${entityKey}`,
      defaultPresentation: 'dialog',
      regionId: 'dialogs',
    },
  ];
}

function integrationServiceFromManifest(
  manifest: { integrationServices?: IntegrationServiceDescriptor[] },
  serviceId: string,
): IntegrationServiceDescriptor {
  const service = manifest.integrationServices?.find((row) => row.serviceId === serviceId);
  if (!service) {
    throw new Error(`Missing integration service ${serviceId} in manifest`);
  }
  return service;
}

const CRM_TASK_SERVICE = integrationServiceFromManifest(
  TASK_LIST_INTEGRATION_MANIFEST,
  'task-list.tasks',
);

const CRM_TICKET_SERVICE = integrationServiceFromManifest(
  HELP_DESK_INTEGRATION_MANIFEST,
  'help-desk.tickets',
);

const CRM_CHART_SLOTS: IntegrationSlotDecl[] = [
  {
    kind: 'chart.surface',
    slot: 'reports.sales-by-stage',
    label: 'Sales by stage (count)',
    requiresServiceId: 'crm.sales',
    regionId: 'reports.grid',
    defaultPresentation: 'inline',
  },
  {
    kind: 'chart.surface',
    slot: 'reports.pipeline-by-stage',
    label: 'Pipeline by stage ($)',
    requiresServiceId: 'crm.sales',
    regionId: 'reports.grid',
    defaultPresentation: 'inline',
  },
  {
    kind: 'chart.surface',
    slot: 'reports.lead-funnel',
    label: 'Lead → won funnel',
    requiresServiceId: 'crm.leads',
    regionId: 'reports.grid',
    defaultPresentation: 'inline',
  },
  {
    kind: 'chart.surface',
    slot: 'reports.service-by-priority',
    label: 'Service cases by priority',
    requiresServiceId: 'crm.service',
    regionId: 'reports.grid',
    defaultPresentation: 'inline',
  },
  {
    kind: 'chart.surface',
    slot: 'reports.service-by-status',
    label: 'Service cases by status',
    requiresServiceId: 'crm.service',
    regionId: 'reports.grid',
    defaultPresentation: 'inline',
  },
  {
    kind: 'chart.surface',
    slot: 'reports.portfolio-overview',
    label: 'Record counts overview',
    requiresServiceId: 'crm.contacts',
    regionId: 'reports.grid',
    defaultPresentation: 'inline',
  },
  {
    kind: 'chart.surface',
    slot: 'reports.tasks-by-status',
    label: 'CRM tasks by status',
    contextKeys: ['taskListId'],
    requiresServiceId: 'task-list.tasks',
    regionId: 'reports.grid',
    defaultPresentation: 'inline',
  },
  {
    kind: 'chart.surface',
    slot: 'reports.tasks-by-priority',
    label: 'CRM tasks by priority',
    contextKeys: ['taskListId'],
    requiresServiceId: 'task-list.tasks',
    regionId: 'reports.grid',
    defaultPresentation: 'inline',
  },
  {
    kind: 'chart.surface',
    slot: CRM_LEDGER_ACTIVITY_CHART_SLOT,
    label: 'Ledger activity (platform)',
    requiresServiceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ENTRIES,
    regionId: 'reports.grid',
    defaultPresentation: 'inline',
  },
];

/** Shared across all CRM entity records; context carries `entityKey` / `recordId` (not per-entity slots). */
const CRM_RELATED_FORM_SLOTS: IntegrationSlotDecl[] = [
  {
    kind: 'form.surface',
    slot: 'crm.task.create.dialog',
    label: 'Create CRM task',
    contextKeys: ['taskListId', 'entityKey', 'recordId', 'recordLabel', 'stage', 'workflow', 'title'],
    requiresServiceId: 'task-list.tasks',
    defaultPresentation: 'dialog',
    regionId: 'dialogs',
  },
  {
    kind: 'form.surface',
    slot: 'crm.task.edit.dialog',
    label: 'Edit CRM task',
    contextKeys: ['taskId', 'taskListId'],
    requiresServiceId: 'task-list.tasks',
    defaultPresentation: 'dialog',
    regionId: 'dialogs',
  },
  {
    kind: 'form.surface',
    slot: 'crm.task.delete.dialog',
    label: 'Delete CRM task',
    contextKeys: ['taskId', 'taskListId'],
    requiresServiceId: 'task-list.tasks',
    defaultPresentation: 'dialog',
    regionId: 'dialogs',
  },
  {
    kind: 'form.surface',
    slot: 'crm.ticket.create.dialog',
    label: 'Create help desk ticket',
    contextKeys: ['entityKey', 'recordId', 'recordLabel'],
    requiresServiceId: 'help-desk.tickets',
    defaultPresentation: 'dialog',
    regionId: 'dialogs',
  },
  {
    kind: 'form.surface',
    slot: 'crm.ticket.edit.dialog',
    label: 'Edit help desk ticket',
    contextKeys: ['ticketId'],
    requiresServiceId: 'help-desk.tickets',
    defaultPresentation: 'dialog',
    regionId: 'dialogs',
  },
  {
    kind: 'form.surface',
    slot: 'crm.ticket.delete.dialog',
    label: 'Delete help desk ticket',
    contextKeys: ['ticketId'],
    requiresServiceId: 'help-desk.tickets',
    defaultPresentation: 'dialog',
    regionId: 'dialogs',
  },
  {
    kind: 'form.surface',
    slot: 'crm.approval.request.decide.dialog',
    label: 'Decide approval request',
    contextKeys: ['requestId', 'decision', 'comment'],
    requiresServiceId: PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS,
    defaultPresentation: 'dialog',
    regionId: 'dialogs',
  },
  {
    kind: 'form.surface',
    slot: 'crm.ledger.account.create.dialog',
    label: 'Create ledger account',
    contextKeys: ['code', 'name', 'type', 'normalBalance'],
    requiresServiceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS,
    defaultPresentation: 'dialog',
    regionId: 'dialogs',
  },
];

function crmManifestEntitySourcesFromSeeds(): CrmManifestEntitySource[] {
  return DEFAULT_ENTITY_SEEDS.map((seed) => ({
    entityKey: seed.entityKey,
    name: seed.name,
    description: seed.description,
    properties: seed.properties,
  }));
}

function buildCrmEntityManifestParts(sources: CrmManifestEntitySource[]): {
  entityServices: IntegrationServiceDescriptor[];
  entityAccepts: IntegrationSlotDecl[];
} {
  const eligible = sources.filter((row) => isCrmProductEntityKey(row.entityKey));
  return {
    entityServices: eligible.map(buildEntityService),
    entityAccepts: eligible.flatMap((row) => entityFormSlots(row.entityKey, row.name)),
  };
}

export function buildCrmIntegrationManifest(
  options?: { entitySources?: CrmManifestEntitySource[] },
): AppLabIntegrationManifestV1 {
  const sources = options?.entitySources ?? crmManifestEntitySourcesFromSeeds();
  const { entityServices, entityAccepts } = buildCrmEntityManifestParts(sources);

  return {
    schemaVersion: 1,
    integrationServices: [
      ...entityServices,
      CRM_TASK_SERVICE,
      CRM_TICKET_SERVICE,
      PLATFORM_LAB_APPROVAL_REQUESTS_SERVICE,
      PLATFORM_LAB_LEDGER_ACCOUNTS_SERVICE,
      PLATFORM_LAB_LEDGER_ENTRIES_SERVICE,
    ],
    accepts: [...entityAccepts, ...CRM_RELATED_FORM_SLOTS, ...CRM_CHART_SLOTS],
    integrationSurfaces: [
      {
        surfaceId: 'crm.workspace',
        label: 'CRM workspace',
        regions: [
          {
            regionId: 'dialogs',
            label: 'Dialogs',
            kinds: ['form.surface'],
            defaultPresentation: 'dialog',
          },
          {
            regionId: 'reports.grid',
            label: 'Dashboard reports',
            kinds: ['chart.surface'],
            layout: 'grid',
            gridColumns: 4,
            defaultPresentation: 'inline',
          },
        ],
      },
    ],
  };
}

/** Keep custom entity services/slots when platform re-seeds the static CRM manifest. */
export function mergePreservedCustomCrmManifestEntities(
  freshDefault: AppLabIntegrationManifestV1,
  existing: AppLabIntegrationManifestV1 | null,
): AppLabIntegrationManifestV1 {
  if (!existing) {
    return freshDefault;
  }

  const customServiceIds = new Set(
    (existing.integrationServices ?? [])
      .map((row) => row.serviceId)
      .filter(
        (serviceId) =>
          serviceId.startsWith('crm.') &&
          !DEFAULT_CRM_MANIFEST_ENTITY_KEYS.has(serviceId.slice('crm.'.length)),
      ),
  );
  if (customServiceIds.size === 0) {
    return freshDefault;
  }

  const preservedServices =
    existing.integrationServices?.filter((row) => customServiceIds.has(row.serviceId)) ?? [];
  const preservedAccepts =
    existing.accepts?.filter((row) => {
      if (row.kind !== 'form.surface' || !row.slot.startsWith('crm.')) {
        return false;
      }
      const match = /^crm\.([^.]+)\.(create|edit|delete)\.dialog$/.exec(row.slot);
      if (!match) {
        return false;
      }
      const entityKey = match[1];
      return customServiceIds.has(`crm.${entityKey}`);
    }) ?? [];

  const serviceIds = new Set(freshDefault.integrationServices?.map((row) => row.serviceId));
  const mergedServices = [
    ...(freshDefault.integrationServices ?? []),
    ...preservedServices.filter((row) => !serviceIds.has(row.serviceId)),
  ];

  const acceptSlots = new Set(freshDefault.accepts?.map((row) => row.slot));
  const mergedAccepts = [
    ...(freshDefault.accepts ?? []),
    ...preservedAccepts.filter((row) => !acceptSlots.has(row.slot)),
  ];

  return {
    ...freshDefault,
    integrationServices: mergedServices,
    accepts: mergedAccepts,
  };
}

export const CRM_INTEGRATION_MANIFEST: AppLabIntegrationManifestV1 = buildCrmIntegrationManifest();

export function crmEntityDialogSlots(entityKey: string): readonly string[] {
  return [
    `crm.${entityKey}.create.dialog`,
    `crm.${entityKey}.edit.dialog`,
    `crm.${entityKey}.delete.dialog`,
  ];
}
