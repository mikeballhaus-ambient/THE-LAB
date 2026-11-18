import type { EntityDefinition, EntityProperty } from '../types/entity.types';
import {
  formatPropertyValueAsLookupLabel,
  isLookupDisplayEligibleProperty,
} from './lookup-display-property';

/** Matches `{{ propertyName }}` with optional inner whitespace. */
export const LOOKUP_DISPLAY_FORMAT_PLACEHOLDER = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function extractLookupDisplayFormatProperties(format: string): string[] {
  const names: string[] = [];
  for (const match of format.matchAll(LOOKUP_DISPLAY_FORMAT_PLACEHOLDER)) {
    names.push(match[1]);
  }
  return names;
}

export function validateLookupDisplayFormat(
  lookupDisplayFormat: string | null | undefined,
  properties: EntityProperty[],
): string[] {
  const trimmed = lookupDisplayFormat?.trim();
  if (!trimmed) {
    return [];
  }
  const placeholders = extractLookupDisplayFormatProperties(trimmed);
  if (placeholders.length === 0) {
    return [
      'lookupDisplayFormat must include at least one placeholder like {{ firstName }}',
    ];
  }
  const propByName = new Map(properties.map((p) => [p.name, p]));
  const errors: string[] = [];
  for (const name of placeholders) {
    const prop = propByName.get(name);
    if (!prop) {
      errors.push(`lookupDisplayFormat references unknown property "${name}"`);
    } else if (!isLookupDisplayEligibleProperty(prop)) {
      errors.push(
        `lookupDisplayFormat cannot use "${name}" (type ${prop.type}); use text, number, date, or choice list fields`,
      );
    }
  }
  return errors;
}

export function applyLookupDisplayFormat(
  format: string,
  definition: EntityDefinition,
  data: Record<string, unknown>,
): string {
  const propByName = new Map(definition.properties.map((p) => [p.name, p]));
  const rendered = format.replace(LOOKUP_DISPLAY_FORMAT_PLACEHOLDER, (_full, name: string) => {
    const prop = propByName.get(name);
    return formatPropertyValueAsLookupLabel(prop, data[name]);
  });
  return rendered.replace(/\s+/g, ' ').trim();
}
