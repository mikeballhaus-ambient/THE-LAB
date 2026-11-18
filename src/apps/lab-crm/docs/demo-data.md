# Demo CRM records

On first CRM server startup (when `entity_records` is empty), migration **`v2_crm_demo_records`** inserts sample data with valid lookup IDs.

## What gets seeded

| Entity | Count | Notes |
|--------|------:|-------|
| contacts | 30 | Includes Avery/Jordan/Sam heroes + generated mix |
| products | 20 | Platform Starter + Support + catalog variants |
| inventory | 20 | `productId` → products (rotating warehouses) |
| leads | 20 | `contactId` → contacts; one **qualified** Northwind lead for **Convert** |
| sales | 10 | Links contacts, optional leads, products |
| service | 20 | Mix of sale-linked and contact-only tickets |

**Total:** ~120 demo rows (10× the original sample set).

Linkages follow the seeded entity model (contacts hub → leads/sales/service → products/inventory).

Demo rows also set **THE-LAB user** fields where defined (`accountOwnerId` on contacts, `ownerId` on sales, `assignedTo` on service), using platform user ids **2–11** from the main lab `users` table (see `seed-demo-users.ts`). Migration **`v8_crm_demo_lab_user_backfill`** fills those fields on existing demo datasets after **`v7_crm_lab_user_properties`** adds the properties to entity definitions.

## Existing databases

- **Full demo** is detectable via hero contact `avery.chen@northwind.example`.
- If you had **any** rows before `v2` ran (e.g. a single Jane Doe), v2 marked applied but **did not insert** demo rows. Migration **`v3_crm_demo_backfill`** fixes that on the next CRM server start when there are **fewer than 5** records and no demo hero (stub data is replaced).
- **5+ records** without the demo hero → demo seed is **not** applied automatically (your data is preserved).
- Fresh empty CRM DB → restart CRM once after `v2` / `v3` ship.

## Fresh empty CRM DB

Delete `src/apps/crm/db/the_lab.db` (and `-wal`/`-shm` if present), relaunch **app-lab-crm** — schema + demo rows load on init.

## Disable demo seed

Set environment variable on the CRM app server process:

```bash
CRM_SKIP_DEMO_SEED=1
```

## Custom entities

Demo seed covers the **six system** entities only. Custom models (e.g. `quotes`) are not auto-populated.
