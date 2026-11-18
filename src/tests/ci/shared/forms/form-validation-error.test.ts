import { describe, expect, test } from '@jest/globals';
import { formatFieldValidationErrorSummary } from '@/shared/forms/form-validation-error';

describe('formatFieldValidationErrorSummary', () => {
  test('combines label with list-style required fragments', () => {
    const text = formatFieldValidationErrorSummary([
      { fieldKey: 'title', label: 'Quote title', message: 'is required.' },
      { fieldKey: 'contactId', label: 'Contact', message: 'is required.' },
      { fieldKey: 'status', label: 'Status', message: 'is required.' },
    ]);
    expect(text).toBe(
      'Quote title is required. Contact is required. Status is required.',
    );
  });
});
