import { describe, expect, test } from '@jest/globals';
import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import {
  layoutEventRsvpEventStubComponents,
  layoutEventRsvpResponseStubComponents,
} from '@/shared/lab-integrations/event-rsvp-form-stub-layout';

function stub(fieldKey: string, type: FormComponent['type'] = 'InputText'): FormComponent {
  return {
    fieldKey,
    label: fieldKey,
    type,
    row: 0,
    col: 0,
    span: 1,
    hAlign: 'left',
    vAlign: 'top',
    labelLayout: 'vertical',
  };
}

describe('event-rsvp form stub layout', () => {
  test('event form places start and end on the same row', () => {
    const laidOut = layoutEventRsvpEventStubComponents([
      stub('title'),
      stub('description'),
      stub('startsAt', 'DatePicker'),
      stub('endsAt', 'DatePicker'),
      stub('location'),
      stub('capacity', 'NumberInput'),
    ]);
    const starts = laidOut.find((c) => c.fieldKey === 'startsAt');
    const ends = laidOut.find((c) => c.fieldKey === 'endsAt');
    expect(starts?.row).toBe(ends?.row);
    expect(starts?.type).toBe('DatePicker');
  });

  test('RSVP form uses textarea for note', () => {
    const laidOut = layoutEventRsvpResponseStubComponents([
      stub('guestName'),
      stub('response', 'Select'),
      stub('headcount', 'NumberInput'),
      stub('note'),
    ]);
    expect(laidOut.find((c) => c.fieldKey === 'note')?.type).toBe('Textarea');
  });
});
