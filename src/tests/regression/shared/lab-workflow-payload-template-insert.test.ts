import { describe, expect, test } from '@jest/globals';
import {
  insertPayloadTemplateSnippet,
  payloadTemplateRef,
} from '@/shared/utils/lab-workflow-payload-template-insert';

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
});
