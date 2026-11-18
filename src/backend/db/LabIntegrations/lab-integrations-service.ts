import { randomUUID } from 'node:crypto';
import { labIntegrationsRepository } from './lab-integrations-repository';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';
import {
  parseLabIntegrationBindingCreate,
  parseLabIntegrationBindingUpdate,
} from '@/shared/types/schemas/lab-integrations-schema';
import type { User } from '@/shared/types/user';
import type { AppAction } from '../../utils/user-permissions';
import { labIntegrationsDependencyCoordinator } from '../../lab-integrations/lab-integrations-dependency-coordinator';
import { cleanupProviderAssetsAfterUnbind } from '../../lab-integrations/lab-integrations-provider-cleanup';
import type { ProviderUnbindCleanupResult } from '../../lab-integrations/lab-integrations-provider-cleanup';
import { appIdsMatch } from '@/shared/lab-integrations/normalize-app-id';
import { assertProviderAssetExists } from '../../lab-integrations/validate-provider-asset-ref';

export type LabIntegrationsErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'VALIDATION';

export class LabIntegrationsError extends Error {
  constructor(
    message: string,
    readonly code: LabIntegrationsErrorCode,
  ) {
    super(message);
    this.name = 'LabIntegrationsError';
  }
}

function hasAppAction(user: User, appId: string, action: AppAction): boolean {
  const perm = user.permissions?.app?.find((row) => row.appId === appId);
  if (!perm) {
    return false;
  }
  switch (action) {
    case 'launch-app':
      return perm.canLaunch ?? false;
    case 'teardown-app':
      return perm.canTeardown ?? false;
    case 'update-app':
      return perm.canUpdate ?? false;
    case 'view-logs':
      return perm.canViewLogs ?? false;
    default:
      return false;
  }
}

export function canConfigureHostBindings(user: User, hostAppId: string): boolean {
  if (user.role === 'owner' || user.role === 'admin') {
    return true;
  }
  if (user.permissions?.global?.canUpdateApps) {
    return true;
  }
  return hasAppAction(user, hostAppId, 'update-app');
}

export function canReadHostBindings(user: User, hostAppId: string): boolean {
  if (user.role === 'owner' || user.role === 'admin') {
    return true;
  }
  if (canConfigureHostBindings(user, hostAppId)) {
    return true;
  }
  if (user.permissions?.global?.canLaunchApps) {
    return true;
  }
  return hasAppAction(user, hostAppId, 'launch-app');
}

export class LabIntegrationsService {
  private static instance: LabIntegrationsService | null = null;

  private constructor() {}

  static getInstance(): LabIntegrationsService {
    if (!LabIntegrationsService.instance) {
      LabIntegrationsService.instance = new LabIntegrationsService();
    }
    return LabIntegrationsService.instance;
  }

  listBindingsForCaller(caller: User, hostAppId: string): LabIntegrationBindingRecord[] {
    if (!canReadHostBindings(caller, hostAppId)) {
      throw new LabIntegrationsError('Not allowed to read bindings for this host', 'FORBIDDEN');
    }
    return labIntegrationsRepository.listByHost(hostAppId);
  }

  getBindingForCaller(caller: User, bindingId: string): LabIntegrationBindingRecord {
    const binding = labIntegrationsRepository.getById(bindingId);
    if (!binding) {
      throw new LabIntegrationsError('Binding not found', 'NOT_FOUND');
    }
    if (!canReadHostBindings(caller, binding.hostAppId)) {
      throw new LabIntegrationsError('Not allowed to read this binding', 'FORBIDDEN');
    }
    return binding;
  }

