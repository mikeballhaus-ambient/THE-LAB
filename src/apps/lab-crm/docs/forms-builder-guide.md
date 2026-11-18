# CRM — Forms Builder design guide

Use this when building CRM forms in **Forms Builder** (`app-lab-formsbuilder`, port **3011**).

You are using **connector autopopulate** — controls, `modelProperty`, and lookup wiring come from the **crm** connector. Your main job after autopopulate is to turn on **Required** in the property editor where this doc says **Yes**.

**Related:** [connector-registration.md](./connector-registration.md) · [form-keys.md](./form-keys.md)

**CRM server rules** (same as below): `src/apps/crm/back-end/db/seed-default-entities.ts`

---

## Workflow (per entity)

1. Create form → link **crm** connector for that entity (Contacts, Leads, …).
2. Run **autopopulate** from the connector (adds fields with correct types and lookups).
3. In the property editor, set **Required** on every property marked **Yes** in the tables below.
4. Do **not** add an `id` field — edit submit adds it automatically.
5. One published form per entity (create + edit).
6. Copy **form key** → `shared/config/entity-form-keys.ts` and restart CRM.

### Required summary (quick copy)

| Entity | Set **Required** on these `modelProperty` names |
|--------|-----------------------------------------------|
| **contacts** | `firstName`, `lastName` |
| **leads** | `title`, `contactId` |
| **sales** | `name`, `contactId` |
| **service** | `subject`, `contactId` |
| **products** | `sku`, `name` |
| **inventory** | `productId` |

Everything else is optional in CRM (you may still mark fields required in the designer for UX).

---

## Build order

1. contacts → 2. products → 3. leads → 4. sales → 5. service → 6. inventory  
(so lookup targets exist when you test)

---

## Contacts

**Connector:** `crm` → **Contacts**

| modelProperty | Required in designer |
|---------------|----------------------|
| `firstName` | **Yes** |
| `lastName` | **Yes** |
| `email` | No |
| `phone` | No |
| `company` | No |
| `title` | No |
| `status` | No |
| `source` | No |
| `notes` | No |

---

## Leads

**Connector:** `crm` → **Leads**

| modelProperty | Required in designer |
|---------------|----------------------|
| `title` | **Yes** |
| `contactId` | **Yes** |
| `status` | No |
| `source` | No |
| `score` | No |
| `estimatedValue` | No |
| `notes` | No |

**Tip:** Leave `status` optional on create; use default `new` in designer if you want. CRM sets `converted` when you use **Convert to sale**.

---

## Sales

**Connector:** `crm` → **Sales**

| modelProperty | Required in designer |
|---------------|----------------------|
| `name` | **Yes** |
| `contactId` | **Yes** |
| `leadId` | No |
| `stage` | No |
| `amount` | No |
| `expectedCloseDate` | No |
| `productId` | No |
| `quantity` | No |
| `notes` | No |

---

## Service

**Connector:** `crm` → **Service**

| modelProperty | Required in designer |
|---------------|----------------------|
| `subject` | **Yes** |
| `contactId` | **Yes** |
| `description` | No |
| `saleId` | No |
| `status` | No |
| `priority` | No |
| `category` | No |

---

## Products

**Connector:** `crm` → **Products**

| modelProperty | Required in designer |
|---------------|----------------------|
| `sku` | **Yes** |
| `name` | **Yes** |
| `description` | No |
| `unitPrice` | No |
| `category` | No |
| `isActive` | No |

---

## Inventory

**Connector:** `crm` → **Inventory**

| modelProperty | Required in designer |
|---------------|----------------------|
| `productId` | **Yes** |
| `quantityOnHand` | No |
| `reorderLevel` | No |
| `location` | No |
| `lastCountedAt` | No |

---

## Optional designer rules (only if you want stricter UX)

CRM does **not** require these unless you add them in Forms Builder:

| Property type | Optional designer rule |
|---------------|------------------------|
| `email` | Email format |
| Enums (`status`, `stage`, …) | Already constrained by autopopulate / connector lookups |
| Lookups | Already bound by autopopulate |

Server still rejects invalid enum values and missing **Yes** fields above.

---

## Before publish

- [ ] Required flags set per table (or summary table).
- [ ] Correct **crm** connector entity linked.
- [ ] Form key in `entity-form-keys.ts`; CRM restarted.

## After publish

CRM → **New** / **Edit** on that entity; failed submit usually means a CRM-required field was left empty or a lookup id is invalid.
