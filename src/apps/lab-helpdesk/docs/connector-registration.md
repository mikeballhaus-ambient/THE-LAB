# Register Help Desk connectors in Forms Builder

Help Desk exposes **Forms Builder discovery** for the **Ticket** entity.

## Discovery index

```http
GET http://localhost:3012/api/connector/discovery
```

Returns `appName`, and an `entities` array with `entityKey`, `name`, and relative `discoveryUrl`.

## Ticket connector (use when registering)

```http
GET http://localhost:3012/api/connector/discovery/ticket
```

Returns a `FormsBuilderContract` with:

- `appName`: `help-desk`
- `entityName`: `Ticket`
- CRUD under `/api/connector/tickets`
- Lookups: `status`, `priority`, `assigneeId` (`GET /api/connector/tickets/assignees`), `requesterLabUserId` (platform users via proxied `GET /api/platform/users/lookup`)
- **Hidden** from form autopopulate (set by API context / integrations, not typical end-user fields): `id`, `requesterLabUserId`, `metadata`, `createdAt`, `updatedAt`
- On **create**, when `requesterLabUserId` is omitted, the connector sets it from `X-Lab-User-Id`. Send the field explicitly (including `null`) to override. Use `requesterEmail` on the form for non–lab-user intake when needed.

In Forms Builder → **Connectors** → **Register**, paste:

`http://localhost:3012/api/connector/discovery/ticket`

(Use your Help Desk app port if not `3012`.)

## API registration (optional)

```http
POST http://localhost:3011/api/v1/connectors
Content-Type: application/json

{
  "discovery_url": "http://localhost:3012/api/connector/discovery/ticket"
}
```

Resolve the **Forms Builder** base URL from the platform registry (`GET /api/platform/apps/server-urls?ids=app-lab-formsbuilder` on port **3000**, or the same path proxied on the Help Desk server). Do not use the main lab backend **3000** for connector CRUD — only for URL discovery.

## Headers

Connector calls should send `X-Lab-User-Id` for assignee validation and platform user lookups. CRM-scoped ticket lists use `X-Host-App-Id: app-lab-crm` where applicable.

## Suggested forms

After registering the connector, create forms such as:

Published Forms Builder keys (see `front-end/config/form-keys.ts`):

- Create / edit: `form_1791054325120_stz7jkl` (`TICKET_FORM_KEY`)

Bind fields to connector properties (`subject`, `description`, `status`, `priority`, `assigneeId`, etc.).