  async createBindingForCaller(caller: User, body: unknown): Promise<LabIntegrationBindingRecord> {
    const parsed = parseLabIntegrationBindingCreate(body);
    if (!canConfigureHostBindings(caller, parsed.hostAppId)) {
      throw new LabIntegrationsError('Not allowed to configure bindings for this host', 'FORBIDDEN');
    }
    const existing = labIntegrationsRepository.getByHostSlot(parsed.hostAppId, parsed.slot);
    if (existing) {
      throw new LabIntegrationsError(
        `A binding already exists for slot "${parsed.slot}" on this host`,
        'CONFLICT',
      );
    }
    await assertProviderAssetExists(parsed.kind, parsed.providerAppId, parsed.providerRef);
    const id = parsed.id ?? randomUUID();
    const configJson = JSON.stringify(parsed.config);
    try {
      labIntegrationsRepository.insertBinding({
        id,
        hostAppId: parsed.hostAppId,
        slot: parsed.slot,
        kind: parsed.kind,
        providerAppId: parsed.providerAppId,
        providerRef: parsed.providerRef,
        configJson,
        enabled: parsed.enabled,
        createdByUserId: caller.userId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('UNIQUE')) {
        throw new LabIntegrationsError(
          `A binding already exists for slot "${parsed.slot}" on this host`,
          'CONFLICT',
        );
      }
      throw err;
    }
    const created = labIntegrationsRepository.getById(id);
    if (!created) {
      throw new LabIntegrationsError('Failed to create binding', 'VALIDATION');
    }
    if (created.enabled) {
      labIntegrationsDependencyCoordinator.promoteIntegrationDependency(
        created.hostAppId,
        created.providerAppId,
      );
    }
    return created;
  }

  async updateBindingForCaller(
    caller: User,
    bindingId: string,
    body: unknown,
  ): Promise<LabIntegrationBindingRecord> {
    const existing = labIntegrationsRepository.getById(bindingId);
    if (!existing) {
      throw new LabIntegrationsError('Binding not found', 'NOT_FOUND');
    }
    if (!canConfigureHostBindings(caller, existing.hostAppId)) {
      throw new LabIntegrationsError('Not allowed to update this binding', 'FORBIDDEN');
    }
    const parsed = parseLabIntegrationBindingUpdate(body);
    const nextProviderAppId = parsed.providerAppId ?? existing.providerAppId;
    const nextProviderRef = parsed.providerRef ?? existing.providerRef;
    if (
      parsed.providerRef !== undefined &&
      (parsed.providerRef !== existing.providerRef ||
        (parsed.providerAppId !== undefined && !appIdsMatch(parsed.providerAppId, existing.providerAppId)))
    ) {
      await assertProviderAssetExists(existing.kind, nextProviderAppId, nextProviderRef);
    }
    const next = {
      id: existing.id,
      providerAppId: nextProviderAppId,
      providerRef: nextProviderRef,
      configJson: JSON.stringify(parsed.config ?? existing.config),
      enabled: parsed.enabled ?? existing.enabled,
    };
    labIntegrationsRepository.updateBinding(next);
    const updated = labIntegrationsRepository.getById(bindingId);
    if (!updated) {
      throw new LabIntegrationsError('Failed to update binding', 'VALIDATION');
    }
    if (!appIdsMatch(updated.providerAppId, existing.providerAppId)) {
      labIntegrationsDependencyCoordinator.demoteIntegrationDependencyIfUnused(
        existing.hostAppId,
        existing.providerAppId,
      );
    }
    if (updated.enabled) {
      labIntegrationsDependencyCoordinator.promoteIntegrationDependency(
        updated.hostAppId,
        updated.providerAppId,
      );
    } else {
      labIntegrationsDependencyCoordinator.demoteIntegrationDependencyIfUnused(
        updated.hostAppId,
        updated.providerAppId,
      );
    }
    return updated;
  }

  async deleteBindingForCaller(
    caller: User,
    bindingId: string,
  ): Promise<{ bindingId: string; cleanup: ProviderUnbindCleanupResult }> {
    const existing = labIntegrationsRepository.getById(bindingId);
    if (!existing) {
      throw new LabIntegrationsError('Binding not found', 'NOT_FOUND');
    }
    if (!canConfigureHostBindings(caller, existing.hostAppId)) {
      throw new LabIntegrationsError('Not allowed to delete this binding', 'FORBIDDEN');
    }
    labIntegrationsRepository.deleteBinding(bindingId);
    labIntegrationsDependencyCoordinator.demoteIntegrationDependencyIfUnused(
      existing.hostAppId,
      existing.providerAppId,
    );
    const cleanup = await cleanupProviderAssetsAfterUnbind(existing);
    return { bindingId, cleanup };
  }
}

export const labIntegrationsService = LabIntegrationsService.getInstance();
