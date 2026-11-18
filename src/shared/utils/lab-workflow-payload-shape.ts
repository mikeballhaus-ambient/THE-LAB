/**
 * Payload **shape** fingerprinting for webhook mapping (phase 37).
 *
 * The problem this solves: a webhook's payload is whatever the caller sends, and the same integration
 * legitimately sends different *values* every time (`{"stepValue": 1}` then `{"stepValue": 2}`). If
 * shape comparison looked at values, a saved mapping would "diverge" on every single call and the
 * author would learn to dismiss the warning without reading it.
 *
 * So this module answers one question only: **is the set of paths and their types the same?** Values
 * are deliberately discarded.
 *
 * What counts as a shape change:
 *
 * | Change | Differs? |
 * |---|---|
 * | `stepValue` 1 → 2 | no |
 * | a field appears / disappears | **yes** |
 * | a field's type changes (number → string) | **yes** |
 * | keys reordered | no |
 * | an array of same-shaped objects grows | no |
 * | an array of objects becomes an array of scalars | **yes** |
 */

/** One leaf of the flattened payload: a dotted path and the JSON type found there. */
export interface LabWorkflowPayloadShapeField {
  path: string;
  /** `string` | `number` | `boolean` | `null` | `object` | `array` */
  type: string;
}

function typeOf(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

/**
 * Flatten a payload to `path:type` leaves.
 *
 * Arrays are **collapsed to their element shape**, so `[{a:1}]` and `[{a:1},{a:2},{a:3}]` describe the
 * same shape — which is correct: the author's mapping does not change because a caller sent more rows.
 * An array whose elements are themselves objects contributes the element's paths, not `arr.0.x`.
 *
 * Deep nesting is capped so a hostile body cannot make this quadratic.
 */
export function collectPayloadShapeFields(
  payload: unknown,
  options: { maxDepth?: number; maxFields?: number } = {},
): LabWorkflowPayloadShapeField[] {
  const maxDepth = options.maxDepth ?? 8;
  const maxFields = options.maxFields ?? 200;
  const out: LabWorkflowPayloadShapeField[] = [];
  const seen = new Set<string>();

  const add = (path: string, type: string): void => {
    const key = `${path}:${type}`;
    if (seen.has(key) || out.length >= maxFields) {
      return;
    }
    seen.add(key);
    out.push({ path, type });
  };

  const walk = (value: unknown, path: string, depth: number): void => {
    if (out.length >= maxFields) {
      return;
    }
    if (depth > maxDepth) {
      return;
    }
    const type = typeOf(value);

    if (type === 'array') {
      // Declare the array itself, then describe its elements at `path[]` so a mapping can address
      // `items[].id` without depending on how many rows arrived.
      add(path, 'array');
      const elements = value as unknown[];
      for (const element of elements) {
        walk(element, `${path}[]`, depth + 1);
        // One representative element is enough: a heterogeneous array is indistinguishable from its
        // first element for mapping purposes, and walking every row is O(n) work for no new paths.
        if (typeOf(element) === 'object') {
          break;
        }
      }
      return;
    }

    if (type === 'object') {
      // An empty object is a leaf: it has no paths below it, but its presence is part of the shape.
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        add(path, 'object');
        return;
      }
      for (const [key, child] of entries) {
        walk(child, path ? `${path}.${key}` : key, depth + 1);
      }
      return;
    }

    add(path, type);
  };

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    walk(payload, '', 0);
    return out;
  }
  for (const [key, child] of Object.entries(payload as Record<string, unknown>)) {
    walk(child, key, 0);
  }

  return out.sort((left, right) => left.path.localeCompare(right.path) || left.type.localeCompare(right.type));
}

/**
 * Stable fingerprint of a shape: sorted `path:type` pairs, hashed.
 *
 * Sorting is what makes key order irrelevant. `JSON.stringify` of the whole payload would not work —
 * it is value- and order-sensitive, which is exactly the two things this must ignore.
 */
export function fingerprintPayloadShape(payload: unknown): string {
  const fields = collectPayloadShapeFields(payload);
  return fields.map((field) => `${field.path}:${field.type}`).join('|');
}

/** Paths only — what a mapping editor offers as suggestions. */
export function payloadShapePaths(payload: unknown): string[] {
  return [...new Set(collectPayloadShapeFields(payload).map((field) => field.path))].sort();
}

export interface LabWorkflowPayloadShapeDiff {
  added: string[];
  removed: string[];
  /** Same path, different type — the subtlest breakage, so it is called out separately. */
  retyped: { path: string; from: string; to: string }[];
}

/**
 * Compare two payloads **by shape only**.
 *
 * Values are never inspected, so a counter incrementing or a timestamp changing produces an empty
 * diff. That is what keeps the divergence warning trustworthy.
 */
export function diffPayloadShapes(
  previous: unknown,
  next: unknown,
): LabWorkflowPayloadShapeDiff {
  const before = new Map(collectPayloadShapeFields(previous).map((f) => [f.path, f.type]));
  const after = new Map(collectPayloadShapeFields(next).map((f) => [f.path, f.type]));

  const added: string[] = [];
  const removed: string[] = [];
  const retyped: { path: string; from: string; to: string }[] = [];

  for (const [path, type] of after) {
    const prior = before.get(path);
    if (prior === undefined) {
      added.push(path);
    } else if (prior !== type) {
      retyped.push({ path, from: prior, to: type });
    }
  }
  for (const path of before.keys()) {
    if (!after.has(path)) {
      removed.push(path);
    }
  }

  return {
    added: added.sort(),
    removed: removed.sort(),
    retyped: retyped.sort((left, right) => left.path.localeCompare(right.path)),
  };
}

/** True when the two payloads describe the same shape. */
export function payloadShapesMatch(previous: unknown, next: unknown): boolean {
  const diff = diffPayloadShapes(previous, next);
  return diff.added.length === 0 && diff.removed.length === 0 && diff.retyped.length === 0;
}
