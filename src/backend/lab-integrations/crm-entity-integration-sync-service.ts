import { appsRepository } from '../db/Apps/apps-repository';
import { labIntegrationsRepository } from '../db/LabIntegrations/lab-integrations-repository';
import {
  LabIntegrationsError,
  canConfigureHostBindings,
  labIntegrationsService,
} from '../db/LabIntegrations/lab-integrations-service';
import { labIntegrationsFormStubProvisioner } from './lab-integrations-form-stub-provisioner';
import {
  buildCrmIntegrationManifest,
  crmEntityDialogSlots,
  isCrmProductEntityKey,
  type CrmManifestEntitySource,
} from '@/shared/lab-integrations/crm-integration-manifest-builder';
import type { EntityProperty } from '@/apps/lab-crm/shared/types/entity.types';
import { applyManifestDefaultPlacementToBindingConfig } from '@/shared/lab-integrations/resolve-slot-default-placement';
import { FORMS_BUILDER_APP_ID } from '@/shared/config/forms-builder-url';
import type { User } from '@/shared/types/user';
import type {
  CrmEntityIntegrationSyncResult,
  CrmIntegrationSyncRequest,
} from '@/shared/types/schemas/crm-integration-sync-schema';

const CRM_HOST_APP_ID = 'app-lab-crm';

function bindingIdForSlot(slot: string): string {
  return `seed-binding-${slot.replace(/\./g, '-')}`;
}

async function ensureFormBinding(
  caller: User,
  manifest: ReturnType<typeof buildCrmIntegrationManifest>,
  slot: string,
  formKey: string,
): Promise<string | undefined> {
  const existing = labIntegrationsRepository.getByHostSlot(CRM_HOST_APP_ID, slot);
  if (existing) {
    return existing.id;
  }

  const config = applyManifestDefaultPlacementToBindingConfig(manifest, slot, 'form.surface', {
    schemaVersion: 1,
  });

  try {
    const binding = await labIntegrationsService.createBindingForCaller(caller, {
      id: bindingIdForSlot(slot),
      hostAppId: CRM_HOST_APP_ID,
      slot,
      kind: 'form.surface',
      providerAppId: FORMS_BUILDER_APP_ID,
      providerRef: formKey,
      config,
      enabled: true,
    });
    return binding.id;
  } catch (err) {
    if (err instanceof LabIntegrationsError && err.code === 'CONFLICT') {
      return labIntegrationsRepository.getByHostSlot(CRM_HOST_APP_ID, slot)?.id;
    }
    throw err;
  }
}

async function provisionEntityFormSlots(
  caller: User,
  manifest: ReturnType<typeof buildCrmIntegrationManifest>,
  entityKey: string,
): Promise<CrmEntityIntegrationSyncResult['provisioned']> {
  const serviceId = `crm.${entityKey}`;
  const provisioned: CrmEntityIntegrationSyncResult['provisioned'] = [];

  for (const slot of crmEntityDialogSlots(entityKey)) {
    const stub = await labIntegrationsFormStubProvisioner.provisionForCaller(caller, {
      hostAppId: CRM_HOST_APP_ID,
      serviceId,
      slot,
      publish: true,
      overwrite: false,
    });
    const formKey = stub.formKey;
    const bindingId = await ensureFormBinding(caller, manifest, slot, formKey);
    provisioned.push({ entityKey, slot, formKey, bindingId });
  }

  return provisioned;
}

export class CrmEntityIntegrationSyncService {
  private static instance: CrmEntityIntegrationSyncService | null = null;

  static getInstance(): CrmEntityIntegrationSyncService {
    if (!CrmEntityIntegrationSyncService.instance) {
      CrmEntityIntegrationSyncService.instance = new CrmEntityIntegrationSyncService();
    }
    return CrmEntityIntegrationSyncService.instance;
  }

  async syncForCaller(
    caller: User,
    body: CrmIntegrationSyncRequest,
  ): Promise<CrmEntityIntegrationSyncResult> {
    if (!canConfigureHostBindings(caller, CRM_HOST_APP_ID)) {
      throw new LabIntegrationsError(
        'Not allowed to sync CRM integration manifest and bindings',
        'FORBIDDEN',
      );
    }

    const entitySources: CrmManifestEntitySource[] = body.entities.map((row) => ({
      entityKey: row.entityKey,
      name: row.name,
      description: row.description,
      properties: row.properties as EntityProperty[],
    }));
    const manifest = buildCrmIntegrationManifest({ entitySources });
    appsRepository.setIntegrationManifest(CRM_HOST_APP_ID, manifest);

    await labIntegrationsRepository.ensureCrmSharedFormIntegrationBindingSeeds(caller.userId);

    const removed: CrmEntityIntegrationSyncResult['removed'] = [];
    for (const entityKey of body.removeEntityKeys ?? []) {
      if (!isCrmProductEntityKey(entityKey)) {
        continue;
      }
      for (const slot of crmEntityDialogSlots(entityKey)) {
        const binding = labIntegrationsRepository.getByHostSlot(CRM_HOST_APP_ID, slot);
        if (!binding) {
          continue;
        }
        const result = await labIntegrationsService.deleteBindingForCaller(caller, binding.id);
        removed.push({ entityKey, slot, bindingId: result.bindingId });
      }
    }

    const keysToProvision = (body.provisionEntityKeys ?? []).filter((key) =>
      isCrmProductEntityKey(key),
    );
    const provisioned: CrmEntityIntegrationSyncResult['provisioned'] = [];

    for (const entityKey of keysToProvision) {
      const service = manifest.integrationServices?.find((row) => row.serviceId === `crm.${entityKey}`);
      if (!service) {
        throw new LabIntegrationsError(
          `Entity "${entityKey}" is not present in the integration manifest`,
          'VALIDATION',
        );
      }
      const rows = await provisionEntityFormSlots(caller, manifest, entityKey);
      provisioned.push(...rows);
    }

    return { manifestUpdated: true, provisioned, removed };
  }
}

export const crmEntityIntegrationSyncService = CrmEntityIntegrationSyncService.getInstance();
