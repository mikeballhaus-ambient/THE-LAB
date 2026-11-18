# CRM form keys (Forms Builder)

**Field layout, types, and required properties:** [forms-builder-guide.md](./forms-builder-guide.md)

Forms are **designed** in **Forms Builder** (`app-lab-formsbuilder`, port **3011**). The designer assigns each form an auto-generated **`form_key`** (e.g. `form_1790886832790_dfi9y90`). You can rename it in the designer, but most teams keep the generated value.

CRM does **not** store form schemas—only **bindings** that map each `entityKey` to a `formKey` (stored as create + edit rows with the same key). **View** is not used in CRM; preview forms in Forms Builder.

## One form per entity (recommended)

Same pattern as **Task List**: a single published form handles **create and edit**. Submit uses connector **create** when `data.id` is absent and **update** when FormMounter passes `recordId` (id is injected on submit).

You do **not** need separate `-create` and `-edit` forms unless you want different layouts.

## Where to put your real keys

**Primary registry (edit this file after you publish forms):**

`src/apps/crm/shared/config/entity-form-keys.ts` → `CRM_ENTITY_FORM_KEYS`

```typescript
export const CRM_ENTITY_FORM_KEYS = {
  contacts: 'form_XXXXXXXXXXXXX', // paste from Forms Builder
  leads: 'form_XXXXXXXXXXXXX',
  sales: '',
  service: '',
  products: '',
  inventory: '',
};
```

**Restart the CRM app server** after updating. Startup runs `seedFormBindingsFromRegistry()`, which upserts **create** and **edit** bindings in SQLite for every non-empty key (same `formKey` for both).

### Registry table (copy/paste from Forms Builder)

| Entity (`entityKey`) | CRM connector entity | Forms Builder `form_key` |
|----------------------|----------------------|---------------------------|
| contacts | Contacts | _paste here_ |
| leads | Leads | _paste here_ |
| sales | Sales | _paste here_ |
| service | Service | _paste here_ |
| products | Products | _paste here_ |
| inventory | Inventory | _paste here_ |

Optional: mirror the same keys in this doc for humans; **git source of truth** is `entity-form-keys.ts`.

## Source of truth at runtime

1. **`entity_form_bindings`** in `src/apps/crm/db/the_lab.db` (seeded from registry on server start, or set in CRM **Form bindings** UI).
2. Fallback if no DB row: `CRM_ENTITY_FORM_KEYS` via `resolveEntityFormKey()`.

## Forms Builder checklist (per entity)

1. Form linked to the correct **crm** connector (Contacts, Leads, …).
2. Field **modelProperty** values match discovery (`firstName`, `contactId`, …).
3. Copy **form key** from the form list into `CRM_ENTITY_FORM_KEYS`.
4. Restart CRM (or add binding manually in **Form bindings**).

## API (optional)

The **Form bindings** tab saves one key per entity (CRM upserts both `create` and `edit`). Low-level API still accepts `purpose`:

```http
POST http://localhost:3010/api/form-bindings
Content-Type: application/json

{
  "entityKey": "contacts",
  "purpose": "create",
  "formKey": "form_1790886832790_dfi9y90",
  "isDefault": true
}
```

Call twice with `"purpose": "edit"` and the same `formKey`, or use the CRM UI / registry seed instead.

## Submit flow

```http
GET  {formsBuilderUrl}/api/v1/forms/load/{formKey}
POST {formsBuilderUrl}/api/v1/forms/submit/{formKey}
```

Forms Builder proxies to CRM connector CRUD on port **3010**.
