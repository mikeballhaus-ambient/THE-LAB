import { describe, expect, test } from '@jest/globals';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import { listIntegrationWriteServices } from '@/shared/utils/lab-integration-write-services';

describe('listIntegrationWriteServices', () => {
  test('includes platform-tier Wave B connector services', () => {
    const catalog: LabIntegrationServiceCatalogResponse = {
      schemaVersion: 1,
      apps: [
        {
          appId: 'app-lab-approvals-policies',
          appName: 'Approvals & Policies',
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
              properties: [],
              primaryKeyType: 'number',
            },
          ],
        },
      ],
    };

    const ids = listIntegrationWriteServices(catalog).map((row) => row.serviceId);
    expect(ids).toContain('lab-approvals-policies.approval-requests');
    expect(ids).toContain('task-list.tasks');
  });
});
