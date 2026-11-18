import { AppDatabaseServiceProxy } from '@/apps/lab-formsbuilder/db/app-db-service';
import { DataConnectorsRepository, FormsRepository } from '@/apps/lab-formsbuilder/db/repositories';
import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types';
import { DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';
import {
  buildComponentsFromConnector,
  buildValidationRulesFromEntityProperties,
} from '@/shared/forms/build-components-from-connector';
import { syncFormComponentTypesFromConnector } from '@/shared/forms/sync-form-component-types-from-connector';
import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';
import type { ProvisionFormStubRequest } from '@/shared/types/schemas/lab-integrations-stub-schema';
import { appsRepository } from '../db/Apps/apps-repository';
import {
  LabIntegrationsError,
  canConfigureHostBindings,
} from '../db/LabIntegrations/lab-integrations-service';
import type { User } from '@/shared/types/user';
import { labIntegrationsHubService } from './lab-integrations-hub-service';
import { buildLabIntegrationsHubDiscoveryUrl } from './lab-integrations-hub-url';
import { enrichDiscoveryContractForStub } from './enrich-discovery-contract';
import { buildIntegrationStubFormDescription } from '@/shared/lab-integrations/integration-stub-markers';
import {
  buildDeleteConfirmFormActions,
  buildDeleteConfirmFormComponents,
  defaultDeleteConfirmMessage,
  isLabIntegrationDeleteSlot,
} from '@/shared/lab-integrations/delete-confirm-stub';
import type { FormActionsConfig } from '@/shared/forms/form-actions-config';
import { filterContractForChartBuilderSlot } from '@/shared/lab-integrations/chart-builder-stub-field-filter';
import {
  filterContractForApprovalRequestSlot,
  layoutApprovalRequestStubComponents,
} from '@/shared/lab-integrations/approval-request-form-stub-filter';
import {
  HELP_DESK_TICKETS_SERVICE_ID,
  layoutHelpDeskTicketStubComponents,
} from '@/shared/lab-integrations/help-desk-ticket-form-stub-layout';
import { layoutKanbanBoardStubComponents } from '@/shared/lab-integrations/kanban-board-form-stub-layout';
import { layoutPlatformCatalogStubComponents } from '@/shared/lab-integrations/platform-catalog-form-stub-layout';
import {
  layoutProjectCharterStubComponents,
  PROJECT_CHARTER_CHARTERS_SERVICE_ID,
} from '@/shared/lab-integrations/project-charter-form-stub-layout';
import {
  layoutRentalPropertyServiceStubComponents,
} from '@/shared/lab-integrations/rental-property-form-stub-layout';
import {
  layoutEventRsvpServiceStubComponents,
} from '@/shared/lab-integrations/event-rsvp-form-stub-layout';
import {
  layoutTaskListStubComponents,
  TASK_LIST_TASK_LISTS_SERVICE_ID,
} from '@/shared/lab-integrations/task-list-form-stub-layout';
import { resolveSlotDefaultPlacement } from '@/shared/lab-integrations/resolve-slot-default-placement';
import type { LabIntegrationPlacement } from '@/shared/types/lab-integrations';

export interface ProvisionFormStubResult {
  formKey: string;
  formId: number;
  connectorId: number;
  created: boolean;
  fieldCount: number;
  /** Suggested upsert_binding placement from host manifest (surface + region + inline/dialog). */
  recommendedPlacement?: LabIntegrationPlacement;
}

export function defaultFormKeyForStub(hostAppId: string, serviceId: string, slot: string): string {
  const host = hostAppId.replace(/^app-/, '');
  const slotPart = slot.replace(/\./g, '-');
  return `${host}.${serviceId}.${slotPart}`.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function resolveSlotLabel(hostAppId: string, slot: string): string {
  const manifest = appsRepository.getIntegrationManifest(hostAppId);
  const accept = manifest?.accepts?.find((row) => row.slot === slot);
  return accept?.label ?? slot;
}

function contractToConnector(contract: FormsBuilderContract, discoveryUrl: string): DataConnector {
  const now = new Date().toISOString();
  const capabilities: DataConnector['capabilities'] = contract.capabilities?.length
    ? [...contract.capabilities]
    : ['CRUD'];
  return {
    appName: contract.appName,
    entityName: contract.entityName,
    discoveryUrl,
    discoveryType: 'REST',
    entityModel: contract.entityModel,
    endpoints: contract.endpoints,
    capabilities,
    is_active: 1,
    createdAt: now,
    updatedAt: now,
    last_verified_at: now,
  };
}

async function findConnectorByAppEntity(
  repo: DataConnectorsRepository,
  appName: string,
  entityName: string,
): Promise<DataConnector | null> {
  const all = await repo.findAll();
  return all.find((row) => row.appName === appName && row.entityName === entityName) ?? null;
}

/** Core stub writer — used by platform API and tests (inject repositories via proxy). */
export async function provisionFormStubInFormsBuilderDb(
  input: ProvisionFormStubRequest & { contract: FormsBuilderContract; formName: string },
  repos: { connectors: DataConnectorsRepository; forms: FormsRepository },
): Promise<ProvisionFormStubResult> {
  const formKey = input.suggestedFormKey ?? defaultFormKeyForStub(input.hostAppId, input.serviceId, input.slot);
  const discoveryUrl = buildLabIntegrationsHubDiscoveryUrl(input.hostAppId, input.serviceId);
  let contractForStub = filterContractForChartBuilderSlot(input.hostAppId, input.slot, input.contract);
  contractForStub = filterContractForApprovalRequestSlot(input.slot, contractForStub);
  const connectorPayload = contractToConnector(contractForStub, discoveryUrl);

  let connector = await findConnectorByAppEntity(
    repos.connectors,
    connectorPayload.appName,
    connectorPayload.entityName,
  );

  if (connector?.id) {
    connector = await repos.connectors.update(connector.id, {
      discoveryUrl: connectorPayload.discoveryUrl,
      entityModel: connectorPayload.entityModel,
      endpoints: connectorPayload.endpoints,
      capabilities: connectorPayload.capabilities,
      last_verified_at: connectorPayload.last_verified_at,
      is_active: 1,
    });
  } else {
    connector = await repos.connectors.create(connectorPayload);
  }

  if (!connector?.id) {
    throw new LabIntegrationsError('Failed to register data connector for stub form', 'VALIDATION');
  }

  /** Build canvas from enriched contract (lookups), not a stale connector row from DB. */
  const connectorForComponents: DataConnector = {
    ...connectorPayload,
    id: connector.id,
  };
  const isDelete = isLabIntegrationDeleteSlot(input.slot);
  let components = isDelete
    ? buildDeleteConfirmFormComponents(
        defaultDeleteConfirmMessage(input.slot, input.contract.entityName),
      )
    : syncFormComponentTypesFromConnector(
        connectorForComponents,
        buildComponentsFromConnector(connectorForComponents, [], [], DEFAULT_FORM_GRID_COLUMNS),
      );
  if (!isDelete && input.serviceId === 'help-desk.kanban-boards') {
    components = layoutKanbanBoardStubComponents(components);
  }
  if (!isDelete && input.serviceId === HELP_DESK_TICKETS_SERVICE_ID) {
    components = layoutHelpDeskTicketStubComponents(components);
  }
  if (!isDelete && input.serviceId === TASK_LIST_TASK_LISTS_SERVICE_ID) {
    components = layoutTaskListStubComponents(components);
  }
  if (!isDelete && input.serviceId === PROJECT_CHARTER_CHARTERS_SERVICE_ID) {
    components = layoutProjectCharterStubComponents(components);
  }
  if (!isDelete) {
    components = layoutRentalPropertyServiceStubComponents(input.serviceId, components);
    components = layoutEventRsvpServiceStubComponents(input.serviceId, components);
    components = layoutPlatformCatalogStubComponents(input.serviceId, components);
    components = layoutApprovalRequestStubComponents(input.serviceId, input.slot, components);
  }
  const validationRules = isDelete
    ? {}
    : buildValidationRulesFromEntityProperties(contractForStub.entityModel.properties ?? []);
  const formActions: FormActionsConfig | undefined = isDelete
    ? buildDeleteConfirmFormActions(input.slot)
    : undefined;

  const existing = await repos.forms.findByKey(formKey);
  if (existing?.id) {
    if (!input.overwrite) {
      throw new LabIntegrationsError(`Form already exists for key: ${formKey}`, 'CONFLICT');
    }
    const updated = await repos.forms.update(existing.id, {
      name: input.formName,
      description: buildIntegrationStubFormDescription(input.slot),
      dataConnecter: connectorForComponents,
      components,
      model: contractForStub.entityModel,
      columns: DEFAULT_FORM_GRID_COLUMNS,
      validationRules,
      formActions,
      is_active: input.publish,
    });
    if (!updated?.id) {
      throw new LabIntegrationsError('Failed to update stub form', 'VALIDATION');
    }
    const manifest = appsRepository.getIntegrationManifest(input.hostAppId);
    const recommendedPlacement = resolveSlotDefaultPlacement(manifest, input.slot, 'form.surface');
    return {
      formKey,
      formId: updated.id,
      connectorId: connector.id,
      created: false,
      fieldCount: components.length,
      recommendedPlacement,
    };
  }

  const created = await repos.forms.create({
    formKey,
    name: input.formName,
    description: buildIntegrationStubFormDescription(input.slot),
    dataConnecter: connectorForComponents,
    components,
    model: contractForStub.entityModel,
    columns: DEFAULT_FORM_GRID_COLUMNS,
    validationRules,
    formActions,
    is_active: input.publish,
  });

  if (!created.id) {
    throw new LabIntegrationsError('Failed to create stub form', 'VALIDATION');
  }

  const manifest = appsRepository.getIntegrationManifest(input.hostAppId);
  const recommendedPlacement = resolveSlotDefaultPlacement(manifest, input.slot, 'form.surface');
  return {
    formKey,
    formId: created.id,
    connectorId: connector.id,
    created: true,
    fieldCount: components.length,
    recommendedPlacement,
  };
}

export class LabIntegrationsFormStubProvisioner {
  private static instance: LabIntegrationsFormStubProvisioner | null = null;

  private constructor() {}

  static getInstance(): LabIntegrationsFormStubProvisioner {
    if (!LabIntegrationsFormStubProvisioner.instance) {
      LabIntegrationsFormStubProvisioner.instance = new LabIntegrationsFormStubProvisioner();
    }
    return LabIntegrationsFormStubProvisioner.instance;
  }

  async provisionForCaller(caller: User, body: ProvisionFormStubRequest): Promise<ProvisionFormStubResult> {
    if (!canConfigureHostBindings(caller, body.hostAppId)) {
      throw new LabIntegrationsError('Not allowed to provision stub forms for this host', 'FORBIDDEN');
    }

    const registryContract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      caller,
      body.hostAppId,
      body.serviceId,
    );
    const manifest = appsRepository.getIntegrationManifest(body.hostAppId);
    const service = manifest?.integrationServices?.find((row) => row.serviceId === body.serviceId);
    const contract = await enrichDiscoveryContractForStub(registryContract, {
      discoveryPath: service?.connector?.discoveryPath,
      serviceId: body.serviceId,
      actorUserId: caller.userId,
    });

    const formName = resolveSlotLabel(body.hostAppId, body.slot);

    const proxy = AppDatabaseServiceProxy.getInstance();
    await proxy.initialize();

    return provisionFormStubInFormsBuilderDb(
      { ...body, contract, formName },
      {
        connectors: proxy.getDataConnectorsRepository(),
        forms: proxy.getFormsRepository(),
      },
    );
  }
}

export const labIntegrationsFormStubProvisioner = LabIntegrationsFormStubProvisioner.getInstance();
