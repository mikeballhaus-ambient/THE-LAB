import { describe, test, expect } from '@jest/globals';
import {
  parseFormSchemaJson,
  serializeFormSchemaJson,
} from '@/apps/lab-formsbuilder/shared/utils/schema-json';

describe('schema-json', () => {
  test('parseFormSchemaJson defaults columns to 4 for empty input', () => {
    expect(parseFormSchemaJson(null)).toEqual({ model: {}, columns: 4 });
    expect(parseFormSchemaJson('')).toEqual({ model: {}, columns: 4 });
  });

  test('parseFormSchemaJson reads gridColumns and strips from model', () => {
    const raw = JSON.stringify({
      entityName: 'Item',
      properties: [],
      gridColumns: 6,
    });
    const parsed = parseFormSchemaJson(raw);
    expect(parsed.columns).toBe(6);
    expect(parsed.model).toEqual({ entityName: 'Item', properties: [] });
  });

  test('parseFormSchemaJson clamps gridColumns to 1–8', () => {
    expect(parseFormSchemaJson(JSON.stringify({ gridColumns: 0 })).columns).toBe(1);
    expect(parseFormSchemaJson(JSON.stringify({ gridColumns: 12 })).columns).toBe(8);
  });

  test('serializeFormSchemaJson embeds formActions when provided', () => {
    const json = serializeFormSchemaJson({ foo: 'bar' }, 4, {
      saveLabel: 'Submit',
      cancelLabel: 'Back',
    });
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.foo).toBe('bar');
    expect(parsed.formActions).toMatchObject({ saveLabel: 'Submit', cancelLabel: 'Back' });
  });

  test('parseFormSchemaJson reads formActions', () => {
    const raw = JSON.stringify({
      gridColumns: 5,
      formActions: { saveLabel: 'Go' },
    });
    const parsed = parseFormSchemaJson(raw);
    expect(parsed.columns).toBe(5);
    expect(parsed.formActions?.saveLabel).toBe('Go');
  });

  test('serializeFormSchemaJson omits gridColumns when default 4', () => {
    expect(serializeFormSchemaJson({ foo: 'bar' }, 4)).toBe('{"foo":"bar"}');
  });

  test('serializeFormSchemaJson embeds gridColumns when not default', () => {
    const json = serializeFormSchemaJson({ foo: 'bar' }, 6);
    expect(JSON.parse(json)).toEqual({ foo: 'bar', gridColumns: 6 });
  });

  test('round-trip preserves model and columns', () => {
    const model = { entityName: 'X', properties: [{ name: 'a', type: 'string' }] };
    const serialized = serializeFormSchemaJson(model, 3);
    const parsed = parseFormSchemaJson(serialized);
    expect(parsed.columns).toBe(3);
    expect(parsed.model).toEqual(model);
  });
});
