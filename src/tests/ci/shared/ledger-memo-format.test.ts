import { describe, expect, test } from '@jest/globals';
import { ledgerMemoForCompany } from '@/shared/utils/ledger-memo-format';

describe('ledgerMemoForCompany', () => {
  test('formats company and description with em dash', () => {
    expect(ledgerMemoForCompany('Northwind Labs', 'Platform Starter')).toBe(
      'Northwind Labs — Platform Starter',
    );
  });

  test('trims and caps length at 500 characters', () => {
    const longWhat = 'x'.repeat(600);
    expect(ledgerMemoForCompany('Acme', longWhat).length).toBe(500);
  });
});
