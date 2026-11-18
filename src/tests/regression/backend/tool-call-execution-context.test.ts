import { describe, expect, test, beforeAll } from '@jest/globals';
import { databaseManager } from '@/backend/db/DatabaseManager';
import { applyToolExecutionContext } from '@/backend/utils/tool-call-execution-context';

describe('applyToolExecutionContext', () => {
  beforeAll(async () => {
    await databaseManager.initialize();
  });

  test('injects trusted userId and sessionId', () => {
    const result = applyToolExecutionContext(
      { userId: 1, sessionId: 'sess-abc' },
      'read_file',
      { filePath: 'foo.txt', userId: '99' },
    );
    expect(result.userId).toBe(1);
    expect(result.sessionId).toBe('sess-abc');
    expect(result.filePath).toBe('foo.txt');
  });

  test('injects persona and default contextArea for ui_automation_discover_elements', () => {
    const result = applyToolExecutionContext(
      { userId: 1, sessionId: 'sess-abc', persona: 'Orchestrator' },
      'ui_automation_discover_elements',
      { searchPattern: 'crm' },
    );
    expect(result.persona).toBe('Orchestrator');
    expect(result.contextArea).toBe('app-list-container');
    expect(result.sessionId).toBe('sess-abc');
  });

  test('maps appId alias and coerces registry id for app_management_get_app', () => {
    const result = applyToolExecutionContext(
      { userId: 1, sessionId: 'sess-abc' },
      'app_management_get_app',
      { appId: 'crm', userId: '1' },
    );
    expect(result.userId).toBe(1);
    expect(result.id).toBe('app-lab-crm');
    expect(result.appId).toBeUndefined();
  });
});
