import { describe, expect, test } from '@jest/globals';
import {
  categoryValueForConnector,
  submitterValueForConnector,
} from '@/apps/expense-reports/back-end/utils/expense-connector-body';

describe('expense-reports connector read — lookup field values', () => {
  test('submitter uses platform user id for Select hydration', () => {
    expect(
      submitterValueForConnector({ submitter: 'Sam Patel', submitterId: 5 }),
    ).toBe('5');
  });

  test('submitter derives demo cast id from display name when id column is missing', () => {
    expect(
      submitterValueForConnector({ submitter: 'Sam Patel', submitterId: null }),
    ).toBe('5');
  });

  test('category maps legacy demo labels to enum option values', () => {
    expect(categoryValueForConnector('Learning')).toBe('other');
    expect(categoryValueForConnector('Travel')).toBe('travel');
    expect(categoryValueForConnector('Software')).toBe('software');
  });

  test('category passes through manifest enum values', () => {
    expect(categoryValueForConnector('meals')).toBe('meals');
  });
});
