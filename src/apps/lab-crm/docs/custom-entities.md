# Custom entity models (Phase A)

CRM stores all business entities in **`entity_definitions`** / **`entity_records`**. The six seeded models (`contacts`, `leads`, …) are **system** definitions (`is_system = 1`) and cannot be deleted. You can add your own models from the CRM **Entity models** tab or via the API.

## Checklist for a new entity

1. **Create the model** — CRM → **Entity models** → **New entity**, or `POST /api/entities/definitions` (requires THE-LAB user JWT on the CRM app server).
2. **Automatic integrations (rm-64)** — On successful create, CRM calls the platform to refresh the CRM **integration manifest**, provision Forms Builder **dialog stubs** (`crm.{entityKey}.create|edit|delete.dialog`), and insert **lab integration bindings** when slots are empty. Updating a definition refreshes the manifest (field model for stubs/discovery). On CRM server startup, the platform syncs the manifest from **all** definitions and idempotently provisions any missing per-entity dialog bindings (built-in and custom).
3. **Related tasks & tickets (any entity)** — These use **host-wide** slots (`crm.task.*`, `crm.ticket.*`), not per-entity slots. The same bindings apply to leads, contacts, and custom entities; runtime context passes `entityKey`, `recordId`, and `recordLabel`. Platform sync ensures those bindings exist whenever the CRM entity manifest is updated.
4. **Verify** — New nav tab appears; **New** / **Edit** / **Delete** use Lab integration dialogs like built-in entities. If provisioning fails you get **502** with the entity still created — fix platform permissions (CRM `update-app` or admin) and relaunch CRM (startup sync retries custom entities).

Optional manual overrides: [form-keys.md](./form-keys.md), Forms Builder publish, or Integration settings in the host app.

**Delete:** `DELETE /api/entities/definitions/{entityKey}` removes the model (when no records remain), refreshes the integration manifest, deletes `crm.{entityKey}.*` lab bindings, and runs Forms Builder stub cleanup via the platform unbind handler.

Each entity may set **`icon`** (PrimeIcons name, e.g. `pi-users`). It appears on CRM navigation tabs, record headers, dialogs, entity admin, and form bindings.

## API

### Create definition

```http
POST {crmServerUrl}/api/entities/definitions
Content-Type: application/json

{
  "entityKey": "partners",
  "name": "Partners",
  "description": "Channel partners",
  "icon": "pi-users",
  "properties": [
    { "name": "name", "type": "string", "label": "Name", "required": true },
    { "name": "contactId", "type": "lookup", "label": "Primary contact", "lookupEntityKey": "contacts" }
  ]
}
```

Returns **201** with the definition, or **400** with `details` validation messages.

### Update definition

```http
PUT {crmServerUrl}/api/entities/definitions/{entityKey}
```

Same body fields as create (except `entityKey` is in the path). System entities can be updated (properties/name) but not deleted.

### Reorder navigation

```http
PUT {crmServerUrl}/api/entities/definitions/reorder
Content-Type: application/json

{ "entityKeys": ["contacts", "leads", "sales", "service", "quotes", "customs"] }
```

Must list every entity key exactly once. Updates `sort_order` to match list position (1-based).

### Delete definition

```http
DELETE {crmServerUrl}/api/entities/definitions/{entityKey}
```

Allowed only when:

- `is_system = 0`
- No records exist for the entity
- No other entity has a **lookup** property pointing at this `entityKey`

Returns **409** when blocked, **403** for system entities.

## Validation rules

| Rule | Detail |
|------|--------|
| **entityKey** | Lowercase letter first; `a-z`, `0-9`, `-` only; max 63 chars |
| **Reserved keys** | `items`, `users`, `configs`, `logs`, `definitions`, `connector`, … |
| **Properties** | At least one; unique `name`; valid `type`; **enum** needs one+ choices (value + label); lookups must target an existing entity |
| **Lookup display** | Optional **`lookupDisplayFormat`** — template with `{{ propertyName }}` placeholders (overrides single property). Example: `{{ salutation }} {{ firstName }} {{ lastName }}`. Optional **`lookupDisplayProperty`** — one field when no format is set. Eligible placeholder fields: string, number, date, datetime, enum. Omit both for auto (contacts: first + last name) |
| **Nav order** | Drag rows in **Entity models** (handle column) or `PUT /api/entities/definitions/reorder` with `{ "entityKeys": ["contacts", "leads", ...] }`. New entities append at the end (`max sortOrder + 1`) unless reordered. |

Connector discovery and `/api/connector/{entityKey}` pick up new definitions automatically after create.

## UI automation

| Area | Class |
|------|--------|
| Admin screen | `crm-entity-admin` |
| New entity | `crm-entity-admin-new-btn` |
| Save dialog | `crm-entity-admin-save-btn` |
| Table | `crm-entity-admin-table` |

See platform **`crmAppInstructions`** after backend restart for full SearchPattern table.
