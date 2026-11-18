import type {
  AppLabIntegrationManifestV1,
  IntegrationSurfaceRegionDecl,
} from '@/shared/types/lab-integration-manifest';
import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import {
  LAB_APPROVAL_POLICY_DIALOG_SLOTS,
  LAB_APPROVAL_REQUEST_DIALOG_SLOTS,
  LAB_CATALOG_TAG_DIALOG_SLOTS,
  LAB_LEDGER_ACCOUNT_DIALOG_SLOTS,
  LAB_LEDGER_CHART_SLOTS,
  LAB_LEDGER_ENTRY_DIALOG_SLOTS,
  LAB_WORKFLOW_DIALOG_SLOTS,
  PLATFORM_CATALOG_APP_TAGS_SERVICE,
  PLATFORM_LAB_APPROVAL_POLICIES_SERVICE,
  PLATFORM_LAB_APPROVAL_REQUESTS_SERVICE,
  PLATFORM_LAB_LEDGER_ACCOUNTS_SERVICE,
  PLATFORM_LAB_LEDGER_ENTRIES_SERVICE,
  PLATFORM_LAB_WORKFLOWS_SERVICE,
  PLATFORM_SERVICE_ID_CATALOG_APP_TAGS,
  PLATFORM_SERVICE_ID_LAB_APPROVAL_POLICIES,
  PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS,
  PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS,
  PLATFORM_SERVICE_ID_LAB_LEDGER_ENTRIES,
  PLATFORM_SERVICE_ID_LAB_WORKFLOWS,
} from './platform-catalog-integration-services';

export const PLATFORM_WORKFLOW_STUDIO_APP_ID = 'app-lab-workflow-studio';
export const PLATFORM_APPROVALS_APP_ID = 'app-lab-approvals-policies';
export const PLATFORM_LEDGER_APP_ID = 'app-lab-financial-ledger';
export const PLATFORM_APP_BUILDER_APP_ID = 'app-lab-app-builder';
export const PLATFORM_WORKFLOW_SURFACE = 'lab-workflow-studio.workspace';
export const PLATFORM_APPROVALS_SURFACE = 'lab-approvals-policies.workspace';
export const PLATFORM_LEDGER_SURFACE = 'lab-financial-ledger.workspace';
export const PLATFORM_APP_BUILDER_SURFACE = 'lab-app-builder.workspace';
function workspaceSurface(surfaceId: string, withCharts = false): AppLabIntegrationManifestV1 {
  const regions: IntegrationSurfaceRegionDecl[] = [
    {
      regionId: 'dialogs',
      label: 'Dialogs',
      kinds: ['form.surface'],
      defaultPresentation: 'dialog',
    },
  ];
  if (withCharts) {
    regions.push({
      regionId: 'reports',
      label: 'Reports',
      kinds: ['chart.surface'],
      layout: 'grid',
      gridColumns: 2,
      defaultPresentation: 'inline',
    });
  }
  return {
    schemaVersion: 1,
    integrationSurfaces: [
      {
        surfaceId,
        label: 'Workspace',
        regions,
      },
    ],
  };
}

type DialogSlotDecl = {
  slot: string;
  label: string;
  serviceId: string;
  contextKeys?: string[];
};

function formAccepts(slots: DialogSlotDecl[]) {
  return slots.map((row) => ({
    kind: 'form.surface' as const,
    slot: row.slot,
    label: row.label,
    regionId: 'dialogs',
    defaultPresentation: 'dialog' as const,
    requiresServiceId: row.serviceId,
    contextKeys: row.contextKeys,
  }));
}

function buildHostManifest(
  surfaceId: string,
  services: IntegrationServiceDescriptor[],
  slots: DialogSlotDecl[],
  withCharts = false,
): AppLabIntegrationManifestV1 {
  return {
    ...workspaceSurface(surfaceId, withCharts),
    integrationServices: services,
    accepts: [
      ...formAccepts(slots),
      ...(withCharts
        ? [
            {
              kind: 'chart.surface' as const,
              slot: 'ledger.activity.chart',
              label: 'Ledger activity',
              regionId: 'reports',
              defaultPresentation: 'inline' as const,
            },
          ]
        : []),
    ],
  };
}

