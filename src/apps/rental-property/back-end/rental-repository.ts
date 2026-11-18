/**
 * Rental Property data layer — properties, leases, and rent payments.
 */
import type { Database } from 'better-sqlite3';
import type {
  Lease,
  LeaseStatus,
  PropertyStatus,
  PropertyWithDetails,
  RentalProperty,
  RentPayment,
  RentStatus,
  UpsertLeaseInput,
  UpsertPropertyInput,
  UpsertRentPaymentInput,
} from '../shared/types';

interface PropertyRow {
  id: number;
  name: string;
  address: string;
  monthly_rent_cents: number;
  status: string;
  notes: string;
  created_at: string;
}
interface LeaseRow {
  id: number;
  property_id: number;
  tenant_name: string;
  start_date: string;
  end_date: string;
  status: string;
}
interface PaymentRow {
  id: number;
  lease_id: number;
  period_month: string;
  amount_cents: number;
  status: string;
  paid_at: string | null;
}

export function bootstrapRentalTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rental_properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      monthly_rent_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'vacant',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rental_leases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      tenant_name TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS rental_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_id INTEGER NOT NULL,
      period_month TEXT NOT NULL DEFAULT '',
      amount_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'due',
      paid_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_rental_leases_property ON rental_leases (property_id);
    CREATE INDEX IF NOT EXISTS idx_rental_payments_lease ON rental_payments (lease_id);
  `);
}

function mapProperty(row: PropertyRow): RentalProperty {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    monthlyRentCents: row.monthly_rent_cents,
    status: row.status as PropertyStatus,
    notes: row.notes,
    createdAt: row.created_at,
  };
}
function mapLease(row: LeaseRow): Lease {
  return {
    id: row.id,
    propertyId: row.property_id,
    tenantName: row.tenant_name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as LeaseStatus,
  };
}
function mapPayment(row: PaymentRow): RentPayment {
  return {
    id: row.id,
    leaseId: row.lease_id,
    periodMonth: row.period_month,
    amountCents: row.amount_cents,
    status: row.status as RentStatus,
    paidAt: row.paid_at,
  };
}

export class RentalRepository {
  constructor(private readonly db: Database) {}

  list(): PropertyWithDetails[] {
    const properties = this.db.prepare(`SELECT * FROM rental_properties ORDER BY created_at DESC, id DESC`).all() as PropertyRow[];
    const leasesByProperty = new Map<number, Lease[]>();
    const paymentsByLease = new Map<number, RentPayment[]>();
    for (const row of this.db.prepare(`SELECT * FROM rental_leases ORDER BY start_date DESC, id DESC`).all() as LeaseRow[]) {
      const l = mapLease(row);
      const list = leasesByProperty.get(l.propertyId) ?? [];
      list.push(l);
      leasesByProperty.set(l.propertyId, list);
    }
    for (const row of this.db.prepare(`SELECT * FROM rental_payments ORDER BY period_month DESC, id DESC`).all() as PaymentRow[]) {
      const p = mapPayment(row);
      const list = paymentsByLease.get(p.leaseId) ?? [];
      list.push(p);
      paymentsByLease.set(p.leaseId, list);
    }
    return properties.map((p) => {
      const leases = leasesByProperty.get(p.id) ?? [];
      const payments = leases.flatMap((l) => paymentsByLease.get(l.id) ?? []);
      return { ...mapProperty(p), leases, payments };
    });
  }

  createProperty(input: UpsertPropertyInput): RentalProperty {
    const info = this.db
      .prepare(`INSERT INTO rental_properties (name, address, monthly_rent_cents, status, notes) VALUES (?, ?, ?, ?, ?)`)
      .run(input.name.trim(), input.address.trim(), input.monthlyRentCents, input.status, input.notes.trim());
    return mapProperty(this.db.prepare(`SELECT * FROM rental_properties WHERE id = ?`).get(info.lastInsertRowid) as PropertyRow);
  }

  updateProperty(id: number, input: UpsertPropertyInput): RentalProperty | null {
    if (!this.db.prepare(`SELECT id FROM rental_properties WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE rental_properties SET name = ?, address = ?, monthly_rent_cents = ?, status = ?, notes = ? WHERE id = ?`,
      )
      .run(
        input.name.trim(),
        input.address.trim(),
        input.monthlyRentCents,
        input.status,
        input.notes.trim(),
        id,
      );
    return mapProperty(this.db.prepare(`SELECT * FROM rental_properties WHERE id = ?`).get(id) as PropertyRow);
  }

  deleteProperty(id: number): boolean {
    const leaseIds = (this.db.prepare(`SELECT id FROM rental_leases WHERE property_id = ?`).all(id) as { id: number }[]).map((r) => r.id);
    for (const leaseId of leaseIds) {
      this.db.prepare(`DELETE FROM rental_payments WHERE lease_id = ?`).run(leaseId);
    }
    this.db.prepare(`DELETE FROM rental_leases WHERE property_id = ?`).run(id);
    return this.db.prepare(`DELETE FROM rental_properties WHERE id = ?`).run(id).changes > 0;
  }

  addLease(input: UpsertLeaseInput): Lease {
    const info = this.db
      .prepare(`INSERT INTO rental_leases (property_id, tenant_name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)`)
      .run(input.propertyId, input.tenantName.trim(), input.startDate, input.endDate, input.status);
    return mapLease(this.db.prepare(`SELECT * FROM rental_leases WHERE id = ?`).get(info.lastInsertRowid) as LeaseRow);
  }

  updateLease(id: number, input: UpsertLeaseInput): Lease | null {
    if (!this.db.prepare(`SELECT id FROM rental_leases WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE rental_leases SET property_id = ?, tenant_name = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?`,
      )
      .run(input.propertyId, input.tenantName.trim(), input.startDate, input.endDate, input.status, id);
    return mapLease(this.db.prepare(`SELECT * FROM rental_leases WHERE id = ?`).get(id) as LeaseRow);
  }

  deleteLease(id: number): boolean {
    this.db.prepare(`DELETE FROM rental_payments WHERE lease_id = ?`).run(id);
    return this.db.prepare(`DELETE FROM rental_leases WHERE id = ?`).run(id).changes > 0;
  }

  addPayment(input: UpsertRentPaymentInput): RentPayment {
    const paidAt = input.status === 'paid' ? new Date().toISOString() : null;
    const info = this.db
      .prepare(`INSERT INTO rental_payments (lease_id, period_month, amount_cents, status, paid_at) VALUES (?, ?, ?, ?, ?)`)
      .run(input.leaseId, input.periodMonth, input.amountCents, input.status, paidAt);
    return mapPayment(this.db.prepare(`SELECT * FROM rental_payments WHERE id = ?`).get(info.lastInsertRowid) as PaymentRow);
  }

  updatePayment(id: number, input: UpsertRentPaymentInput): RentPayment | null {
    if (!this.db.prepare(`SELECT id FROM rental_payments WHERE id = ?`).get(id)) return null;
    const paidAt = input.status === 'paid' ? new Date().toISOString() : null;
    this.db
      .prepare(
        `UPDATE rental_payments SET lease_id = ?, period_month = ?, amount_cents = ?, status = ?, paid_at = ? WHERE id = ?`,
      )
      .run(input.leaseId, input.periodMonth, input.amountCents, input.status, paidAt, id);
    return mapPayment(this.db.prepare(`SELECT * FROM rental_payments WHERE id = ?`).get(id) as PaymentRow);
  }

  deletePayment(id: number): boolean {
    return this.db.prepare(`DELETE FROM rental_payments WHERE id = ?`).run(id).changes > 0;
  }

  /**
   * Set a payment's rent status directly.
   *
   * `markPaid` is the only other status writer and it is one-way by design; this is the route the
   * `due` transition needs. `paid_at` is cleared when a payment moves back out of `paid`, so the
   * column never contradicts `status`.
   */
  setPaymentStatus(id: number, status: RentStatus): RentPayment | null {
    if (!this.db.prepare(`SELECT id FROM rental_payments WHERE id = ?`).get(id)) return null;
    const paidAt = status === 'paid' ? new Date().toISOString() : null;
    this.db
      .prepare(`UPDATE rental_payments SET status = ?, paid_at = ? WHERE id = ?`)
      .run(status, paidAt, id);
    return mapPayment(this.db.prepare(`SELECT * FROM rental_payments WHERE id = ?`).get(id) as PaymentRow);
  }

  markPaid(id: number): RentPayment | null {
    if (!this.db.prepare(`SELECT id FROM rental_payments WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(`UPDATE rental_payments SET status = 'paid', paid_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id);
    return mapPayment(this.db.prepare(`SELECT * FROM rental_payments WHERE id = ?`).get(id) as PaymentRow);
  }
}
