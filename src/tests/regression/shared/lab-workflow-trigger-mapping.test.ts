import { describe, expect, test } from '@jest/globals';
import {
  applyTriggerOutputMapping,
  suggestedMappingFromShape,
  unresolvedMappingPaths,
  validateTriggerMapping,
} from '@/shared/utils/lab-workflow-trigger-mapping';
import { diffPayloadShapes } from '@/shared/utils/lab-workflow-payload-shape';

/**
 * Phase 37 — output mapping on a dynamic-payload trigger.
 *
 * The rule these tests defend: **populated ⇒ reduce; absent ⇒ pass through.** Unmapped fields are
 * dropped, because a mapping that passes everything through cannot surface a misspelled `to`.
 */
describe('applyTriggerOutputMapping', () => {
  test('absent mapping passes the payload through untouched', () => {
    const payload = { stepValue: 1, extra: 'kept' };
    expect(applyTriggerOutputMapping(payload, undefined)).toBe(payload);
    expect(applyTriggerOutputMapping(payload, null)).toBe(payload);
  });

  test('an empty mapping also passes through', () => {
    // An empty array is "the author has not mapped anything yet", not "map nothing".
    const payload = { a: 1 };
    expect(applyTriggerOutputMapping(payload, [])).toBe(payload);
  });

  test('a populated mapping drops unmapped fields', () => {
    const out = applyTriggerOutputMapping(
      { stepValue: 1, debug: 'noise' },
      [{ from: 'stepValue', to: 'stepValue' }],
    );
    expect(out).toEqual({ stepValue: 1 });
    expect(out).not.toHaveProperty('debug');
  });

  test('a mapping renames an observed path', () => {
    // The reason a mapping exists: a caller renames its field and only this row changes.
    const out = applyTriggerOutputMapping({ value: 42 }, [{ from: 'value', to: 'stepValue' }]);
    expect(out).toEqual({ stepValue: 42 });
  });

  test('nested paths project and rebuild nesting', () => {
    const out = applyTriggerOutputMapping(
      { user: { name: 'Mia' } },
      [{ from: 'user.name', to: 'person.name' }],
    );
    expect(out).toEqual({ person: { name: 'Mia' } });
  });

  test('a missing source is skipped rather than written as undefined', () => {
    // `payload_exists` downstream is a clearer signal than a field that exists but is null.
    const out = applyTriggerOutputMapping({}, [{ from: 'absent', to: 'name' }]);
    expect(out).toEqual({});
  });

  test('a half-written row is skipped', () => {
    const out = applyTriggerOutputMapping(
      { a: 1 },
      [
        { from: 'a', to: '' },
        { from: '', to: 'b' },
      ],
    );
    expect(out).toEqual({});
  });

  test('an array field projects whole, keeping its shape', () => {
    const out = applyTriggerOutputMapping(
      { items: [{ id: 1 }, { id: 2 }] },
      [{ from: 'items', to: 'rows' }],
    );
    expect(out).toEqual({ rows: [{ id: 1 }, { id: 2 }] });
  });

  test('false and 0 are projected, not treated as missing', () => {
    // `value === undefined` is the only "missing" test; a falsy value is real data.
    const out = applyTriggerOutputMapping(
      { stop: false, stepValue: 0 },
      [
        { from: 'stop', to: 'stop' },
        { from: 'stepValue', to: 'stepValue' },
      ],
    );
    expect(out).toEqual({ stop: false, stepValue: 0 });
  });
});

describe('unresolvedMappingPaths — what blocks save after Adopt', () => {
  test('lists rows whose source the new shape does not contain', () => {
    const paths = unresolvedMappingPaths({ stepValue: 1 }, [
      { from: 'stepValue', to: 'stepValue' },
      { from: 'note', to: 'note' },
    ]);
    expect(paths).toEqual(['note']);
  });

  test('is empty when every row still resolves', () => {
    expect(
      unresolvedMappingPaths({ stepValue: 2 }, [{ from: 'stepValue', to: 'stepValue' }]),
    ).toEqual([]);
  });

  test('ignores rows with no source', () => {
    expect(unresolvedMappingPaths({}, [{ from: '', to: 'x' }])).toEqual([]);
  });
});

describe('validateTriggerMapping', () => {
  test('accepts distinct targets', () => {
    const result = validateTriggerMapping([
      { from: 'a', to: 'a' },
      { from: 'b', to: 'b' },
    ]);
    expect(result.valid).toBe(true);
  });

  test('rejects two rows writing one target', () => {
    // Ambiguous, not a merge: last-one-wins would hide which source is used.
    const result = validateTriggerMapping([
      { from: 'a', to: 'x' },
      { from: 'b', to: 'x' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.duplicateTargets).toEqual(['x']);
  });

  test('reports incomplete rows', () => {
    const result = validateTriggerMapping([{ from: 'a', to: '' }]);
    expect(result.valid).toBe(false);
    expect(result.incomplete).toBe(1);
  });

  test('an absent mapping is valid', () => {
    expect(validateTriggerMapping(undefined).valid).toBe(true);
  });
});

describe('suggestedMappingFromShape', () => {
  test('offers leaf paths as identity rows, in path order', () => {
    // `collectPayloadShapeFields` sorts by path, so the suggestions are stable regardless of the
    // order the caller serialised its keys in.
    const rows = suggestedMappingFromShape({ stepValue: 1, note: 'x' });
    expect(rows).toEqual([
      { from: 'note', to: 'note' },
      { from: 'stepValue', to: 'stepValue' },
    ]);
  });

  test('does not offer an intermediate object as well as its child', () => {
    // Mapping both would write the same data twice.
    const rows = suggestedMappingFromShape({ user: { name: 'a' } });
    expect(rows).toEqual([{ from: 'user.name', to: 'user.name' }]);
  });
});

describe('divergence detection drives the Keep/Adopt prompt', () => {
  test('a legitimate value change produces no prompt', () => {
    // The whole point of comparing shapes: this must NOT warn.
    const diff = diffPayloadShapes({ stepValue: 1 }, { stepValue: 2 });
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.retyped).toEqual([]);
  });

  test('an added field is what prompts', () => {
    const diff = diffPayloadShapes({ stepValue: 1 }, { stepValue: 2, note: 'x' });
    expect(diff.added).toEqual(['note']);
  });

  test('a renamed field shows as added + removed', () => {
    const diff = diffPayloadShapes({ value: 1 }, { stepValue: 1 });
    expect(diff.added).toEqual(['stepValue']);
    expect(diff.removed).toEqual(['value']);
  });
});
