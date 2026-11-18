import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';

export const HELP_DESK_TICKETS_SERVICE_ID = 'help-desk.tickets';

function placeHidden(component: FormComponent, row: number): FormComponent {
  return { ...component, hidden: true, row, col: 0, span: 1 };
}

/** Ticket create/edit: row 0 = subject … priority; row 1 = assignee beside requester email. */
export function layoutHelpDeskTicketStubComponents(components: FormComponent[]): FormComponent[] {
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const laidOut: FormComponent[] = [];
  let hiddenRow = 50;

  const takeHidden = (key: string) => {
    const c = byKey.get(key);
    if (!c) {
      return;
    }
    laidOut.push(placeHidden(c, hiddenRow));
    hiddenRow += 1;
    byKey.delete(key);
  };

  for (const key of ['id', 'requesterLabUserId', 'metadata', 'createdAt', 'updatedAt']) {
    takeHidden(key);
  }

  const placeVisible = (key: string, row: number, col: number, span = 1, patch?: Partial<FormComponent>) => {
    const c = byKey.get(key);
    if (!c) {
      return;
    }
    laidOut.push({ ...c, row, col, span, ...patch });
    byKey.delete(key);
  };

  placeVisible('subject', 0, 0, 1);

  const description = byKey.get('description');
  if (description) {
    laidOut.push({
      ...description,
      row: 0,
      col: 1,
      span: 1,
      type: description.type === 'InputText' ? 'Textarea' : description.type,
    });
    byKey.delete('description');
  }

  placeVisible('status', 0, 2, 1);
  placeVisible('priority', 0, 3, 1);
  placeVisible('assigneeId', 1, 0, 1);
  placeVisible('requesterEmail', 1, 1, Math.min(2, DEFAULT_FORM_GRID_COLUMNS - 1));

  for (const rest of byKey.values()) {
    const { row, col } = nextOpenSlot(laidOut, DEFAULT_FORM_GRID_COLUMNS);
    laidOut.push({ ...rest, row, col, span: rest.span ?? 1 });
  }

  return laidOut;
}

function nextOpenSlot(
  placed: FormComponent[],
  gridCols: number,
): { row: number; col: number } {
  const occupied = new Set<string>();
  for (const c of placed) {
    const row = c.row ?? 0;
    const col = c.col ?? 0;
    const span = c.span ?? 1;
    for (let i = 0; i < span; i += 1) {
      occupied.add(`${row},${col + i}`);
    }
  }
  let index = 0;
  for (;;) {
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    if (!occupied.has(`${row},${col}`)) {
      return { row, col };
    }
    index += 1;
  }
}
