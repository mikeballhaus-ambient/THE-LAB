/**
 * The starter code for a new `code` node.
 *
 * ## Why multi-line, and why this shape
 *
 * A one-liner like `(items) => items.map(...)` is compact but **teaches nothing about where to write
 * code**. An author opening the node sees a finished expression and has no obvious place to add a line.
 * A block body gives three labelled places instead:
 *
 * ```js
 * (items) => {
 *   // items is always an ARRAY. One webhook call = one item.
 *   return items.map((item) => {
 *     // ← write per-item logic here
 *     return { ...item }   // ← shape the item this node passes on
 *   })
 * }
 * ```
 *
 * ## Why `items` is an array even for one webhook call
 *
 * Every node in the graph transforms an **array of items**, and a trigger seeds exactly one item from
 * the payload (`singleItemOutput`). So a webhook posting `{"stepValue": 1}` reaches this node as
 * `[{ stepValue: 1 }]` — not `{ stepValue: 1 }`. Writing `item.stepValue` against a non-existent
 * `item` is the single most common mistake here, which is why the starter names the array, the item,
 * and the return value explicitly rather than hiding them inside one arrow.
 *
 * The `(... ?? 0) + 1` default is deliberate for the demo: a second call with a different starting
 * value must still increment. An author guarding a required field belongs in an IF node, not here.
 */

export interface CodeExampleOptions {
  /**
   * Field to increment, derived from a captured payload. `null` falls back to a neutral shape that
   * does not pretend to know the payload.
   */
  incrementField?: string | null;
}

/**
 * Build the starter body shown in the code editor.
 *
 * With a captured field it increments **that** field, so the example is runnable against the payload
 * the author actually received. Without one it returns an untouched item, which is honest — inventing
 * a field name produces code that parses, runs, and silently does nothing.
 */
export function buildCodeNodeExample(options: CodeExampleOptions = {}): string {
  const field = options.incrementField?.trim();

  if (!field) {
    return [
      '(items) => {',
      '  // `items` is always an array — a trigger seeds one item per event.',
      '  return items.map((item) => {',
      '    // Write your logic here. `item` holds the payload fields.',
      '    return { ...item }',
      '  })',
      '}',
    ].join('\n');
  }

  return [
    '(items) => {',
    '  // `items` is always an array — a trigger seeds one item per event.',
    '  return items.map((item) => {',
    `    // Increment \`${field}\`, treating a missing value as 0 so a repeat call still advances.`,
    `    return { ...item, ${field}: (item.${field} ?? 0) + 1 }`,
    '  })',
    '}',
  ].join('\n');
}
