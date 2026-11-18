import {
  crmDealApprovalStatusAllowsSubmit,
  readCrmDealApprovalStatus,
} from '@/apps/lab-crm/shared/utils/crm-approval-status';

describe('crm-approval-status', () => {
  describe('readCrmDealApprovalStatus', () => {
    test('returns enum values from record data', () => {
      expect(readCrmDealApprovalStatus({ approvalStatus: 'pending' })).toBe('pending');
      expect(readCrmDealApprovalStatus({ approvalStatus: 'approved' })).toBe('approved');
      expect(readCrmDealApprovalStatus({ approvalStatus: 'rejected' })).toBe('rejected');
    });

    test('ignores invalid or missing values', () => {
      expect(readCrmDealApprovalStatus({ approvalStatus: 'open' })).toBeNull();
      expect(readCrmDealApprovalStatus({})).toBeNull();
      expect(readCrmDealApprovalStatus(null)).toBeNull();
    });
  });

  describe('crmDealApprovalStatusAllowsSubmit', () => {
    test('allows submit when unset or rejected', () => {
      expect(crmDealApprovalStatusAllowsSubmit(null)).toBe(true);
      expect(crmDealApprovalStatusAllowsSubmit('rejected')).toBe(true);
    });

    test('blocks submit when pending or approved', () => {
      expect(crmDealApprovalStatusAllowsSubmit('pending')).toBe(false);
      expect(crmDealApprovalStatusAllowsSubmit('approved')).toBe(false);
    });
  });
});
