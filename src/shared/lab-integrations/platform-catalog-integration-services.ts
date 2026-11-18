import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';

/** Main-backend (:3000) connector segments for Wave B platform catalog hosts. */
export const PLATFORM_CONNECTOR_SEGMENT_LAB_RULES = 'lab-rules';
export const PLATFORM_CONNECTOR_SEGMENT_LAB_WORKFLOWS = 'lab-workflows';
export const PLATFORM_CONNECTOR_SEGMENT_LAB_APPROVAL_POLICIES = 'lab-approval-policies';
export const PLATFORM_CONNECTOR_SEGMENT_LAB_APPROVAL_REQUESTS = 'lab-approval-requests';
export const PLATFORM_CONNECTOR_SEGMENT_LAB_LEDGER_ACCOUNTS = 'lab-ledger-accounts';
export const PLATFORM_CONNECTOR_SEGMENT_LAB_LEDGER_ENTRIES = 'lab-ledger-entries';
export const PLATFORM_CONNECTOR_SEGMENT_CATALOG_APP_TAGS = 'catalog-app-tags';

export const PLATFORM_SERVICE_ID_LAB_RULES = 'lab-rules-engine.lab-rules';
export const PLATFORM_SERVICE_ID_LAB_WORKFLOWS = 'lab-workflow-studio.lab-workflows';
export const PLATFORM_SERVICE_ID_LAB_APPROVAL_POLICIES = 'lab-approvals-policies.approval-policies';
export const PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS = 'lab-approvals-policies.approval-requests';
export const PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS = 'lab-financial-ledger.ledger-accounts';
export const PLATFORM_SERVICE_ID_LAB_LEDGER_ENTRIES = 'lab-financial-ledger.ledger-entries';
export const PLATFORM_SERVICE_ID_CATALOG_APP_TAGS = 'lab-app-builder.catalog-tags';

export const LAB_RULES_DIALOG_SLOTS = {
  create: 'rules.create.dialog',
  edit: 'rules.edit.dialog',
  delete: 'rules.delete.dialog',
} as const;

export const LAB_WORKFLOW_DIALOG_SLOTS = {
  create: 'workflow.create.dialog',
  edit: 'workflow.edit.dialog',
  delete: 'workflow.delete.dialog',
} as const;

export const LAB_APPROVAL_POLICY_DIALOG_SLOTS = {
  create: 'approval.policy.create.dialog',
  edit: 'approval.policy.edit.dialog',
  delete: 'approval.policy.delete.dialog',
} as const;

export const LAB_APPROVAL_REQUEST_DIALOG_SLOTS = {
  submit: 'approval.request.submit.dialog',
  decide: 'approval.request.decide.dialog',
} as const;

export const LAB_LEDGER_ACCOUNT_DIALOG_SLOTS = {
  create: 'ledger.account.create.dialog',
  edit: 'ledger.account.edit.dialog',
  delete: 'ledger.account.delete.dialog',
} as const;

export const LAB_LEDGER_ENTRY_DIALOG_SLOTS = {
  post: 'ledger.entry.post.dialog',
} as const;

export const LAB_LEDGER_CHART_SLOTS = {
  activityByDebit: 'ledger.activity.chart',
  postingsByCredit: 'ledger.postings-by-credit.chart',
  accountBalances: 'ledger.account-balances.chart',
} as const;

export const LAB_CATALOG_TAG_DIALOG_SLOTS = {
  create: 'catalog-tag.create.dialog',
  edit: 'catalog-tag.edit.dialog',
  delete: 'catalog-tag.delete.dialog',
} as const;

const sharedRuleLikeMetadata = [
  { name: 'id', type: 'string', label: 'ID', hidden: true },
  { name: 'name', type: 'string', label: 'Name', required: true },
  { name: 'description', type: 'string', label: 'Description' },
  {
    name: 'scope',
    type: 'string',
    label: 'Scope',
    required: true,
  },
  { name: 'enabled', type: 'boolean', label: 'Enabled' },
  { name: 'priority', type: 'number', label: 'Priority' },
] as IntegrationServiceDescriptor['properties'];

