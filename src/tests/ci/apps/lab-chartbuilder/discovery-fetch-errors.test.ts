import { describe, expect, test } from '@jest/globals';
import { describeDiscoveryFetchFailure } from '@/apps/lab-chartbuilder/back-end/utils/discovery-fetch-errors';

describe('describeDiscoveryFetchFailure', () => {
  const url = 'http://localhost:4121/api/connector/discovery/rsvp-response';

  test('ECONNREFUSED mentions catalog launch', () => {
    const message = describeDiscoveryFetchFailure(url, {
      cause: { code: 'ECONNREFUSED' },
    });
    expect(message).toContain('localhost:4121');
    expect(message).toContain('not running');
    expect(message).toContain('app catalog');
  });

  test('HTTP 404 suggests app stopped or wrong URL', () => {
    const message = describeDiscoveryFetchFailure(url, null, 404);
    expect(message).toContain('404');
    expect(message).toContain('catalog');
  });

  test('HTTP 401 mentions sign-in', () => {
    const message = describeDiscoveryFetchFailure(url, null, 401);
    expect(message).toContain('401');
    expect(message).toContain('signed in');
  });
});
