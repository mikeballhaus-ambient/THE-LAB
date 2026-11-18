import { describe, expect, test } from '@jest/globals';
import {
  sponsorValueForConnector,
  stakeholdersValueForConnector,
} from '@/apps/project-charter/back-end/utils/charter-connector-body';

describe('project-charter connector read — lab-user field values', () => {
  test('sponsor uses platform user id for Select hydration', () => {
    expect(
      sponsorValueForConnector({ sponsor: 'Jordan Lee', sponsorId: 4 }),
    ).toBe('4');
  });

  test('sponsor falls back to display name when id column is missing', () => {
    expect(sponsorValueForConnector({ sponsor: 'Jordan Lee', sponsorId: null })).toBe('Jordan Lee');
  });

  test('stakeholders prefers stored id JSON', () => {
    expect(
      stakeholdersValueForConnector({
        stakeholders: 'Sam Patel; Casey Hayes',
        stakeholderUserIds: '["5","8"]',
      }),
    ).toEqual(['5', '8']);
  });

  test('stakeholders derives ids from legacy semicolon names when JSON is empty', () => {
    expect(
      stakeholdersValueForConnector({
        stakeholders: 'Sam Patel; Casey Hayes',
        stakeholderUserIds: '[]',
      }),
    ).toEqual(['5', '8']);
  });
});