const WORKFLOW_SLOTS: DialogSlotDecl[] = [
  {
    slot: LAB_WORKFLOW_DIALOG_SLOTS.create,
    label: 'Create workflow',
    serviceId: PLATFORM_SERVICE_ID_LAB_WORKFLOWS,
  },
  {
    slot: LAB_WORKFLOW_DIALOG_SLOTS.edit,
    label: 'Edit workflow',
    serviceId: PLATFORM_SERVICE_ID_LAB_WORKFLOWS,
    contextKeys: ['workflowId'],
  },
  {
    slot: LAB_WORKFLOW_DIALOG_SLOTS.delete,
    label: 'Delete workflow',
    serviceId: PLATFORM_SERVICE_ID_LAB_WORKFLOWS,
    contextKeys: ['workflowId'],
  },
];

const APPROVAL_POLICY_SLOTS: DialogSlotDecl[] = [
  {
    slot: LAB_APPROVAL_POLICY_DIALOG_SLOTS.create,
    label: 'Create policy',
    serviceId: PLATFORM_SERVICE_ID_LAB_APPROVAL_POLICIES,
  },
  {
    slot: LAB_APPROVAL_POLICY_DIALOG_SLOTS.edit,
    label: 'Edit policy',
    serviceId: PLATFORM_SERVICE_ID_LAB_APPROVAL_POLICIES,
    contextKeys: ['policyId'],
  },
  {
    slot: LAB_APPROVAL_POLICY_DIALOG_SLOTS.delete,
    label: 'Delete policy',
    serviceId: PLATFORM_SERVICE_ID_LAB_APPROVAL_POLICIES,
    contextKeys: ['policyId'],
  },
];

const APPROVAL_REQUEST_SLOTS: DialogSlotDecl[] = [
  {
    slot: LAB_APPROVAL_REQUEST_DIALOG_SLOTS.submit,
    label: 'Submit approval request',
    serviceId: PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS,
  },
  {
    slot: LAB_APPROVAL_REQUEST_DIALOG_SLOTS.decide,
    label: 'Decide approval request',
    serviceId: PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS,
    contextKeys: ['requestId'],
  },
];

const LEDGER_ACCOUNT_SLOTS: DialogSlotDecl[] = [
  {
    slot: LAB_LEDGER_ACCOUNT_DIALOG_SLOTS.create,
    label: 'Create account',
    serviceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS,
  },
  {
    slot: LAB_LEDGER_ACCOUNT_DIALOG_SLOTS.edit,
    label: 'Edit account',
    serviceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS,
    contextKeys: ['accountId'],
  },
  {
    slot: LAB_LEDGER_ACCOUNT_DIALOG_SLOTS.delete,
    label: 'Delete account',
    serviceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS,
    contextKeys: ['accountId'],
  },
];

const LEDGER_ENTRY_SLOTS: DialogSlotDecl[] = [
  {
    slot: LAB_LEDGER_ENTRY_DIALOG_SLOTS.post,
    label: 'Post journal entry',
    serviceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ENTRIES,
  },
];

const CATALOG_TAG_SLOTS: DialogSlotDecl[] = [
  {
    slot: LAB_CATALOG_TAG_DIALOG_SLOTS.create,
    label: 'Create catalog tag',
    serviceId: PLATFORM_SERVICE_ID_CATALOG_APP_TAGS,
  },
  {
    slot: LAB_CATALOG_TAG_DIALOG_SLOTS.edit,
    label: 'Edit catalog tag',
    serviceId: PLATFORM_SERVICE_ID_CATALOG_APP_TAGS,
    contextKeys: ['tagId'],
  },
  {
    slot: LAB_CATALOG_TAG_DIALOG_SLOTS.delete,
    label: 'Delete catalog tag',
    serviceId: PLATFORM_SERVICE_ID_CATALOG_APP_TAGS,
    contextKeys: ['tagId'],
  },
];

