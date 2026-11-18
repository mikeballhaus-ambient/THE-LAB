import type { Database } from 'better-sqlite3';
import { demoLabUserIdForIndex } from '@/backend/db/Auth/seed-demo-users';
import {
  APP_SEED_BOOT_FLAG_KEYS,
  isAppSeedBootDisabled,
} from '@/shared/config/app-seed-boot-flags';

const CONTACT_COUNT = 30;
const PRODUCT_COUNT = 20;
const INVENTORY_COUNT = 20;
const LEAD_COUNT = 20;
const SALE_COUNT = 10;
const SERVICE_COUNT = 20;
const QUOTE_COUNT = 15;

const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected'] as const;

const FIRST_NAMES = [
  'Avery',
  'Jordan',
  'Sam',
  'Taylor',
  'Morgan',
  'Riley',
  'Casey',
  'Quinn',
  'Drew',
  'Blake',
  'Cameron',
  'Reese',
  'Skyler',
  'Jamie',
  'Alex',
];

const LAST_NAMES = [
  'Chen',
  'Patel',
  'Rivera',
  'Nguyen',
  'Kim',
  'Brooks',
  'Hayes',
  'Foster',
  'Bennett',
  'Coleman',
  'Murphy',
  'Reed',
  'Howard',
  'Ward',
  'Torres',
];

const COMPANIES = [
  'Northwind Labs',
  'Summit Health',
  'Brightline Retail',
  'Cascade Energy',
  'Harbor Finance',
  'Redwood Manufacturing',
  'Pioneer Logistics',
  'Atlas Media',
  'Vertex Systems',
  'Silverline Consulting',
];

const PRODUCT_CATEGORIES = ['Software', 'Services', 'Hardware', 'Training', 'Support'];
const WAREHOUSES = ['WH-A', 'WH-B', 'WH-C', 'WH-D'];
const LEAD_STATUSES = ['new', 'working', 'qualified', 'disqualified'] as const;
const LEAD_SOURCES = ['web', 'referral', 'inbound', 'event', 'partner'];
const SALE_STAGES = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed-won',
  'closed-lost',
] as const;
const SERVICE_STATUSES = ['open', 'in-progress', 'resolved', 'closed'] as const;
const SERVICE_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const SERVICE_CATEGORIES = ['Onboarding', 'Pre-sales', 'Billing', 'Technical', 'Account'];

function definitionId(db: Database, entityKey: string): number {
  const row = db.prepare('SELECT id FROM entity_definitions WHERE entity_key = ? LIMIT 1').get(entityKey) as
    | { id: number }
    | undefined;
  if (!row) {
    throw new Error(`Missing entity definition: ${entityKey}`);
  }
  return row.id;
}

function insertRecord(db: Database, entityKey: string, data: Record<string, unknown>): number {
  const entityDefinitionId = definitionId(db, entityKey);
  const result = db
    .prepare(
      `INSERT INTO entity_records (entity_definition_id, data_json, created_at, updated_at)
       VALUES (?, ?, datetime('now'), datetime('now'))`,
    )
    .run(entityDefinitionId, JSON.stringify(data));
  return Number(result.lastInsertRowid);
}

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

/** Present in hero contact row when full demo dataset was applied. */
export const DEMO_HERO_EMAIL_MARKER = 'avery.chen@northwind.example';

export function hasDemoDataset(db: Database): boolean {
  return Boolean(
    db
      .prepare('SELECT 1 FROM entity_records WHERE data_json LIKE ? LIMIT 1')
      .get(`%${DEMO_HERO_EMAIL_MARKER}%`),
  );
}

export function removeDemoRecords(db: Database): { success: boolean; removed: number; message: string } {
  if (!hasDemoDataset(db)) {
    return { success: true, removed: 0, message: 'No demo dataset present.' };
  }
  const result = db.prepare('DELETE FROM entity_records').run();
  return { success: true, removed: result.changes, message: 'ok' };
}

/**
 * Inserts linked sample rows for catalog entities (contacts → pipeline → products/inventory/quotes).
 * Skips when any entity_records row already exists (existing CRM data).
 */
export interface SeedApplyOptions {
  /** Settings admin Apply — ignores boot suppress flags and CRM_SKIP_DEMO_SEED. */
  adminApply?: boolean;
}

