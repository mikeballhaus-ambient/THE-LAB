# Register CRM connectors in Forms Builder

CRM exposes **one discovery document per entity**.

## Discovery index

```http
GET http://localhost:3010/api/connector/discovery
```

Returns entity keys and relative discovery paths.

## Per-entity discovery (use when registering a connector)

| Entity | Discovery URL |
|--------|----------------|
| contacts | `http://localhost:3010/api/connector/discovery/contacts` |
| leads | `http://localhost:3010/api/connector/discovery/leads` |
| sales | `http://localhost:3010/api/connector/discovery/sales` |
| service | `http://localhost:3010/api/connector/discovery/service` |
| products | `http://localhost:3010/api/connector/discovery/products` |
| inventory | `http://localhost:3010/api/connector/discovery/inventory` |

In Forms Builder → **Connectors** → **Register**, paste the discovery URL. The platform fetches `FormsBuilderContract` (`appName: crm`, entity name, CRUD + lookup endpoints).

## MVP minimum

For contacts-only testing, register **`contacts`** discovery first and create `crm-contacts-create` / `crm-contacts-edit` forms.

## API registration (optional)

```http
POST http://localhost:3011/api/v1/connectors
Content-Type: application/json

{
  "discovery_url": "http://localhost:3010/api/connector/discovery/contacts"
}
```

Use the Forms Builder server URL (port **3011**), not the main lab backend on **3000**.
