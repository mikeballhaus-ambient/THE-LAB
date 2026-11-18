import { describe, test, expect } from '@jest/globals'
import { buildComponentsFromConnector, controlTypeForLookupOptionCount } from '@/apps/lab-formsbuilder/front-end/utils/autopopulate-from-connector'
import type { DataConnector } from '@/apps/lab-formsbuilder/shared/types'

describe('buildComponentsFromConnector', () => {
  test('controlTypeForLookupOptionCount uses radio only when count is 1 or 2', () => {
    expect(controlTypeForLookupOptionCount(1)).toBe('RadioButton')
    expect(controlTypeForLookupOptionCount(2)).toBe('RadioButton')
    expect(controlTypeForLookupOptionCount(3)).toBe('Select')
    expect(controlTypeForLookupOptionCount(5)).toBe('Select')
    expect(controlTypeForLookupOptionCount(0)).toBe('Select')
  })

  const connector = {
    id: 1,
    appName: 'test',
    entityName: 'Item',
    entityModel: {
      properties: [
        { name: 'id', type: 'number' as const },
        { name: 'name', type: 'string' as const, label: 'Name' },
        { name: 'status', type: 'string' as const, label: 'Status' },
      ],
    },
    endpoints: {
      baseUrl: 'http://localhost',
      crud: {} as DataConnector['endpoints']['crud'],
      lookups: [
        {
          forProperty: 'status',
          endpoint: { url: '/statuses', type: 'GET' as const, data: {}, response: [] },
        },
      ],
    },
    capabilities: ['CRUD', 'Lookups'],
    createdAt: '',
    updatedAt: '',
    discoveryUrl: 'http://localhost/discovery',
    discoveryType: 'REST',
    is_active: 1,
  } as unknown as DataConnector

  test('skips id and maps lookups to Select', () => {
    const components = buildComponentsFromConnector(connector, [])
    expect(components.map(c => c.fieldKey)).toEqual(['name', 'status'])
    expect(components.find(c => c.fieldKey === 'status')?.type).toBe('Select')
    expect(components.find(c => c.fieldKey === 'name')?.type).toBe('InputText')
  })

  test('places fields left to right then next row', () => {
    const manyProps = {
      ...connector,
      entityModel: {
        properties: [
          { name: 'a', type: 'string' as const },
          { name: 'b', type: 'string' as const },
          { name: 'c', type: 'string' as const },
          { name: 'd', type: 'string' as const },
          { name: 'e', type: 'string' as const },
        ],
      },
    } as unknown as DataConnector
    const components = buildComponentsFromConnector(manyProps, [])
    expect(components.map(c => [c.row, c.col])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 0],
    ])
  })

  test('does not duplicate existing field keys', () => {
    const components = buildComponentsFromConnector(connector, ['name'])
    expect(components.map(c => c.fieldKey)).toEqual(['status'])
  })

  test('maps array model properties to MultiSelect', () => {
    const components = buildComponentsFromConnector(
      {
        ...connector,
        entityModel: {
          properties: [{ name: 'tags', type: 'array' as const, label: 'Tags' }],
        },
        endpoints: {
          ...connector.endpoints,
          lookups: [
            {
              forProperty: 'tags',
              endpoint: { url: '/tags', type: 'GET' as const, data: {}, response: [{ value: 'a' }] },
            },
          ],
        },
      } as unknown as DataConnector,
      [],
    );
    expect(components[0]?.type).toBe('MultiSelect');
  })

  test('maps desc to Textarea and small lookups to RadioButton', () => {
    const full = {
      ...connector,
      entityModel: {
        properties: [
          { name: 'title', type: 'string' as const },
          { name: 'desc', type: 'string' as const },
          { name: 'status', type: 'string' as const },
        ],
      },
      endpoints: {
        ...connector.endpoints,
        lookups: [
          {
            forProperty: 'status',
            endpoint: {
              url: '/statuses',
              type: 'GET' as const,
              data: {},
              response: [{ value: 'a' }, { value: 'b' }],
            },
          },
        ],
      },
    } as unknown as DataConnector
    const components = buildComponentsFromConnector(full, [])
    expect(components.find(c => c.fieldKey === 'desc')?.type).toBe('Textarea')
    expect(components.find(c => c.fieldKey === 'status')?.type).toBe('RadioButton')
  })

  test('maps lookup with exactly 3 options to Select', () => {
    const three = {
      ...connector,
      entityModel: {
        properties: [{ name: 'cat', type: 'string' as const, label: 'Category' }],
      },
      endpoints: {
        ...connector.endpoints,
        lookups: [
          {
            forProperty: 'cat',
            endpoint: {
              url: '/cats',
              type: 'GET' as const,
              data: {},
              response: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
            },
          },
        ],
      },
    } as unknown as DataConnector
    const counts = new Map([['cat', 3]])
    const components = buildComponentsFromConnector(three, [], [], undefined, counts)
    expect(components[0]?.type).toBe('Select')
  })
})
