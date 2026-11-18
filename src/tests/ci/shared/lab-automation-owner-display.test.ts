import {
  formatPlatformUserDisplayName,
  labAutomationOwnerColumnLabel,
} from '@/shared/utils/lab-automation-owner-display';

describe('lab-automation-owner-display', () => {
  test('formatPlatformUserDisplayName prefers name then email', () => {
    expect(
      formatPlatformUserDisplayName({ userId: 2, name: 'Ada Lab', email: 'ada@example.com' }),
    ).toBe('Ada Lab');
    expect(formatPlatformUserDisplayName({ userId: 2, name: '', email: 'ada@example.com' })).toBe(
      'ada@example.com',
    );
  });

  test('labAutomationOwnerColumnLabel resolves owner name', () => {
    const map = new Map([[3, 'Mike Builder']]);
    expect(labAutomationOwnerColumnLabel('global', null, map)).toBe('—');
    expect(labAutomationOwnerColumnLabel('user', 3, map)).toBe('Mike Builder');
    expect(labAutomationOwnerColumnLabel('user', 99, map)).toBe('User 99');
  });
});
