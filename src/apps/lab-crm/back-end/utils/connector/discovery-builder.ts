import type {
  FormBuilderContractModelProperty,
  FormsBuilderContract,
  LookupContract,
} from '@/shared/types';
import {
  buildStandardConnectorCrudPaths,
  resolveConnectorApiBase,
} from '@/shared/server/connector-discovery';
import type { EntityDefinition, EntityProperty } from '../../../shared/types/entity.types';

function propertyToContractType(
  prop: EntityProperty,
): FormBuilderContractModelProperty['type'] {
  switch (prop.type) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'datetime':
      return 'date';
    case 'array':
      return 'array';
    case 'lookup':
    case 'labUser':
      return 'number';
    default:
      return 'string';
  }
}

function buildProperties(definition: EntityDefinition): FormBuilderContractModelProperty[] {
  const props: FormBuilderContractModelProperty[] = [
    { name: 'id', type: 'number', label: 'ID' },
  ];
  for (const p of definition.properties) {
    props.push({
      name: p.name,
      type: propertyToContractType(p),
      label: p.label,
    });
  }
  return props;
}

function buildLookups(definition: EntityDefinition): LookupContract[] {
  const lookups: LookupContract[] = [];
  for (const prop of definition.properties) {
    if (prop.type === 'enum' && prop.options?.length) {
      lookups.push({
        forProperty: prop.name,
        endpoint: {
          url: `/api/connector/${definition.entityKey}/lookups/${prop.name}`,
          type: 'GET',
          data: {},
          response: prop.options.map((o) => ({
            id: o.value,
            value: o.value,
            label: o.label,
          })),
        },
      });
    }
    if (prop.type === 'lookup' && prop.lookupEntityKey) {
      lookups.push({
        forProperty: prop.name,
        endpoint: {
          url: `/api/connector/${definition.entityKey}/lookups/${prop.name}`,
          type: 'GET',
          data: {},
          response: [],
        },
      });
    }
    if (prop.type === 'labUser') {
      lookups.push({
        forProperty: prop.name,
        endpoint: {
          url: '/api/platform/users/lookup',
          type: 'GET',
          data: {},
          response: [],
        },
      });
    }
  }
  return lookups;
}

export function buildEntityDiscoveryContract(
  definition: EntityDefinition,
  baseUrl: string,
  port: number,
): FormsBuilderContract {
  const apiBase = resolveConnectorApiBase(baseUrl, port);
  const segment = definition.entityKey;
  return {
    appName: 'crm',
    entityName: definition.name,
    capabilities: ['CRUD', 'Lookups'],
    entityModel: {
      id: 'number',
      name: definition.name,
      description: definition.description ?? '',
      status: 'active',
      properties: buildProperties(definition),
    },
    endpoints: {
      baseUrl: apiBase,
      crud: buildStandardConnectorCrudPaths({ segment }),
      lookups: buildLookups(definition),
    },
  };
}
