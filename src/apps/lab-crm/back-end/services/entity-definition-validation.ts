import { RESERVED_TABLES } from '@/shared/types/app/app-database';
import type { EntityDefinition, EntityProperty, EntityPropertyType } from '../../shared/types/entity.types';
import { validateLookupDisplayProperty } from '../../shared/utils/lookup-display-property';
import { validateLookupDisplayFormat } from '../../shared/utils/lookup-display-format';

const ENTITY_KEY_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;
const PROPERTY_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

const RESERVED_ENTITY_KEYS = new Set<string>([
  ...RESERVED_TABLES,
  'definitions',
  'form-bindings',
  'connector',
  'discovery',
  'health',
  'api',
  'records',
]);

const ALLOWED_PROPERTY_TYPES: EntityPropertyType[] = [
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'enum',
  'lookup',
  'labUser',
  'array',
];

export function validateEntityKey(entityKey: string): string[] {
  const errors: string[] = [];
  const trimmed = entityKey.trim();
  if (!trimmed) {
    errors.push('entityKey is required');
    return errors;
  }
  if (!ENTITY_KEY_PATTERN.test(trimmed)) {
    errors.push(
      'entityKey must start with a lowercase letter and contain only lowercase letters, digits, and hyphens',
    );
  }
  if (RESERVED_ENTITY_KEYS.has(trimmed)) {
    errors.push(`entityKey "${trimmed}" is reserved`);
  }
  return errors;
}

export function validateProperties(
  properties: EntityProperty[],
  knownEntityKeys: Set<string>,
): string[] {
  const errors: string[] = [];
  const names = new Set<string>();

  if (!Array.isArray(properties) || properties.length === 0) {
    errors.push('At least one property is required');
    return errors;
  }

  for (const prop of properties) {
    if (!prop.name?.trim()) {
      errors.push('Each property must have a name');
      continue;
    }
    if (!PROPERTY_NAME_PATTERN.test(prop.name)) {
      errors.push(`Property name "${prop.name}" is invalid`);
    }
    if (names.has(prop.name)) {
      errors.push(`Duplicate property name "${prop.name}"`);
    }
    names.add(prop.name);

    if (!prop.label?.trim()) {
      errors.push(`Property "${prop.name}" must have a label`);
    }

    if (!ALLOWED_PROPERTY_TYPES.includes(prop.type)) {
      errors.push(`Property "${prop.name}" has invalid type "${prop.type}"`);
    }

    if (prop.type === 'enum') {
      if (!prop.options?.length) {
        errors.push(`Property "${prop.name}" (enum) requires options`);
      }
    }

    if (prop.type === 'lookup') {
      const target = prop.lookupEntityKey?.trim();
      if (!target) {
        errors.push(`Property "${prop.name}" (lookup) requires lookupEntityKey`);
      } else if (!knownEntityKeys.has(target)) {
        errors.push(`Property "${prop.name}" lookup target "${target}" does not exist`);
      }
    }
  }

  return errors;
}

export function validateLookupDisplayPropertyForDefinition(
  lookupDisplayProperty: string | null | undefined,
  properties: EntityProperty[],
): string[] {
  return validateLookupDisplayProperty(lookupDisplayProperty, properties);
}

export function validateLookupDisplayFormatForDefinition(
  lookupDisplayFormat: string | null | undefined,
  properties: EntityProperty[],
): string[] {
  return validateLookupDisplayFormat(lookupDisplayFormat, properties);
}

export function validateLookupDisplaySettings(
  settings: {
    lookupDisplayProperty?: string | null;
    lookupDisplayFormat?: string | null;
  },
  properties: EntityProperty[],
): string[] {
  return [
    ...validateLookupDisplayProperty(settings.lookupDisplayProperty, properties),
    ...validateLookupDisplayFormat(settings.lookupDisplayFormat, properties),
  ];
}

export function validateCreateDefinitionInput(
  input: {
    entityKey: string;
    name: string;
    properties: EntityProperty[];
    lookupDisplayProperty?: string | null;
    lookupDisplayFormat?: string | null;
  },
  existingKeys: Set<string>,
  knownEntityKeys: Set<string>,
): string[] {
  const errors = [...validateEntityKey(input.entityKey)];
  if (!input.name?.trim()) {
    errors.push('name is required');
  }
  if (existingKeys.has(input.entityKey.trim())) {
    errors.push(`entityKey "${input.entityKey}" already exists`);
  }
  errors.push(...validateProperties(input.properties, knownEntityKeys));
  errors.push(...validateLookupDisplaySettings(input, input.properties));
  return errors;
}

export function validateUpdateDefinitionInput(
  patch: { properties?: EntityProperty[] },
  knownEntityKeys: Set<string>,
  selfEntityKey: string,
): string[] {
  if (patch.properties == null) {
    return [];
  }
  const keysForLookups = new Set(knownEntityKeys);
  keysForLookups.add(selfEntityKey);
  return validateProperties(patch.properties, keysForLookups);
}

export function findDefinitionsReferencingEntity(
  definitions: EntityDefinition[],
  targetEntityKey: string,
): string[] {
  const referrers: string[] = [];
  for (const def of definitions) {
    if (def.entityKey === targetEntityKey) {
      continue;
    }
    for (const prop of def.properties) {
      if (prop.type === 'lookup' && prop.lookupEntityKey === targetEntityKey) {
        referrers.push(def.entityKey);
        break;
      }
    }
  }
  return referrers;
}
