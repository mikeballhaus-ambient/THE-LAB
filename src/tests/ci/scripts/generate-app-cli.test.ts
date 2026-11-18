import { describe, expect, test } from '@jest/globals';
import { parseGenerateAppArgv } from '@/scripts/generate-app';

describe('parseGenerateAppArgv', () => {
  test('returns null when --name is omitted (interactive mode)', () => {
    expect(parseGenerateAppArgv([])).toBeNull();
    expect(parseGenerateAppArgv(['--help'])).toBe('help');
  });

  test('parses full non-interactive argv', () => {
    const input = parseGenerateAppArgv([
      '--name',
      'notification-hub',
      '--type',
      'hybrid',
      '--description',
      'Notification Hub',
      '--port',
      '3015',
      '--order',
      '9',
      '--icon',
      'fa-bell',
      '--dependencies',
      'app-lab-formsbuilder,app-lab-tasklist',
    ]);
    expect(input).toEqual({
      appName: 'notification-hub',
      appType: 'hybrid',
      appDescription: 'Notification Hub',
      port: 3015,
      appOrder: 9,
      appFaIcon: 'fa-bell',
      dependencies: ['app-lab-formsbuilder', 'app-lab-tasklist'],
    });
  });

  test('throws when --name is set but required fields are missing', () => {
    expect(() => parseGenerateAppArgv(['--name', 'foo'])).toThrow(/requires --type/);
  });
});
