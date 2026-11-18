import type { EntityProperty, EntityPropertyType } from '../types/entity.types';

/** Property types allowed as the entity lookup display field. */
export const LOOKUP_DISPLAY_ELIGIBLE_TYPES: EntityPropertyType[] = [
  'string',
  'number',
  'date',
  'datetime',
  'enum',
];

export function isLookupDisplayEligibleProperty(prop: EntityProperty): boolean {
  return LOOKUP_DISPLAY_ELIGIBLE_TYPES.includes(prop.type);
}

export function validateLookupDisplayProperty(
  lookupDisplayProperty: string | null | undefined,
  properties: EntityProperty[],
): string[] {
  if (lookupDisplayProperty == null || lookupDisplayProperty === '') {
    return [];
  }
  const prop = properties.find((p) => p.name === lookupDisplayProperty);
  if (!prop) {
    return [`lookupDisplayProperty "${lookupDisplayProperty}" is not a property on this entity`];
  }
  if (!isLookupDisplayEligibleProperty(prop)) {
    return [
      `lookupDisplayProperty "${lookupDisplayProperty}" must be text, number, date, or choice list (not ${prop.type})`,
    ];
  }
  return [];
}

export function formatPropertyValueAsLookupLabel(
  prop: EntityProperty | undefined,
  value: unknown,
): string {
  if (value == null || value === '') {
    return '';
  }
  if (prop?.type === 'enum' && prop.options) {
    const match = prop.options.find((o) => o.value === String(value));
    if (match) {
      return match.label;
    }
  }
  return String(value);
}
