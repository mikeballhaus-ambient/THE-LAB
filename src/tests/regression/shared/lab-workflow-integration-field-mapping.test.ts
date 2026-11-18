import { describe, expect, test } from '@jest/globals';
import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';
import {
  defaultAutomaticBodyFromPayload,
  integrationPropertiesForWorkflowDesigner,
  splitIntegrationBodyFromPayloadMappings,
} from '@/shared/utils/lab-workflow-integration-field-mapping';
import { PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS } from '@/shared/lab-integrations/platform-catalog-integration-services';

const approvalProperties: FormBuilderContractModelProperty[] = [
  {
    name: 'policyId',
    type: 'string',
    label: 'Approval policy',
    workflowDesignerBinding: {
      summary: 'Uses the approval policy already checked earlier in this workflow',
      defaultPayloadPath: 'approvalPolicyId',
      hideFromMapper: true,
    },
  },
  { name: 'title', type: 'string', label: 'Title' },
  {
    name: 'subjectEntityId',
    type: 'string',
    label: 'Related task',
    workflowDesignerBinding: {
      summary: 'Links this request to the task that triggered the workflow',
      defaultPayloadPath: 'taskId',
      hideFromMapper: true,
    },
  },
];

describe('lab-workflow-integration-field-mapping', () => {
  test('defaultAutomaticBodyFromPayload wires hidden bindings', () => {
    expect(defaultAutomaticBodyFromPayload(approvalProperties)).toEqual({
      policyId: 'payload.approvalPolicyId',
      subjectEntityId: 'payload.taskId',
    });
  });

  test('integrationPropertiesForWorkflowDesigner merges canonical platform bindings', () => {
    const merged = integrationPropertiesForWorkflowDesigner(PLATFORM_SERVICE_ID_LAB_APPROVAL_REQUESTS, [
      { name: 'policyId', type: 'string', label: 'Policy' },
      { name: 'title', type: 'string', label: 'Title' },
    ]);
    const policy = merged.find((row) => row.name === 'policyId');
    expect(policy?.workflowDesignerBinding?.hideFromMapper).toBe(true);
  });

  test('splitIntegrationBodyFromPayloadMappings separates user vs automatic rows', () => {
    const labels = new Map([
      ['title', 'Title'],
      ['taskId', 'Task ID'],
      ['approvalPolicyId', 'Approval policy id'],
    ]);
    const { userMappings, automaticMappings } = splitIntegrationBodyFromPayloadMappings(
      approvalProperties,
      {
        policyId: 'payload.approvalPolicyId',
        title: 'payload.title',
        subjectEntityId: 'payload.taskId',
      },
      labels,
    );
    expect(userMappings).toHaveLength(1);
    expect(userMappings[0].field).toBe('title');
    expect(automaticMappings).toHaveLength(2);
    expect(automaticMappings.map((row) => row.field).sort()).toEqual(['policyId', 'subjectEntityId']);
  });
});
