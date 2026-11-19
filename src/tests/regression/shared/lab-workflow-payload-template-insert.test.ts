import { describe, expect, test } from '@jest/globals';
import {
  insertPayloadTemplateSnippet,
  itemTemplateRef,
  payloadTemplateRef,
} from '@/shared/utils/lab-workflow-payload-template-insert';
import {
  LAB_WORKFLOW_QUARKS_ITEM_FIELD_HINTS,
  mergeCapturedPayloadFieldHints,
} from '@/shared/utils/lab-workflow-quarks-item-fields';

describe('lab-workflow-payload-template-insert', () => {
  test('payloadTemplateRef normalizes paths', () => {
    expect(payloadTemplateRef('title')).toBe('{{payload.title}}');
    expect(payloadTemplateRef('payload.title')).toBe('{{payload.title}}');
    expect(payloadTemplateRef('assigneeUserId')).toBe('{{payload.assigneeUserId}}');
  });

  test('insertPayloadTemplateSnippet inserts at selection', () => {
    const text = 'Hello ';
    const { text: next, cursor } = insertPayloadTemplateSnippet(text, 'title', 6, 6);
    expect(next).toBe('Hello {{payload.title}}');
    expect(cursor).toBe('Hello {{payload.title}}'.length);
  });

  test('insertPayloadTemplateSnippet replaces selection', () => {
    const text = '{{payload.old}}';
    const { text: next } = insertPayloadTemplateSnippet(text, 'title', 0, text.length);
    expect(next).toBe('{{payload.title}}');
  });

  test('itemTemplateRef and item-style insert', () => {
    expect(itemTemplateRef('accrualDelta')).toBe('{{accrualDelta}}');
    const { text: next } = insertPayloadTemplateSnippet('Credit ', 'accrualDelta', 7, 7, 'item');
    expect(next).toBe('Credit {{accrualDelta}}');
  });

  test('mergeCapturedPayloadFieldHints adds Quarks fields without clobbering samples', () => {
    const merged = mergeCapturedPayloadFieldHints(
      [{ path: 'userId', type: 'number' }],
      LAB_WORKFLOW_QUARKS_ITEM_FIELD_HINTS,
    );
    expect(merged.some((field) => field.path === 'dailyAllotmentEligible')).toBe(true);
    expect(merged.find((field) => field.path === 'userId')?.type).toBe('number');
  });
});
