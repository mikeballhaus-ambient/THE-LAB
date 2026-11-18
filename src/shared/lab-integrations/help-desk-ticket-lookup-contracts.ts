import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types';
import type { TicketPriority, TicketStatus } from '@/apps/lab-helpdesk/shared/types/ticket.types';
import { HELP_DESK_APP_REGISTRY_ID } from '@/apps/lab-helpdesk/shared/constants/app-scope';
import type { LookupContract } from '@/shared/types/forms-builder-integration';

const TICKET_STATUS_LOOKUP = [
  { id: 'new', value: 'new', label: 'New' },
  { id: 'open', value: 'open', label: 'Open' },
  { id: 'pending', value: 'pending', label: 'Pending' },
  { id: 'resolved', value: 'resolved', label: 'Resolved' },
  { id: 'closed', value: 'closed', label: 'Closed' },
] as const satisfies ReadonlyArray<{ id: TicketStatus; value: TicketStatus; label: string }>;

const TICKET_PRIORITY_LOOKUP = [
  { id: 'low', value: 'low', label: 'Low' },
  { id: 'medium', value: 'medium', label: 'Medium' },
  { id: 'high', value: 'high', label: 'High' },
  { id: 'urgent', value: 'urgent', label: 'Urgent' },
] as const satisfies ReadonlyArray<{ id: TicketPriority; value: TicketPriority; label: string }>;

/** Lookup endpoints for Help Desk Ticket connector (Forms Builder autopopulate + runtime). */
export function buildHelpDeskTicketLookupContracts(apiBase: string): LookupContract[] {
  const base = apiBase.replace(/\/$/, '');
  return [
    {
      forProperty: 'status',
      endpoint: {
        url: `${base}/api/connector/tickets/statuses`,
        type: 'GET',
        data: {},
        response: [...TICKET_STATUS_LOOKUP],
      },
    },
    {
      forProperty: 'priority',
      endpoint: {
        url: `${base}/api/connector/tickets/priorities`,
        type: 'GET',
        data: {},
        response: [...TICKET_PRIORITY_LOOKUP],
      },
    },
    {
      forProperty: 'assigneeId',
      endpoint: {
        url: `${base}/api/connector/tickets/assignees`,
        type: 'GET',
        data: {},
        response: [],
      },
    },
    {
      forProperty: 'requesterLabUserId',
      endpoint: {
        url: `${base}/api/platform/users/lookup?appId=${encodeURIComponent(HELP_DESK_APP_REGISTRY_ID)}`,
        type: 'GET',
        data: {},
        response: [],
      },
    },
  ];
}

/** Ensure stale ticket stub connectors get lookup metadata (Select + dataFetch) at form load. */
export function mergeHelpDeskTicketLookupsOntoConnector(connector: DataConnector): DataConnector {
  if (connector.appName !== 'help-desk' || connector.entityName !== 'Ticket') {
    return connector;
  }
  const base = connector.endpoints?.baseUrl;
  if (!base || typeof base !== 'string') {
    return connector;
  }
  const injected = buildHelpDeskTicketLookupContracts(base);
  const byProperty = new Map<string, LookupContract>();
  for (const lookup of connector.endpoints?.lookups ?? []) {
    if (lookup?.forProperty) {
      byProperty.set(lookup.forProperty, lookup);
    }
  }
  for (const lookup of injected) {
    byProperty.set(lookup.forProperty, lookup);
  }
  return {
    ...connector,
    endpoints: {
      ...connector.endpoints,
      lookups: [...byProperty.values()],
    },
  };
}
