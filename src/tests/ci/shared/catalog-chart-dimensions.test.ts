import { describe, expect, test } from '@jest/globals';
import {
  CATALOG_CHART_FIELD_DIMENSIONS,
  resolveChartDimension,
  type CatalogChartDimension,
} from '@/shared/config/catalog-chart-config';

const VALID_DIMENSIONS: CatalogChartDimension[] = [
  'status',
  'category',
  'priority',
  'stage',
  'kind',
  'condition',
  'response',
  'quarter',
  'destination',
  'project',
  'role',
  'owner',
  'account',
];

describe('catalog chart dimensions', () => {
  test('resolveChartDimension prefers an explicit dimension', () => {
    expect(resolveChartDimension({ groupByField: 'anything', dimension: 'account' })).toBe('account');
  });

  test('resolveChartDimension falls back to the field map', () => {
    expect(resolveChartDimension({ groupByField: 'status' })).toBe('status');
    expect(resolveChartDimension({ groupByField: 'ownerName' })).toBe('owner');
    expect(resolveChartDimension({ groupByField: 'companyId' })).toBe('account');
  });

  test('resolveChartDimension returns undefined for an unknown field', () => {
    expect(resolveChartDimension({ groupByField: 'mystery' })).toBeUndefined();
  });

  test('every mapped value is a declared dimension', () => {
    for (const [field, dimension] of Object.entries(CATALOG_CHART_FIELD_DIMENSIONS)) {
      expect({ field, valid: VALID_DIMENSIONS.includes(dimension) }).toEqual({
        field,
        valid: true,
      });
    }
  });

  test('person and account fields map to their semantic dimensions', () => {
    expect(CATALOG_CHART_FIELD_DIMENSIONS.owner).toBe('owner');
    expect(CATALOG_CHART_FIELD_DIMENSIONS.ownerName).toBe('owner');
    expect(CATALOG_CHART_FIELD_DIMENSIONS.company).toBe('account');
    expect(CATALOG_CHART_FIELD_DIMENSIONS.companyId).toBe('account');
  });
});
