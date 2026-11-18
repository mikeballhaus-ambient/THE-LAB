import { CRM_APP_REGISTRY_ID } from '@/apps/lab-helpdesk/shared/constants/app-scope';
import type { Ticket } from '@/apps/lab-helpdesk/shared/types/ticket.types';
import { getLabUserHeaders, labAppFetch } from '@/shared/composables/useLabUserHeaders';

export interface CrmHelpDeskApi {
  fetchTicketsForEntity: (entityKey: string, recordId: number) => Promise<Ticket[]>;
}

export function useCrmHelpDeskApi(helpDeskServerUrl: string): CrmHelpDeskApi {
  const base = helpDeskServerUrl.replace(/\/$/, '');
  const appId = CRM_APP_REGISTRY_ID;

  async function fetchTicketsForEntity(entityKey: string, recordId: number): Promise<Ticket[]> {
    const params = new URLSearchParams({
      appId,
      entityKey,
      recordId: String(recordId),
    });
    const response = await labAppFetch(`${base}/api/app-scoped/tickets?${params.toString()}`, {
      headers: getLabUserHeaders({ 'X-Host-App-Id': appId }),
    });
    if (!response.ok) {
      throw new Error(`Failed to load tickets for record (${response.status})`);
    }
    const body = (await response.json()) as { success: boolean; data?: Ticket[] };
    return body.data ?? [];
  }

  return { fetchTicketsForEntity };
}
