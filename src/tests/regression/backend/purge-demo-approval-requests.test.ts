import { describe, expect, test, beforeAll } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { databaseManager } from '@/backend/db/DatabaseManager';
import { labApprovalsRepository } from '@/backend/db/LabApprovals/lab-approvals-repository';
import {
  CRM_SALES_APPROVAL_POLICY_ID,
  DEMO_APPROVAL_POLICY_SEEDS,
} from '@/shared/utils/demo-workflow-seed-catalog';

describe('deleteRequestsForPolicyIds (demo policies)', () => {
  beforeAll(async () => {
    await databaseManager.initialize();
  });

  test('removes requests on seeded demo policy ids only', () => {
    expect(labApprovalsRepository.getPolicyById(CRM_SALES_APPROVAL_POLICY_ID)).not.toBeNull();

    const otherPolicyId = randomUUID();
    labApprovalsRepository.insertPolicy({
      id: otherPolicyId,
      name: 'Non-demo policy',
      description: 'test',
      enabled: true,
      createdByUserId: 1,
      definitionJson: JSON.stringify({ schemaVersion: 1, steps: [{ assigneeUserId: 1 }] }),
    });

    const demoRequestId = randomUUID();
    const otherRequestId = randomUUID();
    labApprovalsRepository.insertRequest({
      id: demoRequestId,
      policyId: CRM_SALES_APPROVAL_POLICY_ID,
      title: 'Demo CRM request',
      description: null,
      status: 'pending',
      requesterUserId: 1,
      subjectAppId: 'app-lab-crm',
      subjectEntityType: 'sales',
      subjectEntityId: '1',
      currentStepIndex: 0,
    });
    labApprovalsRepository.insertStep(demoRequestId, 0, 1, 'pending');

    labApprovalsRepository.insertRequest({
      id: otherRequestId,
      policyId: otherPolicyId,
      title: 'Custom policy request',
      description: null,
      status: 'pending',
      requesterUserId: 1,
      subjectAppId: 'app-lab-crm',
      subjectEntityType: 'sales',
      subjectEntityId: '2',
      currentStepIndex: 0,
    });
    labApprovalsRepository.insertStep(otherRequestId, 0, 1, 'pending');

    const policyIds = DEMO_APPROVAL_POLICY_SEEDS.map((seed) => seed.id);
    const removed = labApprovalsRepository.deleteRequestsForPolicyIds(policyIds);

    expect(removed).toBeGreaterThanOrEqual(1);
    expect(labApprovalsRepository.getRequestById(demoRequestId)).toBeNull();
    expect(labApprovalsRepository.getRequestById(otherRequestId)).not.toBeNull();

    labApprovalsRepository.deleteRequestsForPolicyIds([otherPolicyId]);
    labApprovalsRepository.deletePolicy(otherPolicyId);
  });
});