export function seedDemoRecords(db: Database, options?: SeedApplyOptions): void {
  if (!options?.adminApply) {
    if (process.env.CRM_SKIP_DEMO_SEED === '1') {
      return;
    }
    if (isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.CRM_DEMO)) {
      return;
    }
    const { c: recordCount } = db.prepare('SELECT COUNT(*) AS c FROM entity_records').get() as {
      c: number;
    };
    if (recordCount > 0) {
      return;
    }
  }

  const contactIds: number[] = [];

  contactIds.push(
    insertRecord(db, 'contacts', {
      firstName: 'Avery',
      lastName: 'Chen',
      email: 'avery.chen@northwind.example',
      phone: '555-0101',
      company: 'Northwind Labs',
      title: 'Operations Director',
      status: 'active',
      source: 'web',
      notes: 'Demo contact — primary account for pipeline testing.',
      accountOwnerId: demoLabUserIdForIndex(0),
    }),
  );

  contactIds.push(
    insertRecord(db, 'contacts', {
      firstName: 'Jordan',
      lastName: 'Patel',
      email: 'jordan.patel@summit.example',
      phone: '555-0102',
      company: 'Summit Health',
      title: 'IT Manager',
      status: 'active',
      source: 'referral',
      accountOwnerId: demoLabUserIdForIndex(1),
    }),
  );

  contactIds.push(
    insertRecord(db, 'contacts', {
      firstName: 'Sam',
      lastName: 'Rivera',
      email: 'sam.rivera@example.com',
      status: 'inactive',
      source: 'event',
      accountOwnerId: demoLabUserIdForIndex(2),
    }),
  );

  for (let i = contactIds.length; i < CONTACT_COUNT; i++) {
    const firstName = pick(FIRST_NAMES, i);
    const lastName = pick(LAST_NAMES, i + 3);
    const company = pick(COMPANIES, i);
    contactIds.push(
      insertRecord(db, 'contacts', {
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.replace(/\s+/g, '').toLowerCase()}.example`,
        phone: `555-${String(1000 + i).slice(-4)}`,
        company,
        title: i % 2 === 0 ? 'Director' : 'Manager',
        status: i % 7 === 0 ? 'inactive' : 'active',
        source: pick(LEAD_SOURCES, i),
        accountOwnerId: demoLabUserIdForIndex(i),
      }),
    );
  }

  const productIds: number[] = [];

  productIds.push(
    insertRecord(db, 'products', {
      sku: 'SKU-PLATFORM',
      name: 'Platform Starter',
      description: 'Core CRM platform subscription',
      unitPrice: 499,
      category: 'Software',
      isActive: true,
    }),
  );

  productIds.push(
    insertRecord(db, 'products', {
      sku: 'SKU-SUPPORT',
      name: 'Premium Support',
      description: 'Annual support package',
      unitPrice: 199,
      category: 'Services',
      isActive: true,
    }),
  );

  for (let i = productIds.length; i < PRODUCT_COUNT; i++) {
    const category = pick(PRODUCT_CATEGORIES, i);
    productIds.push(
      insertRecord(db, 'products', {
        sku: `SKU-${1000 + i}`,
        name: `${category} Pack ${i + 1}`,
        description: `Demo catalog item ${i + 1}`,
        unitPrice: 50 + (i % 20) * 25,
        category,
        isActive: i % 9 !== 0,
      }),
    );
  }

  for (let i = 0; i < INVENTORY_COUNT; i++) {
    insertRecord(db, 'inventory', {
      productId: productIds[i % productIds.length],
      quantityOnHand: 20 + (i * 7) % 200,
      reorderLevel: 10 + (i % 5) * 5,
      location: pick(WAREHOUSES, i),
      lastCountedAt: `2026-${String((i % 12) + 1).padStart(2, '0')}-15`,
    });
  }

  const leadIds: number[] = [];

  leadIds.push(
    insertRecord(db, 'leads', {
      title: 'Northwind platform expansion',
      contactId: contactIds[0],
      status: 'qualified',
      source: 'inbound',
      score: 82,
      estimatedValue: 25000,
      notes: 'Ready for proposal — use Convert to sale workflow.',
    }),
  );

  leadIds.push(
    insertRecord(db, 'leads', {
      title: 'Summit Health trial follow-up',
      contactId: contactIds[1],
      status: 'working',
      source: 'web',
      score: 58,
      estimatedValue: 8000,
    }),
  );

  for (let i = leadIds.length; i < LEAD_COUNT; i++) {
    const contactId = contactIds[i % contactIds.length];
    const company = pick(COMPANIES, i);
    leadIds.push(
      insertRecord(db, 'leads', {
        title: `${company} opportunity #${i + 1}`,
        contactId,
        status: pick(LEAD_STATUSES, i),
        source: pick(LEAD_SOURCES, i + 1),
        score: 30 + (i * 11) % 70,
        estimatedValue: 5000 + (i * 1300) % 45000,
      }),
    );
  }

  const saleIds: number[] = [];

  saleIds.push(
    insertRecord(db, 'sales', {
      name: 'Northwind Platform — Q4',
      contactId: contactIds[0],
      leadId: leadIds[0],
      stage: 'negotiation',
      amount: 24000,
      expectedCloseDate: '2026-11-30',
      productId: productIds[0],
      quantity: 5,
      notes: 'Linked to qualified lead and Platform Starter SKU.',
      ownerId: demoLabUserIdForIndex(0),
    }),
  );

  for (let i = saleIds.length; i < SALE_COUNT; i++) {
    const contactId = contactIds[i % contactIds.length];
    const leadId = i % 3 === 0 ? leadIds[i % leadIds.length] : undefined;
    const payload: Record<string, unknown> = {
      name: `Deal ${i + 1} — ${pick(COMPANIES, i)}`,
      contactId,
      stage: pick(SALE_STAGES, i),
      amount: 3000 + (i * 4200) % 80000,
      expectedCloseDate: `2026-${String((i % 12) + 1).padStart(2, '0')}-28`,
      productId: productIds[i % productIds.length],
      quantity: 1 + (i % 12),
    };
    if (leadId != null) {
      payload.leadId = leadId;
    }
    payload.ownerId = demoLabUserIdForIndex(i);
    saleIds.push(insertRecord(db, 'sales', payload));
  }

  insertRecord(db, 'service', {
    subject: 'Onboarding configuration help',
    description: 'Customer needs connector setup for Forms Builder.',
    contactId: contactIds[0],
    saleId: saleIds[0],
    status: 'in-progress',
    priority: 'medium',
    category: 'Onboarding',
    assignedTo: demoLabUserIdForIndex(0),
  });

  insertRecord(db, 'service', {
    subject: 'Trial environment question',
    contactId: contactIds[1],
    status: 'open',
    priority: 'low',
    category: 'Pre-sales',
    assignedTo: demoLabUserIdForIndex(1),
  });

  for (let i = 2; i < SERVICE_COUNT; i++) {
    const contactId = contactIds[i % contactIds.length];
    const payload: Record<string, unknown> = {
      subject: `${pick(SERVICE_CATEGORIES, i)} request #${i + 1}`,
      description: `Demo service ticket ${i + 1}`,
      contactId,
      status: pick(SERVICE_STATUSES, i),
      priority: pick(SERVICE_PRIORITIES, i),
      category: pick(SERVICE_CATEGORIES, i + 2),
    };
    if (i % 3 === 0 && saleIds.length > 0) {
      payload.saleId = saleIds[i % saleIds.length];
    }
    payload.assignedTo = demoLabUserIdForIndex(i);
    insertRecord(db, 'service', payload);
  }

  seedDemoQuoteRecords(db, { contactIds, leadIds, productIds });
}

