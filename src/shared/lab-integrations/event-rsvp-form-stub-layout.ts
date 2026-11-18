import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';

export const EVENT_RSVP_EVENTS_SERVICE_ID = 'event-rsvp.events';
export const EVENT_RSVP_RESPONSES_SERVICE_ID = 'event-rsvp.rsvp-responses';

function toTextarea(component: FormComponent): FormComponent {
  return component.type === 'InputText' ? { ...component, type: 'Textarea' } : component;
}

/** Event create/edit: title, description, start/end datetimes, location + capacity. */
export function layoutEventRsvpEventStubComponents(components: FormComponent[]): FormComponent[] {
  const cols = DEFAULT_FORM_GRID_COLUMNS;
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const laidOut: FormComponent[] = [];

  const title = byKey.get('title');
  if (title) {
    laidOut.push({ ...title, row: 0, col: 0, span: cols });
    byKey.delete('title');
  }

  const description = byKey.get('description');
  if (description) {
    laidOut.push(toTextarea({ ...description, row: 1, col: 0, span: cols }));
    byKey.delete('description');
  }

  const startsAt = byKey.get('startsAt');
  if (startsAt) {
    laidOut.push({ ...startsAt, row: 2, col: 0, span: Math.min(2, cols) });
    byKey.delete('startsAt');
  }
  const endsAt = byKey.get('endsAt');
  if (endsAt) {
    laidOut.push({ ...endsAt, row: 2, col: 2, span: 1 });
    byKey.delete('endsAt');
  }

  const location = byKey.get('location');
  if (location) {
    laidOut.push({ ...location, row: 3, col: 0, span: Math.min(2, cols) });
    byKey.delete('location');
  }
  const capacity = byKey.get('capacity');
  if (capacity) {
    laidOut.push({ ...capacity, row: 3, col: 2, span: 1 });
    byKey.delete('capacity');
  }

  let row = 4;
  for (const rest of byKey.values()) {
    laidOut.push({ ...rest, row, col: 0, span: 1 });
    row += 1;
  }

  return laidOut;
}

/** RSVP response create/edit: guest, response + headcount, note. */
export function layoutEventRsvpResponseStubComponents(components: FormComponent[]): FormComponent[] {
  const cols = DEFAULT_FORM_GRID_COLUMNS;
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const laidOut: FormComponent[] = [];

  const guestName = byKey.get('guestName');
  if (guestName) {
    laidOut.push({ ...guestName, row: 0, col: 0, span: cols });
    byKey.delete('guestName');
  }

  const response = byKey.get('response');
  if (response) {
    laidOut.push({ ...response, row: 1, col: 0, span: Math.min(2, cols) });
    byKey.delete('response');
  }
  const headcount = byKey.get('headcount');
  if (headcount) {
    laidOut.push({ ...headcount, row: 1, col: 2, span: 1 });
    byKey.delete('headcount');
  }

  const note = byKey.get('note');
  if (note) {
    laidOut.push(toTextarea({ ...note, row: 2, col: 0, span: cols }));
    byKey.delete('note');
  }

  let row = 3;
  for (const rest of byKey.values()) {
    laidOut.push({ ...rest, row, col: 0, span: 1 });
    row += 1;
  }

  return laidOut;
}

export function layoutEventRsvpServiceStubComponents(
  serviceId: string,
  components: FormComponent[],
): FormComponent[] {
  if (serviceId === EVENT_RSVP_EVENTS_SERVICE_ID) {
    return layoutEventRsvpEventStubComponents(components);
  }
  if (serviceId === EVENT_RSVP_RESPONSES_SERVICE_ID) {
    return layoutEventRsvpResponseStubComponents(components);
  }
  return components;
}
