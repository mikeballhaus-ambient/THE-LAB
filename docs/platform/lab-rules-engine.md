# Lab rules engine

**Match library** on **main backend (port 3000)**. Rules encode triggers + conditions. They do **not** perform side effects (notify, HTTP, approvals, etc.) — use [Workflow Studio](lab-workflow-studio.md) **`rule_ref`** steps and action steps for orchestration.

Full picture: [Lab automation architecture](lab-automation-architecture.md).

## Mental model

| Layer | Responsibility |
|-------|----------------|
| **Apps** | Publish [lab domain events](lab-domain-events.md) (facts). |
| **Rules engine** | Reusable **library** — compatible event types + conditions; evaluated via **workflow `rule_ref`**, dry-run API, or legacy bus pass. |
| **Workflow Studio** | **Subscriptions** on the bus — ordered steps (`rule_ref`, notify, publish, …). |

## Scopes

| Scope | Who manages | When it runs |
|-------|-------------|--------------|
| **user** | Member (own rules) or admin (any user) | When `actorUserId` on the event matches `ownerUserId` |
| **global** | Admin only | When referenced from a workflow or legacy bus evaluation |

Members do not see global rules in **My automation rules**. By default rules do **not** run on every publish — wire them with **`rule_ref`** in workflows.

## Rules Engine app UI

- **No Forms Builder** — rules are edited in the native dialog; the app does not register an integration manifest or depend on `app-lab-formsbuilder` at launch.
- **My automation rules** / **Lab rules (admin)** — create/edit rules (native dialog).
- **Event catalog** — documented publishers + types seen on the bus.
- **Rule editor** — drag **events** into **compatible event types** (library metadata); optional **conditions**; no action steps.

## Bus-wide evaluation (legacy)

When `LAB_BUS_RULES_EVALUATION=1`, enabled rules still run on every matching publish and may emit:

## Evaluation output event

When one or more enabled rules match a **source** domain event (legacy bus pass or explicit `runRulesEvaluation: true`), the backend publishes:

| Field | Value |
|-------|--------|
| Type | `platform-rules.evaluation.completed` |
| `sourceAppId` | `platform-rules` |
| Payload | `sourceEventId`, `sourceEventType`, `sourceAppId`, `matchCount`, `matches[]` |

Each `matches[]` entry includes `ruleId`, `ruleName`, `scope`, `ownerUserId`, `priority`, and `evaluatedFacts` — payload paths from **conditions** only and their values at evaluation time.

Rules evaluation does **not** run again on this event (no loops). **Workflows** do run on it.

## API

| Method | Path |
|--------|------|
| GET | `/api/platform/lab-rules` |
| POST | `/api/platform/lab-rules` |
| PUT | `/api/platform/lab-rules/:id` |
| DELETE | `/api/platform/lab-rules/:id` |
| POST | `/api/platform/lab-rules/dry-run` |

Dry-run returns `ruleMatches` and `evaluatedFacts` — not workflow actions.

Session cookie auth; viewers denied.

## Definition (schema v2)

Stored as JSON `schemaVersion: 2` in SQLite:

- `trigger.eventTypes` — one or more event types (OR); drag from [event catalog](lab-domain-events.md#event-catalog-api)
- `conditions` — optional AND list: `payload_equals`, `payload_exists`
- **`@me` in user fields** — in assignee (and other lab user) condition values, pick **@me** instead of a fixed user id:
  - **User-scoped** rules: `@me` is the rule owner’s lab user id (“assigned to me”).
  - **Global** rules: `@me` on a path means the user id **on that field in the event** (e.g. assignee on `assigneeId`), so one shared rule can gate “this event has an assignee” for all users. Pair with Workflow Studio `notify_payload_user` on `assigneeId` to notify that person.

Legacy v1 definitions with `actions` are migrated on read (`actions` are ignored).

## Limits

- 50 enabled global rules
- 20 enabled user rules per owner
- 50 rules evaluated per source event (priority order)

## Client

`src/shared/services/platform-lab-rules.client.ts`

## Related

- [Lab automation architecture](lab-automation-architecture.md)
- [Lab domain events](lab-domain-events.md)
- [Workflow Studio](lab-workflow-studio.md)
- [Approvals](lab-approvals.md)
