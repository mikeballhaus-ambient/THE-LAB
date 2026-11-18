import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';
import { buildChartEntityLookupContracts } from '@/shared/lab-integrations/chart-builder-chart-lookup-contracts';
import { buildHelpDeskTicketLookupContracts } from '@/shared/lab-integrations/help-desk-ticket-lookup-contracts';
import { buildKanbanBoardFieldKeyLookups } from '@/shared/lab-integrations/kanban-board-lookup-contracts';
import { buildTaskEntityLookupContracts } from '@/shared/lab-integrations/task-list-task-lookup-contracts';
import { resolveLabAppServiceToken } from '@/shared/server/lab-app-service-token';
import { resolveLiveDiscoveryUrl } from './resolve-live-discovery-url';

function registryFallbackLookups(
  contract: FormsBuilderContract,
  serviceId: string,
): FormsBuilderContract['endpoints']['lookups'] {
  if (serviceId === 'help-desk.tickets' || (contract.appName === 'help-desk' && contract.entityName === 'Ticket')) {
    return buildHelpDeskTicketLookupContracts(contract.endpoints.baseUrl);
  }
  if (
    serviceId === 'help-desk.kanban-boards'
    || (contract.appName === 'help-desk' && contract.entityName === 'KanbanBoard')
  ) {
    return buildKanbanBoardFieldKeyLookups();
  }
  if (serviceId === 'task-list.tasks' || (contract.appName === 'task-list' && contract.entityName === 'Task')) {
    return buildTaskEntityLookupContracts(contract.endpoints.baseUrl);
  }
  if (serviceId === 'chart-builder.charts' || contract.entityName === 'Chart') {
    return buildChartEntityLookupContracts(contract.endpoints.baseUrl);
  }
  return [];
}

function mergeLookupContracts(
  ...groups: Array<FormsBuilderContract['endpoints']['lookups'] | undefined>
): FormsBuilderContract['endpoints']['lookups'] {
  const byProperty = new Map<string, NonNullable<FormsBuilderContract['endpoints']['lookups']>[number]>();
  for (const group of groups) {
    for (const lookup of group ?? []) {
      if (lookup?.forProperty) {
        byProperty.set(lookup.forProperty, lookup);
      }
    }
  }
  return [...byProperty.values()];
}

/**
 * Merge live host discovery (lookups) into registry contract for stub autopopulate.
 * Registry entity model (hidden/required) wins; lookups come from live HTTP or pilot fallback.
 */
export async function enrichDiscoveryContractForStub(
  registryContract: FormsBuilderContract,
  options: { discoveryPath?: string; serviceId: string; actorUserId?: number },
): Promise<FormsBuilderContract> {
  const discoveryPath = options.discoveryPath ?? '/discovery/task';
  const url = resolveLiveDiscoveryUrl(registryContract, discoveryPath);

  const headers: Record<string, string> = {};
  try {
    const token = resolveLabAppServiceToken();
    headers['x-lab-app-service-token'] = token;
    if (options.actorUserId != null && options.actorUserId > 0) {
      headers['x-lab-user-id'] = String(options.actorUserId);
    }
  } catch {
    // production without token — try unauthenticated discovery if host allows
  }

  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const live = (await response.json()) as FormsBuilderContract;
      const registryLookups = registryFallbackLookups(registryContract, options.serviceId);
      const lookups = mergeLookupContracts(
        registryContract.endpoints?.lookups,
        registryLookups,
        live.endpoints?.lookups,
      );
      return {
        ...registryContract,
        endpoints: {
          ...registryContract.endpoints,
          baseUrl: live.endpoints?.baseUrl ?? registryContract.endpoints.baseUrl,
          lookups,
        },
      };
    }
  } catch {
    // host down during provision — use static pilot lookups
  }

  const lookups = registryFallbackLookups(registryContract, options.serviceId);
  if (lookups.length === 0) {
    return registryContract;
  }
  return {
    ...registryContract,
    endpoints: {
      ...registryContract.endpoints,
      lookups,
    },
  };
}
