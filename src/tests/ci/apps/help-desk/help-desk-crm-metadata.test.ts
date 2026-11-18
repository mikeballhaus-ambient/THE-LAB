import { describe, expect, test } from '@jest/globals';
import {
  buildHelpDeskCrmMetadata,
  parseHelpDeskCrmMetadata,
  ticketMatchesEntity,
} from '@/apps/lab-helpdesk/shared/types/help-desk-crm-metadata';

describe('help-desk CRM metadata', () => {
  test('build and parse round-trip', () => {
    const raw = buildHelpDeskCrmMetadata({
      entityKey: 'contacts',
      recordId: 7,
      recordLabel: 'Acme',
    });
    const parsed = parseHelpDeskCrmMetadata(raw);
    expect(parsed?.entityKey).toBe('contacts');
    expect(parsed?.recordId).toBe(7);
    expect(parsed?.recordLabel).toBe('Acme');
    expect(ticketMatchesEntity(raw, 'contacts', 7)).toBe(true);
    expect(ticketMatchesEntity(raw, 'contacts', 8)).toBe(false);
  });
});
