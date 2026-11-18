import { describe, test, expect } from '@jest/globals';
import { humanizeLabUserDisplayName } from '@/shared/utils/lab-user-display';
import { displayLabUserName } from '@/shared/utils/lab-comms-ui';
import type { User } from '@/shared/types/user';

describe('lab-user-display', () => {
  describe('humanizeLabUserDisplayName', () => {
    test('leaves spaced names unchanged', () => {
      expect(humanizeLabUserDisplayName('Mia Chen')).toBe('Mia Chen');
    });

    test('converts underscore SSO slugs', () => {
      expect(humanizeLabUserDisplayName('Michael_Ballhaus')).toBe('Michael Ballhaus');
    });

    test('converts hyphenated logins', () => {
      expect(humanizeLabUserDisplayName('mikeballhaus-ambient')).toBe('Mikeballhaus Ambient');
    });
  });

  describe('displayLabUserName', () => {
    test('humanizes stored SSO slug on user record', () => {
      const user: User = {
        userId: 12,
        role: 'member',
        status: 'active',
        lastSeen: '',
        createdAt: '',
        name: 'Michael_Ballhaus',
        email: 'mike@example.com',
      };
      expect(displayLabUserName(user)).toBe('Michael Ballhaus');
    });
  });
});
