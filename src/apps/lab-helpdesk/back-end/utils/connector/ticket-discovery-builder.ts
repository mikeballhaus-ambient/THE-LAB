import type {
  FormBuilderContractModel,
  FormBuilderContractModelProperty,
  FormsBuilderContract,
} from '@/shared/types';
import { buildHelpDeskTicketLookupContracts } from '@/shared/lab-integrations/help-desk-ticket-lookup-contracts';
import {
  buildStandardConnectorCrudPaths,
  resolveConnectorApiBase,
} from '@/shared/server/connector-discovery';

export function buildTicketDiscoveryContract(baseUrl: string, port: number): FormsBuilderContract {
  const apiBase = resolveConnectorApiBase(baseUrl, port);
  const properties: FormBuilderContractModelProperty[] = [
    { name: 'id', type: 'number', label: 'ID', hidden: true },
    { name: 'subject', type: 'string', label: 'Subject', required: true },
    { name: 'description', type: 'string', label: 'Description' },
    { name: 'status', type: 'string', label: 'Status' },
    { name: 'priority', type: 'string', label: 'Priority' },
    { name: 'assigneeId', type: 'string', label: 'Assignee' },
    {
      name: 'requesterLabUserId',
      type: 'number',
      label: 'Requester (lab user)',
      hidden: true,
    },
    { name: 'requesterEmail', type: 'string', label: 'Requester email' },
    { name: 'metadata', type: 'string', label: 'Metadata (JSON)', hidden: true },
    { name: 'createdAt', type: 'date', label: 'Created', hidden: true },
    { name: 'updatedAt', type: 'date', label: 'Updated', hidden: true },
  ];

  return {
    appName: 'help-desk',
    entityName: 'Ticket',
    capabilities: ['CRUD', 'Lookups'],
    entityModel: {
      id: 'number',
      subject: 'string',
      description: 'string',
      status: 'string',
      priority: 'string',
      assigneeId: 'string',
      requesterLabUserId: 'number',
      requesterEmail: 'string',
      metadata: 'string',
      createdAt: 'date',
      updatedAt: 'date',
      properties,
    } as unknown as FormBuilderContractModel,
    endpoints: {
      baseUrl: apiBase,
      crud: buildStandardConnectorCrudPaths({ segment: 'tickets' }),
      lookups: buildHelpDeskTicketLookupContracts(apiBase),
    },
  };
}