const hiddenDefinitionJson = {
  name: 'definitionJson',
  type: 'string',
  label: 'Definition (JSON)',
  hidden: true,
} as IntegrationServiceDescriptor['properties'][number];

export const PLATFORM_LAB_RULES_SERVICE: IntegrationServiceDescriptor = {
  serviceId: PLATFORM_SERVICE_ID_LAB_RULES,
  label: 'Lab rules',
  description: 'Automation rules on platform domain events',
  tier: 'platform',
  entityName: 'LabRule',
  capabilities: ['CRUD'],
  connector: { segment: PLATFORM_CONNECTOR_SEGMENT_LAB_RULES },
  integration: {
    formSlots: [
      LAB_RULES_DIALOG_SLOTS.create,
      LAB_RULES_DIALOG_SLOTS.edit,
      LAB_RULES_DIALOG_SLOTS.delete,
    ],
  },
  primaryKeyType: 'string',
  properties: [
    ...sharedRuleLikeMetadata,
    {
      name: 'definitionGuide',
      type: 'string',
      label: 'Rule logic',
      controlType: 'LabRuleDefinitionGuide',
    },
    hiddenDefinitionJson,
  ],
};

export const PLATFORM_LAB_WORKFLOWS_SERVICE: IntegrationServiceDescriptor = {
  serviceId: PLATFORM_SERVICE_ID_LAB_WORKFLOWS,
  label: 'Lab workflows',
  description: 'Event-driven workflows on the platform',
  tier: 'platform',
  entityName: 'LabWorkflow',
  capabilities: ['CRUD'],
  connector: { segment: PLATFORM_CONNECTOR_SEGMENT_LAB_WORKFLOWS },
  integration: {
    formSlots: [
      LAB_WORKFLOW_DIALOG_SLOTS.create,
      LAB_WORKFLOW_DIALOG_SLOTS.edit,
      LAB_WORKFLOW_DIALOG_SLOTS.delete,
    ],
  },
  primaryKeyType: 'string',
  properties: [
    ...sharedRuleLikeMetadata,
    {
      name: 'definitionGuide',
      type: 'string',
      label: 'Workflow',
      controlType: 'LabWorkflowDefinitionGuide',
    },
    hiddenDefinitionJson,
  ],
};

export const PLATFORM_LAB_APPROVAL_POLICIES_SERVICE: IntegrationServiceDescriptor = {
  serviceId: PLATFORM_SERVICE_ID_LAB_APPROVAL_POLICIES,
  label: 'Approval policies',
  description: 'Configurable approval policies',
  tier: 'platform',
  entityName: 'LabApprovalPolicy',
  capabilities: ['CRUD'],
  connector: { segment: PLATFORM_CONNECTOR_SEGMENT_LAB_APPROVAL_POLICIES },
  integration: {
    formSlots: [
      LAB_APPROVAL_POLICY_DIALOG_SLOTS.create,
      LAB_APPROVAL_POLICY_DIALOG_SLOTS.edit,
      LAB_APPROVAL_POLICY_DIALOG_SLOTS.delete,
    ],
  },
  primaryKeyType: 'string',
  properties: [
    { name: 'id', type: 'string', label: 'ID', hidden: true },
    { name: 'name', type: 'string', label: 'Name', required: true },
    { name: 'description', type: 'string', label: 'Description' },
    { name: 'enabled', type: 'boolean', label: 'Enabled' },
    {
      name: 'approvalSteps',
      type: 'string',
      label: 'Approval steps',
      required: true,
      controlType: 'LabApprovalPolicySteps',
    },
    { name: 'step1AssigneeUserId', type: 'number', label: 'Step 1 assignee (user id)', hidden: true },
    { name: 'step1Label', type: 'string', label: 'Step 1 label', hidden: true },
    { name: 'step2AssigneeUserId', type: 'number', label: 'Step 2 assignee (user id)', hidden: true },
    { name: 'step2Label', type: 'string', label: 'Step 2 label', hidden: true },
    { name: 'definitionJson', type: 'string', label: 'Definition (advanced JSON)', hidden: true },
  ],
};