/** @deprecated Workflow Studio uses native Settings UI — manifest not seeded (see apps-repository cleanup). */
export const WORKFLOW_STUDIO_INTEGRATION_MANIFEST: AppLabIntegrationManifestV1 = buildHostManifest(
  PLATFORM_WORKFLOW_SURFACE,
  [PLATFORM_LAB_WORKFLOWS_SERVICE],
  WORKFLOW_SLOTS,
);

export const APPROVALS_INTEGRATION_MANIFEST: AppLabIntegrationManifestV1 = buildHostManifest(
  PLATFORM_APPROVALS_SURFACE,
  [PLATFORM_LAB_APPROVAL_POLICIES_SERVICE, PLATFORM_LAB_APPROVAL_REQUESTS_SERVICE],
  [...APPROVAL_POLICY_SLOTS, ...APPROVAL_REQUEST_SLOTS],
);

export const FINANCIAL_LEDGER_INTEGRATION_MANIFEST: AppLabIntegrationManifestV1 = {
  ...buildHostManifest(
    PLATFORM_LEDGER_SURFACE,
    [PLATFORM_LAB_LEDGER_ACCOUNTS_SERVICE, PLATFORM_LAB_LEDGER_ENTRIES_SERVICE],
    [...LEDGER_ACCOUNT_SLOTS, ...LEDGER_ENTRY_SLOTS],
    false,
  ),
  integrationSurfaces: [
    {
      surfaceId: PLATFORM_LEDGER_SURFACE,
      label: 'Workspace',
      regions: [
        {
          regionId: 'dialogs',
          label: 'Dialogs',
          kinds: ['form.surface'],
          defaultPresentation: 'dialog',
        },
        {
          regionId: 'reports.journal',
          label: 'Journal insights',
          kinds: ['chart.surface'],
          layout: 'grid',
          gridColumns: 3,
          defaultPresentation: 'inline',
        },
      ],
    },
  ],
  accepts: [
    ...formAccepts([...LEDGER_ACCOUNT_SLOTS, ...LEDGER_ENTRY_SLOTS]),
    {
      kind: 'chart.surface',
      slot: LAB_LEDGER_CHART_SLOTS.activityByDebit,
      label: 'Volume by debit account',
      regionId: 'reports.journal',
      defaultPresentation: 'inline',
      requiresServiceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ENTRIES,
    },
    {
      kind: 'chart.surface',
      slot: LAB_LEDGER_CHART_SLOTS.postingsByCredit,
      label: 'Volume by credit account',
      regionId: 'reports.journal',
      defaultPresentation: 'inline',
      requiresServiceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ENTRIES,
    },
    {
      kind: 'chart.surface',
      slot: LAB_LEDGER_CHART_SLOTS.accountBalances,
      label: 'Account balances',
      regionId: 'reports.journal',
      defaultPresentation: 'inline',
      requiresServiceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS,
    },
  ],
};

export const APP_BUILDER_INTEGRATION_MANIFEST: AppLabIntegrationManifestV1 = buildHostManifest(
  PLATFORM_APP_BUILDER_SURFACE,
  [PLATFORM_CATALOG_APP_TAGS_SERVICE],
  CATALOG_TAG_SLOTS,
);

/**
 * Rules Engine (19, waived) and Workflow Studio (15, native) use their own UI.
 * Their manifests are intentionally not seeded.
 */

export const PLATFORM_CATALOG_MANIFEST_SEEDS: Array<[string, AppLabIntegrationManifestV1]> = [
  [PLATFORM_APPROVALS_APP_ID, APPROVALS_INTEGRATION_MANIFEST],
  [PLATFORM_LEDGER_APP_ID, FINANCIAL_LEDGER_INTEGRATION_MANIFEST],
  [PLATFORM_APP_BUILDER_APP_ID, APP_BUILDER_INTEGRATION_MANIFEST],
];
