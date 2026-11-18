import { describe, expect, test } from '@jest/globals';
import {
  buildRuleConditionPayloadPathOptions,
  collectRuleConditionPayloadFields,
  collectWorkflowPayloadMappingFields,
  ruleConditionPayloadPathUseSelect,
  ruleConditionPayloadValueOptions,
} from '@/shared/utils/lab-rule-payload-fields';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

const taskCreated: LabDomainEventCatalogEntry = {
  eventType: 'app-lab-tasklist.task.created',
  sourceAppId: 'app-lab-tasklist',
  label: 'Task created',
  description: '',
  publisherKind: 'catalog-app',
  payloadFields: [
    { path: 'taskId', label: 'Task ID', valueKind: 'id' },
    { path: 'title', label: 'Title', valueKind: 'string' },
    { path: 'assigneeId', label: 'Assignee', valueKind: 'userId' },
    {
      path: 'priority',
      label: 'Priority',
      valueKind: 'string',
      allowedValues: ['low', 'medium', 'high', 'urgent'],
    },
  ],
};

describe('collectRuleConditionPayloadFields', () => {
  test('excludes opaque id fields from condition picker', () => {
    const fields = collectRuleConditionPayloadFields(['app-lab-tasklist.task.created'], [taskCreated]);
    expect(fields.map((f) => f.path).sort()).toEqual(['assigneeId', 'priority', 'title']);
  });

  test('unions payload fields for trigger patterns with trailing .*', () => {
    const approved: LabDomainEventCatalogEntry = {
      eventType: 'platform-approvals.request.approved',
      sourceAppId: 'app-lab-approvals-policies',
      label: 'Approved',
      description: '',
      publisherKind: 'platform',
      payloadFields: [
        { path: 'policyId', label: 'Policy ID', valueKind: 'id' },
        { path: 'requestStatus', label: 'Request status', valueKind: 'string' },
        { path: 'subjectEntityType', label: 'Subject entity type', valueKind: 'string' },
      ],
    };
    const rejected: LabDomainEventCatalogEntry = {
      eventType: 'platform-approvals.request.rejected',
      sourceAppId: 'app-lab-approvals-policies',
      label: 'Rejected',
      description: '',
      publisherKind: 'platform',
      payloadFields: [
        { path: 'requestStatus', label: 'Request status', valueKind: 'string' },
        { path: 'comment', label: 'Comment', valueKind: 'string' },
      ],
    };
    const fields = collectRuleConditionPayloadFields(
      ['platform-approvals.request.*'],
      [approved, rejected],
    );
    expect(fields.map((f) => f.path).sort()).toEqual(['comment', 'requestStatus', 'subjectEntityType']);
  });

  test('merges observed capture paths for dynamic-payload triggers', () => {
    const fields = collectRuleConditionPayloadFields(
      ['platform.webhook.received'],
      [],
      ['stepValue', 'webhookId'],
    );
    expect(fields.map((f) => f.path).sort()).toEqual(['stepValue', 'webhookId']);
  });
});

describe('buildRuleConditionPayloadPathOptions', () => {
  test('includes orphaned custom path for legacy conditions', () => {
    const fields = collectRuleConditionPayloadFields(['app-lab-tasklist.task.created'], [taskCreated]);
    const options = buildRuleConditionPayloadPathOptions('legacyField', fields);
    expect(options[0]).toEqual({ label: 'legacyField (custom)', value: 'legacyField' });
    expect(options.some((o) => o.value === 'priority')).toBe(true);
  });
});

describe('ruleConditionPayloadPathUseSelect', () => {
  const options = [
    { label: 'Title', value: 'title' },
    { label: 'Assignee', value: 'assigneeId' },
  ];

  test('uses select when catalog has fields', () => {
    expect(ruleConditionPayloadPathUseSelect(options)).toBe(true);
  });

  test('uses text input when only custom placeholder exists', () => {
    expect(ruleConditionPayloadPathUseSelect([{ label: 'Custom path…', value: '__path_custom__' }])).toBe(
      false,
    );
  });
});

describe('ruleConditionPayloadValueOptions', () => {
  test('returns allowed values for catalog field', () => {
    const options = ruleConditionPayloadValueOptions(
      'priority',
      ['app-lab-tasklist.task.created'],
      [taskCreated],
    );
    expect(options.map((o) => o.value)).toEqual(['low', 'medium', 'high', 'urgent']);
  });
});

describe('collectWorkflowPayloadMappingFields', () => {
  test('includes id fields for integration mapping pickers', () => {
    const fields = collectWorkflowPayloadMappingFields(['app-lab-tasklist.task.created'], [taskCreated]);
    expect(fields.map((f) => f.path).sort()).toEqual(['assigneeId', 'priority', 'taskId', 'title']);
  });
});