export const PLATFORM_LAB_APPROVAL_REQUESTS_SERVICE: IntegrationServiceDescriptor = {
  serviceId: PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS,
  label: 'Approval requests',
  description: 'Submit and decide multi-step approval requests',
  tier: 'platform',
  entityName: 'LabApprovalRequest',
  capabilities: ['CRUD'],
  connector: { segment: PLATFORM_CONNECTOR_SEGMENT_LAB_APPROVAL_REQUESTS },
  integration: {
    formSlots: [LAB_APPROVAL_REQUEST_DIALOG_SLOTS.submit, LAB_APPROVAL_REQUEST_DIALOG_SLOTS.decide],
  },
  primaryKeyType: 'string',
  properties: [
    { name: 'id', type: 'string', label: 'ID', hidden: true },
    {
      name: 'policyId',
      type: 'string',
      label: 'Approval policy',
      required: true,
      controlType: 'Select',
      workflowDesignerBinding: {
        summary: 'Uses the approval policy already checked earlier in this workflow',
        defaultPayloadPath: 'approvalPolicyId',
        hideFromMapper: true,
      },
    },
    { name: 'title', type: 'string', label: 'Title', required: true },
    { name: 'description', type: 'string', label: 'Description' },
    {
      name: 'subjectAppId',
      type: 'string',
      label: 'Subject app id',
      required: true,
      hidden: true,
    },
    {
      name: 'subjectEntityType',
      type: 'string',
      label: 'Subject entity type',
      required: true,
      hidden: true,
    },
    {
      name: 'subjectEntityId',
      type: 'string',
      label: 'Subject entity id',
      required: true,
      hidden: true,
      workflowDesignerBinding: {
        summary: 'Links this request to the record that triggered the workflow',
        defaultPayloadPath: 'subjectEntityId',
        hideFromMapper: true,
      },
    },
    { name: 'notifyAssignees', type: 'boolean', label: 'Notify assignees', hidden: true },
    {
      name: 'decision',
      type: 'string',
      label: 'Decision',
      required: true,
      hidden: true,
      lookupProvider: 'enum',
      options: [
        { value: 'approve', label: 'Approve' },
        { value: 'reject', label: 'Reject' },
      ],
    },
    { name: 'comment', type: 'string', label: 'Comment', hidden: true },
  ],
};

export const PLATFORM_LAB_LEDGER_ACCOUNTS_SERVICE: IntegrationServiceDescriptor = {
  serviceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS,
  label: 'Ledger accounts',
  description: 'Chart of accounts',
  tier: 'platform',
  entityName: 'LabLedgerAccount',
  capabilities: ['CRUD'],
  connector: { segment: PLATFORM_CONNECTOR_SEGMENT_LAB_LEDGER_ACCOUNTS },
  integration: {
    formSlots: [
      LAB_LEDGER_ACCOUNT_DIALOG_SLOTS.create,
      LAB_LEDGER_ACCOUNT_DIALOG_SLOTS.edit,
      LAB_LEDGER_ACCOUNT_DIALOG_SLOTS.delete,
    ],
  },
  primaryKeyType: 'string',
  properties: [
    { name: 'id', type: 'string', label: 'ID', hidden: true },
    { name: 'code', type: 'string', label: 'Code', required: true },
    { name: 'name', type: 'string', label: 'Name', required: true },
    { name: 'type', type: 'string', label: 'Type', required: true },
    { name: 'normalBalance', type: 'string', label: 'Normal balance', required: true },
    { name: 'balanceDollars', type: 'number', label: 'Balance (USD)' },
    { name: 'enabled', type: 'boolean', label: 'Enabled' },
  ],
};

