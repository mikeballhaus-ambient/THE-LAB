import { describe, expect, test } from '@jest/globals';
import {
  listMatchesHostScope,
  normalizeTaskListAppId,
  TASK_LIST_APP_REGISTRY_ID,
} from '@/apps/lab-tasklist/shared/constants/app-scope';
import { taskListScopeWhere } from '@/apps/lab-tasklist/shared/utils/task-list-scope-sql';
import { taskMetadataEntityFilter } from '@/apps/lab-tasklist/shared/utils/task-metadata-filter';
import { normalizeTaskMetadata } from '@/apps/lab-tasklist/shared/utils/normalize-task-metadata';

describe('task-list app scope', () => {
  test('normalizeTaskListAppId treats empty as null', () => {
    expect(normalizeTaskListAppId(null)).toBe(null);
    expect(normalizeTaskListAppId('')).toBe(null);
    expect(normalizeTaskListAppId('app-lab-crm')).toBe('app-lab-crm');
  });

  test('listMatchesHostScope', () => {
    expect(listMatchesHostScope(null, null)).toBe(true);
    expect(listMatchesHostScope('app-lab-crm', 'app-lab-crm')).toBe(true);
    expect(listMatchesHostScope('app-lab-crm', null)).toBe(false);
    expect(listMatchesHostScope(null, 'app-lab-crm')).toBe(false);
    expect(listMatchesHostScope(null, TASK_LIST_APP_REGISTRY_ID)).toBe(true);
    expect(listMatchesHostScope(TASK_LIST_APP_REGISTRY_ID, TASK_LIST_APP_REGISTRY_ID)).toBe(true);
  });

  test('taskListScopeWhere native vs host', () => {
    const native = taskListScopeWhere(null);
    expect(native.clause).toContain('IS NULL');
    expect(native.params).toEqual([]);

    const crm = taskListScopeWhere('app-lab-crm');
    expect(crm.clause).toContain('app_id = ?');
    expect(crm.params).toEqual(['app-lab-crm']);

    const taskListApp = taskListScopeWhere(TASK_LIST_APP_REGISTRY_ID);
    expect(taskListApp.clause).toContain('IS NULL');
    expect(taskListApp.params).toEqual([TASK_LIST_APP_REGISTRY_ID]);
  });

  test('taskMetadataEntityFilter', () => {
    expect(taskMetadataEntityFilter(undefined, 1).clause).toBe('');
    const f = taskMetadataEntityFilter('sales', 42);
    expect(f.clause).toContain('json_extract');
    expect(f.params).toEqual(['sales', 42]);
  });

  test('normalizeTaskMetadata', () => {
    expect(normalizeTaskMetadata(null)).toBe(null);
    expect(normalizeTaskMetadata('')).toBe(null);
    expect(normalizeTaskMetadata('not-json')).toBe(null);
    expect(normalizeTaskMetadata('{"a":1}')).toBe('{"a":1}');
    expect(normalizeTaskMetadata({ b: 2 })).toBe('{"b":2}');
  });
});
