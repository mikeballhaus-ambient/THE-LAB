import { describe, expect, test } from '@jest/globals';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import { LAB_APPROVALS_SOURCE_APP_ID } from '@/shared/types/lab-approval';
import {
  integrationServicesForTriggerEvent,
  resolveEventSourceAppId,
} from '@/shared/utils/lab-workflow-integration-context';

const catalogEntries: LabDomainEventCatalogEntry[] = [
  {
    eventType: 'app-lab-tasklist.task.created',
    sourceAppId: 'app-lab-tasklist',
    label: 'Task created',
    description: '',
    publisherKind: 'catalog-app',
    payloadFields: [{ path: 'taskId', label: 'Task id', valueKind: 'id' }],
  },
];

const serviceCatalog: LabIntegrationServiceCatalogResponse = {
  schemaVersion: 1,
  apps: [
    {
      appId: 'app-lab-tasklist',
      appName: 'Task List',
      services: [
        {
          serviceId: 'task-list.tasks',
          label: 'Tasks',
          tier: 'domain',
          entityName: 'Task',
          capabilities: ['CRUD'],
          connector: { segment: 'tasks' },
          properties: [{ name: 'title', label: 'Title', type: 'string', required: false }],
          primaryKeyType: 'string',
        },
      ],
    },
  ],
};

describe('lab-workflow-integration-context', () => {
  test('resolveEventSourceAppId uses catalog entry', () => {
    expect(resolveEventSourceAppId('app-lab-tasklist.task.created', catalogEntries)).toBe('app-lab-tasklist');
  });

  test('integrationServicesForTriggerEvent returns services for trigger app', () => {
    const services = integrationServicesForTriggerEvent(
      'app-lab-tasklist.task.created',
      catalogEntries,
      serviceCatalog,
    );
    expect(services).toHaveLength(1);
    expect(services[0].serviceId).toBe('task-list.tasks');
  });

  test('integrationServicesForTriggerEvent maps platform-approvals source to catalog host app', () => {
    const approvalCatalog: LabIntegrationServiceCatalogResponse = {
      schemaVersion: 1,
      apps: [
        {
          appId: 'app-lab-approvals-policies',
          appName: 'Approvals',
          services: [
            {
              serviceId: 'lab-approvals-policies.approval-requests',
              label: 'Approval requests',
              tier: 'platform',
              entityName: 'LabApprovalRequest',
              capabilities: ['CRUD'],
              connector: { segment: 'lab-approval-requests' },
              properties: [],
              primaryKeyType: 'string',
            },
          ],
        },
      ],
    };
    const approvalEntries: LabDomainEventCatalogEntry[] = [
      {
        eventType: 'platform-approvals.request.created',
        sourceAppId: LAB_APPROVALS_SOURCE_APP_ID,
        label: 'Approval request created',
        description: '',
        publisherKind: 'platform',
        payloadFields: [{ path: 'requestId', label: 'Request ID', valueKind: 'id' }],
      },
    ];
    const services = integrationServicesForTriggerEvent(
      'platform-approvals.request.created',
      approvalEntries,
      approvalCatalog,
    );
    expect(services).toHaveLength(1);
    expect(services[0].serviceId).toBe('lab-approvals-policies.approval-requests');
  });
});