export const PLATFORM_LAB_LEDGER_ENTRIES_SERVICE: IntegrationServiceDescriptor = {
  serviceId: PLATFORM_SERVICE_ID_LAB_LEDGER_ENTRIES,
  label: 'Ledger entries',
  description: 'Balanced journal entries',
  tier: 'platform',
  entityName: 'LabLedgerEntry',
  capabilities: ['CRUD'],
  connector: { segment: PLATFORM_CONNECTOR_SEGMENT_LAB_LEDGER_ENTRIES },
  integration: {
    formSlots: [LAB_LEDGER_ENTRY_DIALOG_SLOTS.post],
  },
  primaryKeyType: 'string',
  properties: [
    { name: 'id', type: 'string', label: 'ID', hidden: true },
    { name: 'memo', type: 'string', label: 'Memo' },
    { name: 'debitAccountId', type: 'string', label: 'Debit account id', required: true },
    { name: 'creditAccountId', type: 'string', label: 'Credit account id', required: true },
    { name: 'debitAccountLabel', type: 'string', label: 'Debit account' },
    { name: 'creditAccountLabel', type: 'string', label: 'Credit account' },
    { name: 'amountDollars', type: 'number', label: 'Amount (USD)', required: true },
  ],
};

export const PLATFORM_CATALOG_APP_TAGS_SERVICE: IntegrationServiceDescriptor = {
  serviceId: PLATFORM_SERVICE_ID_CATALOG_APP_TAGS,
  label: 'Catalog tags',
  description: 'App catalog tag definitions (admin)',
  tier: 'platform',
  entityName: 'CatalogAppTag',
  capabilities: ['CRUD'],
  connector: { segment: PLATFORM_CONNECTOR_SEGMENT_CATALOG_APP_TAGS },
  integration: {
    formSlots: [
      LAB_CATALOG_TAG_DIALOG_SLOTS.create,
      LAB_CATALOG_TAG_DIALOG_SLOTS.edit,
      LAB_CATALOG_TAG_DIALOG_SLOTS.delete,
    ],
  },
  primaryKeyType: 'string',
  properties: [
    { name: 'id', type: 'string', label: 'Tag id (slug)', required: true },
    { name: 'label', type: 'string', label: 'Label', required: true },
    { name: 'description', type: 'string', label: 'Description' },
    { name: 'sortOrder', type: 'number', label: 'Sort order' },
  ],
};

const PLATFORM_SERVICES_BY_ID: Record<string, IntegrationServiceDescriptor> = {
  [PLATFORM_SERVICE_ID_LAB_RULES]: PLATFORM_LAB_RULES_SERVICE,
  [PLATFORM_SERVICE_ID_LAB_WORKFLOWS]: PLATFORM_LAB_WORKFLOWS_SERVICE,
  [PLATFORM_SERVICE_ID_LAB_APPROVAL_POLICIES]: PLATFORM_LAB_APPROVAL_POLICIES_SERVICE,
  [PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS]: PLATFORM_LAB_APPROVAL_REQUESTS_SERVICE,
  [PLATFORM_SERVICE_ID_LAB_LEDGER_ACCOUNTS]: PLATFORM_LAB_LEDGER_ACCOUNTS_SERVICE,
  [PLATFORM_SERVICE_ID_LAB_LEDGER_ENTRIES]: PLATFORM_LAB_LEDGER_ENTRIES_SERVICE,
  [PLATFORM_SERVICE_ID_CATALOG_APP_TAGS]: PLATFORM_CATALOG_APP_TAGS_SERVICE,
};

export function platformCatalogServiceDescriptorByServiceId(
  serviceId: string,
): IntegrationServiceDescriptor | null {
  return PLATFORM_SERVICES_BY_ID[serviceId] ?? null;
}

/** @deprecated Prefer manifest `requiresServiceId` + {@link platformCatalogServiceDescriptorByServiceId}. */
export function platformServiceDescriptorForHost(hostAppId: string): IntegrationServiceDescriptor | null {
  switch (hostAppId) {
    case 'app-lab-workflow-studio':
      return PLATFORM_LAB_WORKFLOWS_SERVICE;
    case 'app-lab-approvals-policies':
      return PLATFORM_LAB_APPROVAL_POLICIES_SERVICE;
    case 'app-lab-financial-ledger':
      return PLATFORM_LAB_LEDGER_ACCOUNTS_SERVICE;
    case 'app-lab-app-builder':
      return PLATFORM_CATALOG_APP_TAGS_SERVICE;
    default:
      return null;
  }
}
