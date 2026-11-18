# Lab domain events and notifications

Platform feature on the **main THE-LAB backend (port 3000)** — not Lab Assistant chat and not human DMs (`/lab-comms`).

## What it is

- **Domain event bus** — apps publish versioned envelopes (`schemaVersion: 1`, type `{sourceAppId}.{entity}.{action}`). Publish **facts only** (payload fields such as `assigneeId`); do not embed recipient lists on the envelope.
- **Per-user notifications** — created by **workflow** steps (`notify_users`, `notify_payload_user`) after matching workflows run. The bell inbox and unread badges use the same storage as before.
- **Realtime** — Socket.IO namespace `/lab-events` (`LAB_EVENTS_SOCKET` constants).

There is **no separate event-bus app**. Routing to automation is in-process on the main backend — see [Lab automation architecture](lab-automation-architecture.md).

## Where to see notifications

- Quick nav **Notifications** (bell icon) — unread badge and dialog list.
- Consuming apps may also react in their own UI when they subscribe to events.

## For app developers

- Publish from an app server: `publishLabDomainEvent` in `src/shared/services/platform-lab-events.client.node.ts` (forwards session cookie and app service auth). **Import it — do not re-derive the HTTP call.**
- HTTP: `POST /api/platform/lab-events/publish` on the main backend.
- Types: `src/shared/types/lab-domain-event.ts`, Zod in `src/shared/types/schemas/lab-domain-event-schema.ts`.
- **Register the event** in the app’s manifest so Rules Engine and Workflow Studio can offer it in pickers:

  1. Add a row in `src/apps/<app-dir>/shared/lab-domain-events.manifest.ts` (label, description, payload fields). Platform-only publishers use `src/shared/lab-domain-events/platform-lab-domain-events.manifest.ts`.
  2. Import the manifest in `src/shared/lab-domain-events/domain-event-manifest-index.ts` (required for new apps — `npm run generate:app` scaffolds the file but **does not** update the index).
  3. Run `npm run verify:domain-event-manifests` (included in `npm run test:pipeline`) — checks index ↔ disk, duplicate `eventType`, and basic entry shape.

  A catalog entry with no publisher **fails CI** — see below.

Example event type: `app-lab-tasklist.task.created`.

### Naming

`{sourceAppId}.{entityKey}.{past_tense_verb}` — e.g. `app-expense-reports.expense.approved`. Build it
with `buildLabEventType(sourceAppId, entity, action)`; never hand-type the string, because a literal
drifts from the catalog silently. `entityKey` is the connector `entityKey` from
[`catalog-manifests.ts`](../../src/shared/lab-integrations/catalog-manifests.ts), so a payload hint
and a connector property refer to the same word.

### The publish rule: publish on a state change

If a route changes state and another app or a workflow could care, it publishes.

Four properties are load-bearing:

1. **After the write, not inside it.** Publish once the repository call has returned. Publishing
   inside a transaction lets a workflow read a record that then rolls back.
2. **`try/catch` around the publish only.** The user's write already committed. A bus outage must
   return `200`, not `500` — a `500` invites a retry that duplicates the record.
3. **`resolveLabAppActorUserId(request)` on the envelope.** The actor is who the workflow runs as.
   Omit it and `@me` cannot resolve, so user-scoped workflows silently do nothing.
4. **`VSCodeLogger`, never `console`.** `console` output is not captured in the lab's structured logs.

**Publish on the transition, not on every write.** Compare against the value as loaded before the
save:

```ts
const before = repo.getById(id);
const after = repo.setStatus(id, next);
if (before?.status !== after.status && after.status === 'approved') {
  // publish here
}
```

Without this guard a `PUT` that saves a form without changing status re-fires `approved`. That is the
single most likely bug in any publisher, and it is what the per-app no-op tests target.

**Publish facts only, never recipient lists.** `{ expenseId, amountCents }`, not `{ notifyUserIds }`.
A workflow resolves recipients through `notify_payload_user`; an event carrying recipients goes stale
the moment someone's role changes.

### The two prohibitions

- **Do not publish a read.** Nothing changed, so there is nothing to report.
- **Do not publish a time comparison.** Nothing happens when a date passes. `maintenance.due`,
  `maintenance.overdue`, `rent.late`, `lease.expiring`, `task.overdue`, `cert.expiring` and
  `article.review_due` are therefore *not* app events: an app server would need its own clock, and the
  platform runs one tick, not one per process. They are delivered by a platform requirement sweep
  that lists records through the connector contract and evaluates the date **per record**.

### Publishers live in `back-end/`

Never publish from `front-end/`. A browser cannot be trusted to report a state change, and it may
never run.

### The CI guard

| Gate | What it checks |
|------|----------------|
| `npm run verify:domain-event-manifests` | Every manifest on disk is listed in `domain-event-manifest-index.ts`; no orphan imports; no duplicate `eventType`. |
| [`src/tests/ci/shared/lab-domain-event-manifests.test.ts`](../../src/tests/ci/shared/lab-domain-event-manifests.test.ts) | Manifest modules load and merge cleanly. |
| [`src/tests/ci/shared/lab-domain-event-publishers.test.ts`](../../src/tests/ci/shared/lab-domain-event-publishers.test.ts) | For each app-owned entry in the merged catalog, the owning app's `back-end/` contains a `publishLabDomainEvent` call whose `type` matches the entry (via `buildLabEventType` or an equivalent literal). Platform publishers are skipped. |

A newly declared event without a publisher **fails CI**, so "declared" is a state with an expiry rather
than a resting place. `neverFired` in the catalog API is a separate signal — "has this fired since the
last deploy?" — and stays.

Catalog metadata is authored in **per-app manifest files**, not in a shared monolith. The merged
array used in tests is exported as `LAB_DOMAIN_EVENT_CATALOG` from
[`aggregate-domain-event-catalog.ts`](../../src/shared/lab-domain-events/aggregate-domain-event-catalog.ts)
(for Node/Jest only — do not import that aggregator from Vue).

## Event catalog API

| Method | Path | Who |
|--------|------|-----|
| GET | `/api/platform/lab-events/catalog` | member+ (not viewer) |

Returns documented catalog entries plus types observed in `lab_domain_events` that are not yet registered. Rules Engine **Event catalog** tab uses this API.

The catalog does **not** register runtime subscribers — **workflows** (and optionally legacy bus-wide rules) do.

## Runtime routing (after publish)

1. Persist event
2. **Rules** — only if `LAB_BUS_RULES_EVALUATION=1` (legacy bus-wide evaluation; may publish `platform-rules.evaluation.completed`)
3. **Workflows** — enabled workflows whose trigger matches; steps run in order (`rule_ref`, notify, publish, …); notify steps create inbox rows + socket fan-out

Details: [lab-automation-architecture.md](lab-automation-architecture.md) · [lab-workflow-studio.md](lab-workflow-studio.md) · [lab-rules-engine.md](lab-rules-engine.md).

## Admin event log

`GET /api/platform/lab-events/log` (owner/admin) returns recent domain events. No separate catalog app in v1.
