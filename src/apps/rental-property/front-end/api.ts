import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { PropertyWithDetails, RentPayment } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'RENTAL', init);
}

export const listProperties = (base: string): Promise<PropertyWithDetails[]> =>
  request<{ properties: PropertyWithDetails[] }>(base, '/api/rental/properties').then(
    (body) => body.properties ?? [],
  );

/** Mark a payment paid; the server stamps `paidAt`. */
export const markPaymentPaid = (base: string, paymentId: number): Promise<RentPayment> =>
  request<{ payment: RentPayment }>(base, `/api/rental/payments/${paymentId}/pay`, {
    method: 'PATCH',
  }).then((r) => r.payment);

export const deleteProperty = (base: string, id: number): Promise<void> =>
  request(base, `/api/rental/properties/${id}`, { method: 'DELETE' }).then(() => undefined);
