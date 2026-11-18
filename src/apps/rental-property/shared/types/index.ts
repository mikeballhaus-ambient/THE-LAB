export type PropertyStatus = 'vacant' | 'occupied' | 'maintenance';
export type LeaseStatus = 'active' | 'ended' | 'pending';
export type RentStatus = 'due' | 'paid' | 'late';

export interface RentalProperty {
  id: number;
  name: string;
  address: string;
  monthlyRentCents: number;
  status: PropertyStatus;
  notes: string;
  createdAt: string;
}

export interface Lease {
  id: number;
  propertyId: number;
  tenantName: string;
  startDate: string;
  endDate: string;
  status: LeaseStatus;
}

export interface RentPayment {
  id: number;
  leaseId: number;
  /** Billing period, `YYYY-MM`. */
  periodMonth: string;
  amountCents: number;
  status: RentStatus;
  paidAt: string | null;
}

/** Property with its leases and all rent payments across those leases. */
export interface PropertyWithDetails extends RentalProperty {
  leases: Lease[];
  payments: RentPayment[];
}

export interface UpsertPropertyInput {
  name: string;
  address: string;
  monthlyRentCents: number;
  status: PropertyStatus;
  notes: string;
}

export interface UpsertLeaseInput {
  propertyId: number;
  tenantName: string;
  startDate: string;
  endDate: string;
  status: LeaseStatus;
}

export interface UpsertRentPaymentInput {
  leaseId: number;
  periodMonth: string;
  amountCents: number;
  status: RentStatus;
}
