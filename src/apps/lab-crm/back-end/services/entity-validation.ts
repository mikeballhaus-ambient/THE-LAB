import type { EntityDefinition, EntityProperty } from '../../shared/types/entity.types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function coerceValue(prop: EntityProperty, raw: unknown): unknown {
  if (raw === null || raw === undefined || raw === '') {
    return raw === '' ? undefined : raw;
  }
  switch (prop.type) {
    case 'number':
      if (typeof raw === 'number') {
        return raw;
      }
      const num = Number(raw);
      return Number.isNaN(num) ? raw : num;
    case 'boolean':
      if (typeof raw === 'boolean') {
        return raw;
      }
      if (raw === 'true' || raw === 1 || raw === '1') {
        return true;
      }
      if (raw === 'false' || raw === 0 || raw === '0') {
        return false;
      }
      return raw;
    case 'lookup':
    case 'labUser':
      if (typeof raw === 'number') {
        return raw;
      }
      const id = parseInt(String(raw), 10);
      return Number.isNaN(id) ? raw : id;
    default:
      return typeof raw === 'string' ? raw : String(raw);
  }
}

export function validateRecordData(
  definition: EntityDefinition,
  data: Record<string, unknown>,
  options?: { partial?: boolean },
): ValidationResult {
  const errors: string[] = [];
  const partial = options?.partial ?? false;
  const normalized: Record<string, unknown> = { ...data };

  for (const prop of definition.properties) {
    const raw = normalized[prop.name];
    const missing =
      raw === undefined ||
      raw === null ||
      (typeof raw === 'string' && raw.trim() === '');

    if (!partial && prop.required && missing) {
      errors.push(`${prop.label} (${prop.name}) is required`);
      continue;
    }

    if (missing) {
      continue;
    }

    const value = coerceValue(prop, raw);
    normalized[prop.name] = value;

    if (prop.type === 'enum' && prop.options?.length) {
      const allowed = prop.options.map((o) => o.value);
      if (value != null && !allowed.includes(String(value))) {
        errors.push(`${prop.name} must be one of: ${allowed.join(', ')}`);
      }
    }

    if (prop.type === 'number' && value != null && typeof value !== 'number') {
      errors.push(`${prop.name} must be a number`);
    }

    if ((prop.type === 'lookup' || prop.type === 'labUser') && value != null && typeof value !== 'number') {
      errors.push(`${prop.name} must be a valid record id`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function stripUnknownFields(
  definition: EntityDefinition,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = new Set(definition.properties.map((p) => p.name));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key)) {
      out[key] = value;
    }
  }
  return out;
}
