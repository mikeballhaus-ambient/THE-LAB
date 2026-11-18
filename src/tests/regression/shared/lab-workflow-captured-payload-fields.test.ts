import { describe, expect, test } from '@jest/globals';
import {
  CUSTOM_PATH_SENTINEL,
  capturedPayloadFields,
  latestCapturedPayloadFields,
} from '@/shared/utils/lab-workflow-captured-payload-fields';

/**
 * Completion for the `code` node is only trustworthy if every suggested path came from a payload that
 * actually arrived. These tests pin the two ways that could go wrong: inventing structure, and
 * leaking the `Custom path…` select sentinel into code.
 */

function envelope(payload: unknown): string {
  return JSON.stringify({
    schemaVersion: 1,
    id: 'e1',
    type: 'platform-webhook.request.received',
    payload,
  });
}

describe('capturedPayloadFields', () => {
  test('lists a flat payload as dotted paths with types', () => {
    const fields = capturedPayloadFields(envelope({ stepValue: 1, note: 'hi' }));
    expect(fields).toEqual([
      { path: 'stepValue', type: 'number' },
      { path: 'note', type: 'string' },
    ]);
  });

  test('flattens nested objects', () => {
    const fields = capturedPayloadFields(envelope({ user: { id: 7, name: 'a' } }));
    expect(fields.map((f) => f.path)).toEqual(['user.id', 'user.name']);
  });

  test('collapses array indices so code survives a different length', () => {
    // `items.0.name` would break on the next call with two elements.
    const fields = capturedPayloadFields(envelope({ items: [{ name: 'a' }, { name: 'b' }] }));
    expect(fields.map((f) => f.path)).toEqual(['items[].name']);
  });

  test('a primitive array is reported as one array field', () => {
    const fields = capturedPayloadFields(envelope({ tags: ['a', 'b'] }));
    expect(fields).toEqual([{ path: 'tags', type: 'array' }]);
  });

  test('never emits the custom-path sentinel', () => {
    const fields = capturedPayloadFields(envelope({ a: 1 }));
    expect(fields.some((f) => f.path === CUSTOM_PATH_SENTINEL)).toBe(false);
  });

  test('malformed json yields no suggestions rather than throwing', () => {
    expect(capturedPayloadFields('{not json')).toEqual([]);
  });

  test('a non-object payload yields nothing', () => {
    expect(capturedPayloadFields(envelope('just a string'))).toEqual([]);
  });
});

describe('latestCapturedPayloadFields', () => {
  const sample = (id: string, capturedAt: string | null, payload: unknown) => ({
    id,
    name: id,
    capturedAt,
    envelopeJson: envelope(payload),
  });

  test('uses the most recent capture', () => {
    const fields = latestCapturedPayloadFields([
      sample('old', '2026-01-01T00:00:00Z', { legacy: true }),
      sample('new', '2026-05-01T00:00:00Z', { stepValue: 1 }),
    ]);
    expect(fields.map((f) => f.path)).toEqual(['stepValue']);
  });

  test('ignores hand-saved samples that were never captured', () => {
    // A saved sample is a shape the author typed; a capture is a shape that happened. Only the
    // latter is evidence of what a caller will actually send.
    const fields = latestCapturedPayloadFields([
      sample('typed', null, { invented: 1 }),
    ]);
    expect(fields).toEqual([]);
  });

  test('no captures at all yields nothing', () => {
    expect(latestCapturedPayloadFields([])).toEqual([]);
  });
});
