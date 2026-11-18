import { resolveAllowedFiltersForGetAll } from '@/apps/lab-chartbuilder/back-end/services/chart-connector-data';

describe('resolveAllowedFiltersForGetAll', () => {
  test('drops required taskListId when getAll has no filter (help desk tickets)', () => {
    const result = resolveAllowedFiltersForGetAll(
      [{ contextKey: 'taskListId', targetParam: 'taskListId', required: true }],
      undefined,
    );
    expect(result).toEqual([]);
  });

  test('keeps required taskListId when discovery getAll uses taskListId', () => {
    const spec = { contextKey: 'taskListId', targetParam: 'taskListId', required: true };
    const result = resolveAllowedFiltersForGetAll([spec], 'taskListId');
    expect(result).toEqual([spec]);
  });
});
