import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';

export const RENTAL_PROPERTY_PROPERTIES_SERVICE_ID = 'rental-property.properties';
export const RENTAL_PROPERTY_LEASES_SERVICE_ID = 'rental-property.leases';
export const RENTAL_PROPERTY_RENT_PAYMENTS_SERVICE_ID = 'rental-property.rent-payments';

function patchUsdCentsField(component: FormComponent): FormComponent {
  if (component.fieldKey !== 'amountCents' && component.fieldKey !== 'monthlyRentCents') {
    return component;
  }
  return {
    ...component,
    numberScale: 'usd-cents',
    minFractionDigits: 2,
    maxFractionDigits: 2,
    step: 0.01,
  };
}

/** Property create/edit: name + status, full-width address, rent + notes. */
export function layoutRentalPropertyStubComponents(components: FormComponent[]): FormComponent[] {
  const cols = DEFAULT_FORM_GRID_COLUMNS;
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const laidOut: FormComponent[] = [];

  const name = byKey.get('name');
  if (name) {
    laidOut.push({ ...name, row: 0, col: 0, span: Math.min(2, cols) });
    byKey.delete('name');
  }
  const status = byKey.get('status');
  if (status) {
    laidOut.push({ ...status, row: 0, col: 2, span: 1 });
    byKey.delete('status');
  }

  const address = byKey.get('address');
  if (address) {
    laidOut.push({ ...address, row: 1, col: 0, span: cols });
    byKey.delete('address');
  }

  const rent = byKey.get('monthlyRentCents');
  if (rent) {
    laidOut.push(patchUsdCentsField({ ...rent, row: 2, col: 0, span: 1 }));
    byKey.delete('monthlyRentCents');
  }

  const notes = byKey.get('notes');
  if (notes) {
    laidOut.push({
      ...notes,
      row: 2,
      col: 1,
      span: Math.max(1, cols - 1),
      type: notes.type === 'InputText' ? 'Textarea' : notes.type,
    });
    byKey.delete('notes');
  }

  let row = 3;
  for (const rest of byKey.values()) {
    laidOut.push({ ...rest, row, col: 0, span: 1 });
    row += 1;
  }

  return laidOut;
}

export function layoutRentalLeaseStubComponents(components: FormComponent[]): FormComponent[] {
  const cols = DEFAULT_FORM_GRID_COLUMNS;
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const laidOut: FormComponent[] = [];

  const tenant = byKey.get('tenant');
  if (tenant) {
    laidOut.push({ ...tenant, row: 0, col: 0, span: cols });
    byKey.delete('tenant');
  }

  const startDate = byKey.get('startDate');
  if (startDate) {
    laidOut.push({ ...startDate, row: 1, col: 0, span: Math.min(2, cols) });
    byKey.delete('startDate');
  }
  const endDate = byKey.get('endDate');
  if (endDate) {
    laidOut.push({ ...endDate, row: 1, col: 2, span: Math.min(2, cols) });
    byKey.delete('endDate');
  }

  const status = byKey.get('status');
  if (status) {
    laidOut.push({ ...status, row: 2, col: 0, span: 1 });
    byKey.delete('status');
  }

  let row = 3;
  for (const rest of byKey.values()) {
    laidOut.push({ ...rest, row, col: 0, span: 1 });
    row += 1;
  }

  return laidOut;
}

export function layoutRentalRentPaymentStubComponents(components: FormComponent[]): FormComponent[] {
  const cols = DEFAULT_FORM_GRID_COLUMNS;
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const laidOut: FormComponent[] = [];

  const period = byKey.get('periodMonth');
  if (period) {
    laidOut.push({ ...period, row: 0, col: 0, span: Math.min(2, cols) });
    byKey.delete('periodMonth');
  }
  const amount = byKey.get('amountCents');
  if (amount) {
    laidOut.push(patchUsdCentsField({ ...amount, row: 0, col: 2, span: 1 }));
    byKey.delete('amountCents');
  }
  const status = byKey.get('status');
  if (status) {
    laidOut.push({ ...status, row: 1, col: 0, span: 1 });
    byKey.delete('status');
  }

  let row = 2;
  for (const rest of byKey.values()) {
    laidOut.push({ ...rest, row, col: 0, span: 1 });
    row += 1;
  }

  return laidOut;
}

export function layoutRentalPropertyServiceStubComponents(
  serviceId: string,
  components: FormComponent[],
): FormComponent[] {
  if (serviceId === RENTAL_PROPERTY_PROPERTIES_SERVICE_ID) {
    return layoutRentalPropertyStubComponents(components);
  }
  if (serviceId === RENTAL_PROPERTY_LEASES_SERVICE_ID) {
    return layoutRentalLeaseStubComponents(components);
  }
  if (serviceId === RENTAL_PROPERTY_RENT_PAYMENTS_SERVICE_ID) {
    return layoutRentalRentPaymentStubComponents(components);
  }
  return components;
}
