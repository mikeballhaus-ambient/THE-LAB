import { describe, expect, test } from '@jest/globals';
import {
  collectPayloadShapeFields,
  diffPayloadShapes,
  payloadShapesMatch,
  payloadShapePaths,
} from '@/shared/utils/lab-workflow-payload-shape';

/**
 * The contract of this module is precisely "shapes, not values". Every test below is either an
 * example of that rule or a boundary where a naive value comparison would get it wrong.
 */
describe('payload shape — values are never compared', () => {
  test('a counter incrementing is not a shape change', () => {
    // This is the case that motivated the whole design: a webhook demo sends stepValue 1, then 2,
    // then 3. A value comparison would warn on every call.
    expect(payloadShapesMatch({ stepValue: 1 }, { stepValue: 2 })).toBe(true);
  });

  test('a changed string value is not a shape change', () => {
    expect(payloadShapesMatch({ name: 'Mia' }, { name: 'Jordan' })).toBe(true);
  });

  test('a changed boolean is not a shape change', () => {
    expect(payloadShapesMatch({ stop: false }, { stop: true })).toBe(true);
  });

  test('null to a value of the same field IS a shape change', () => {
    // `null` is its own type here on purpose: a mapping cannot address a null, so a field going from
    // null to string changes what the author can actually map.
    const diff = diffPayloadShapes({ note: null }, { note: 'hello' });
    expect(diff.retyped).toEqual([{ path: 'note', from: 'null', to: 'string' }]);
  });

  test('key order is irrelevant', () => {
    expect(payloadShapesMatch({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });
});

describe('payload shape — real divergence is detected', () => {
  test('an added field is reported', () => {
    const diff = diffPayloadShapes({ stepValue: 1 }, { stepValue: 1, note: 'x' });
    expect(diff.added).toEqual(['note']);
    expect(diff.removed).toEqual([]);
  });

  test('a removed field is reported', () => {
    const diff = diffPayloadShapes({ stepValue: 1, note: 'x' }, { stepValue: 1 });
    expect(diff.removed).toEqual(['note']);
  });

  test('a type change is reported as retyped, not as add+remove', () => {
    // Reporting it as add+remove would tell the author to delete and recreate the row, when all that
    // is needed is to notice the caller changed type.
    const diff = diffPayloadShapes({ stepValue: 1 }, { stepValue: '1' });
    expect(diff.retyped).toEqual([{ path: 'stepValue', from: 'number', to: 'string' }]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  test('a nested field appearing is reported by its dotted path', () => {
    const diff = diffPayloadShapes({ user: { name: 'a' } }, { user: { name: 'a', email: 'e' } });
    expect(diff.added).toEqual(['user.email']);
  });
});

describe('payload shape — arrays', () => {
  test('an array of same-shaped objects growing is not a shape change', () => {
    // An integration sending more rows is not a mapping change.
    expect(
      payloadShapesMatch({ items: [{ id: 1 }] }, { items: [{ id: 1 }, { id: 2 }, { id: 3 }] }),
    ).toBe(true);
  });

  test('array element paths are addressable with []', () => {
    const paths = payloadShapePaths({ items: [{ id: 1, name: 'a' }] });
    expect(paths).toContain('items');
    expect(paths).toContain('items[].id');
    expect(paths).toContain('items[].name');
  });

  test('an array of objects becoming an array of scalars is a shape change', () => {
    const diff = diffPayloadShapes({ items: [{ id: 1 }] }, { items: [1, 2] });
    expect(diff.removed).toContain('items[].id');
  });
});

describe('payload shape — flattening', () => {
  test('an empty object is a leaf', () => {
    expect(collectPayloadShapeFields({ meta: {} })).toEqual([{ path: 'meta', type: 'object' }]);
  });

  test('sorts by path so the output is stable', () => {
    const fields = collectPayloadShapeFields({ z: 1, a: 2, m: 3 });
    expect(fields.map((f) => f.path)).toEqual(['a', 'm', 'z']);
  });

  test('caps depth rather than recursing without bound', () => {
    let deep: Record<string, unknown> = { leaf: 1 };
    for (let i = 0; i < 30; i += 1) {
      deep = { child: deep };
    }
    // Returns rather than throwing; the point is that a hostile body cannot make this quadratic.
    expect(() => collectPayloadShapeFields(deep, { maxDepth: 4 })).not.toThrow();
  });

  test('caps field count', () => {
    const wide: Record<string, number> = {};
    for (let i = 0; i < 500; i += 1) {
      wide[`k${i}`] = i;
    }
    expect(collectPayloadShapeFields(wide, { maxFields: 10 })).toHaveLength(10);
  });

  test('a non-object payload yields a single anonymous leaf', () => {
    expect(collectPayloadShapeFields('hello')).toEqual([{ path: '', type: 'string' }]);
  });
});