/** Demo quotes for the `quotes` entity (also used by CRM migrations on existing demo DBs). */
export function seedDemoQuoteRecords(
  db: Database,
  refs: { contactIds: number[]; leadIds: number[]; productIds: number[] },
): void {
  const { contactIds, leadIds, productIds } = refs;
  if (!contactIds.length || !productIds.length) {
    return;
  }

  let quotesDefId: number | null = null;
  try {
    quotesDefId = definitionId(db, 'quotes');
  } catch {
    return;
  }

  const { c: existing } = db
    .prepare(
      `SELECT COUNT(*) AS c FROM entity_records WHERE entity_definition_id = ?`,
    )
    .get(quotesDefId) as { c: number };
  if (existing > 0) {
    return;
  }

  insertRecord(db, 'quotes', {
    title: 'Northwind Platform — formal quote',
    contactId: contactIds[0],
    leadId: leadIds[0],
    productId: productIds[0],
    status: 'sent',
    amount: 24950,
    validUntil: '2026-12-15',
    notes: 'Aligned with qualified lead; five Platform Starter seats.',
  });

  insertRecord(db, 'quotes', {
    title: 'Summit Health — Premium Support',
    contactId: contactIds[1],
    leadId: leadIds[1],
    productId: productIds[1],
    status: 'draft',
    amount: 1990,
    validUntil: '2026-11-01',
  });

  for (let i = 2; i < QUOTE_COUNT; i++) {
    const contactId = contactIds[i % contactIds.length];
    const company = pick(COMPANIES, i);
    const payload: Record<string, unknown> = {
      title: `${company} quote #${i + 1}`,
      contactId,
      productId: productIds[i % productIds.length],
      status: pick(QUOTE_STATUSES, i),
      amount: 1200 + (i * 2100) % 52000,
      validUntil: `2026-${String((i % 12) + 1).padStart(2, '0')}-20`,
    };
    if (leadIds.length > 0 && i % 2 === 0) {
      payload.leadId = leadIds[i % leadIds.length];
    }
    insertRecord(db, 'quotes', payload);
  }
}
