/**
 * Property paths available on the item a `code` node receives.
 *
 * ## Why this is derived from a captured sample, not from the catalog
 *
 * A declared event's catalog entry lists its payload fields. A **webhook** has no such list — the
 * caller decides the body — so the only truthful source is a payload that actually arrived. Taking
 * the paths from a saved capture means every suggestion an author sees is a field that existed in a
 * real request, which is the difference between intellisense and guesswork.
 *
 * ## The `__path_custom__` trap
 *
 * {@link ruleConditionPayloadPathOptions} returns a single synthetic option when it has nothing to
 * offer, so a select can still say "Custom path…". That sentinel is a UI affordance, not a field —
 * inserting it into code produces a reference that can never resolve. It is filtered out here.
 */
import type { LabWorkflowTriggerMappingRow } from '@/shared/types/lab-workflow-graph';
import { applyTriggerOutputMapping } from '@/shared/utils/lab-workflow-trigger-mapping';

export const CUSTOM_PATH_SENTINEL = '__path_custom__';

export interface CapturedPayloadField {
  /** Dotted path from the item root, ready to use as `item.<path>`. */
  path: string;
  /** Coarse JSON type, so a suggestion can hint at the shape. */
  type: string;
}

type SampleLike = {
  id: string;
  name: string;
  capturedAt?: string | null;
  envelopeJson: string;
};

/**
 * Flatten an envelope's payload into dotted paths.
 *
 * Arrays are flattened by their **element shape**, with indices collapsed (`items[].name`), because a
 * webhook body's array length is unstable across calls — offering `items.0.name` would produce code
 * that breaks on the next request with two items.
 */
export function capturedPayloadFields(envelopeJson: string): CapturedPayloadField[] {
  let envelope: unknown;
  try {
    envelope = JSON.parse(envelopeJson) as unknown;
  } catch {
    return [];
  }
  const payload = (envelope as { payload?: unknown } | null)?.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }
  const out: CapturedPayloadField[] = [];
  walk(payload as Record<string, unknown>, '', out);
  return out;
}

function walk(
  value: Record<string, unknown>,
  prefix: string,
  out: CapturedPayloadField[],
): void {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(child)) {
      // Collapse indices: the first element defines the shape, and `[]` makes that explicit.
      const first = child.find((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
      if (first) {
        walk(first as Record<string, unknown>, `${path}[]`, out);
      } else {
        out.push({ path, type: 'array' });
      }
      continue;
    }
    if (child && typeof child === 'object') {
      walk(child as Record<string, unknown>, path, out);
      continue;
    }
    out.push({ path, type: jsonTypeName(child) });
  }
}

function jsonTypeName(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

/** Dotted paths from captured fields, for catalog merge helpers. */
export function capturedPayloadFieldPaths(fields: readonly CapturedPayloadField[]): string[] {
  return fields.map((field) => field.path).filter((path) => path.trim().length > 0);
}

/**
 * The most recent captured sample's fields, or `[]` when nothing has been captured.
 *
 * "Most recent" rather than "merged across all": shapes drift, and a field that only ever appeared in
 * an old call is exactly the one whose suggestion would produce code that silently never runs.
 */
export function latestCapturedPayloadFields(samples: readonly SampleLike[]): CapturedPayloadField[] {
  const latest = latestCapturedSample(samples);
  if (!latest) {
    return [];
  }
  return capturedPayloadFields(latest.envelopeJson);
}

/**
 * Fields the workflow **item** exposes after trigger output mapping — what IF nodes and actions see.
 *
 * Raw captures keep the caller body; mapping renames/filters before the graph runs. Suggesting raw
 * paths after the author mapped `amount` → `stepValue` would send them back to typing.
 */
export function latestWorkflowItemPayloadFieldsFromSamples(
  samples: readonly SampleLike[],
  triggerMapping: readonly LabWorkflowTriggerMappingRow[] | undefined | null,
): CapturedPayloadField[] {
  const latest = latestCapturedSample(samples);
  if (!latest) {
    return [];
  }
  let envelope: { payload?: unknown };
  try {
    envelope = JSON.parse(latest.envelopeJson) as { payload?: unknown };
  } catch {
    return [];
  }
  const raw = envelope.payload;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return [];
  }
  const rawRecord = raw as Record<string, unknown>;
  const projected = applyTriggerOutputMapping(rawRecord, triggerMapping);
  const itemPayload: Record<string, unknown> = { ...projected };
  const webhookId = rawRecord.webhookId;
  if (typeof webhookId === 'string' && webhookId.trim() && !(webhookId in itemPayload)) {
    itemPayload.webhookId = webhookId;
  }
  return capturedPayloadFields(JSON.stringify({ payload: itemPayload }));
}

function latestCapturedSample(samples: readonly SampleLike[]): SampleLike | null {
  const withCapture = samples.filter((sample) => Boolean(sample.capturedAt));
  if (withCapture.length === 0) {
    return null;
  }
  return [...withCapture].sort((a, b) => String(b.capturedAt).localeCompare(String(a.capturedAt)))[0];
}

