import { resolveCrmLedgerDemoAccountPresets } from '@/apps/lab-crm/shared/utils/crm-ledger-demo-presets';
import type { LabLedgerAccountRecord } from '@/shared/types/lab-ledger';

function account(code: string, id: string): LabLedgerAccountRecord {
  return {
    id,
    code,
    name: code,
    type: 'asset',
    normalBalance: 'debit',
    balanceCents: 0,
    enabled: true,
    createdAt: '',
    updatedAt: '',
  };
}

describe('resolveCrmLedgerDemoAccountPresets', () => {
  test('prefers DEMO-CASH and DEMO-REV', () => {
    const presets = resolveCrmLedgerDemoAccountPresets([
      account('DEMO-CASH', 'a1'),
      account('DEMO-REV', 'a2'),
      account('1000', 'a3'),
    ]);
    expect(presets).toEqual({ debitAccountId: 'a1', creditAccountId: 'a2' });
  });

  test('falls back to standard chart codes', () => {
    const presets = resolveCrmLedgerDemoAccountPresets([
      account('1000', 'cash'),
      account('4000', 'rev'),
    ]);
    expect(presets).toEqual({ debitAccountId: 'cash', creditAccountId: 'rev' });
  });
});
