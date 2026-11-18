# Lab Workflow Studio (platform v1)

**Orchestration** on the **lab domain event bus** (main backend port **3000**). Workflows perform **actions** (notify, publish derived events, **rule_ref**, Messages DM, etc.). See [Lab automation architecture](lab-automation-architecture.md) for how bus, rules, and workflows fit together.

## What it is

- **Workflows** — ordered **steps** triggered by a single domain event type (wildcard `.*` suffix supported).
- **Scopes** — `user` (member-owned) and `global` (admin-managed; hidden from members in UI but run at runtime).
- **Rules library** — rules are **not** global bus listeners by default. Reference a rule with a **`rule_ref`** step; the platform evaluates that rule against the current envelope. If it does not match, **remaining steps in that workflow are skipped** for this event.

## Publish pipeline order

After persist + notification fan-out:

1. **Rules (legacy bus pass)** — only when `LAB_BUS_RULES_EVALUATION=1` or an inner publish sets `runRulesEvaluation: true` (may emit `platform-rules.evaluation.completed`).
2. **Workflows** — all enabled workflows whose trigger (and optional conditions) match the envelope.

## Step kinds (v1)

| Kind | Behavior |
|------|----------|
| `rule_ref` | Evaluate `ruleId` from the rules library; **abort** workflow if no match |
| `notify_users` | In-app notification rows + socket fan-out. Pick lab user(s) **or** toggle **From payload** and name a field (user id or email). |
| `comms_system_dm_payload_user` | DM from platform **THE-LAB** system user (`users.id` **12**) to payload user — **Messages** (`/lab-comms`) |
| `publish_event` | Derived domain event (full pipeline unless caller opts out of rules) |
| `integration_create` | `POST` on an app **integration connector** service (body fields mapped from payload paths) |
| `integration_update` | `POST` update on a connector record id resolved from a payload path |
| `loop` | **Bounded iteration.** Ports `0 = While` (body), `1 = Done`. `maxIterations` required; `while` is `payload_equals` / `payload_exists` only. The body's last node links back to the loop — the only cycle the validator allows |
| `wait` | `seconds` is honoured **in-process** (exact, but a restart loses it); `minutes`/`hours`/`days` **suspend** the run and resume on the platform clock |
| `code` | A function over the item array: `(items) => items`. Escape hatch for what declarative nodes cannot say — arithmetic, string surgery. No `process`, `require`, `fetch` or imports; hard timeout; bounded result |

### `set_fields` shapes, `code` mutates

`set_fields` is the node a business author uses to build an output shape from an incoming payload. It
is **shaping only**: `literal`, `from_payload` and `template` each read a value and write it to `path`,
and **none reads `path` first**. That invariant is the whole reason the node is predictable — an author
mapping a payload never has to reason about what happened to be there already.

There used to be an `increment` source (read `path`, add `by`, write it back). It was added for the
loop demo and removed: incrementing is a **mutation**, and mixing it into a mapping node meant the
node silently stopped being declarative. Arithmetic now belongs to `code`, which admits what it is.

The editor is a **row editor**, not a JSON textarea: one row per output field, with the incoming
payload's observed paths offered as suggestions for `from_payload`. The demo's counter step is a
`code` node rather than `set_fields` for exactly the reason above.

**Payload template snippets:** Any control that accepts `{{payload.field}}` (notify message title/body,
Set fields **Template** rows, HTTP URL, etc.) shows **Insert field…** plus quick chips from the latest
captured sample — the same field list used for IF conditions and the Code node. Capture a sample first
(run the workflow once or POST to its test URL) before the chips appear.

**Sandbox honesty.** `node:vm` is not a security boundary — Node documents it as isolation from
accidental global access, not containment of hostile code. It is used here because the author is an
authenticated user who can already call every platform tool; the threat model is "don't break the
process", not "contain an attacker". What it does buy is real: no ambient globals, a hard timeout, and
a bounded return value, so the common failure (a typo, an infinite loop) fails the node instead of the
backend.

### Webhook triggers — test/live pairs and dynamic payloads

`POST /api/hooks/workflows/:slug/:secret`. **The secret decides the mode**, not the path.

The designer shows both URLs for a selected endpoint on every load, each with a copy button — a
secret shown only once is a secret the author loses by closing the dialog. The plaintext is therefore
stored next to its hash (`test_secret_plain`, `live_secret_plain`); `viewer` never receives it.
**Regenerate** ("test", "live", or "both") mints a replacement and invalidates the previous URL
immediately, so it is an explicit, confirmed action rather than something that happens on create.
A hook only exists because someone pressed create — the demo seed is the single exception.

| Matched hash | Mode |
|---|---|
| `test_token_hash` | `dryRun: true` — walked and described, nothing sent or written |
| `live_token_hash` | runs for real |

There is deliberately **no `test`/`live` segment**. The token is the credential, so one credential
with two paths would let anyone holding the shareable test URL edit one word and fire real
notifications. Two hashes, two credentials. The `slug` is legibility only and is checked *after*
authentication, purely to reject.

`/api/platform/hooks/:token` still works: it resolves the live hash, so a pre-37 integration keeps
running in the mode it already had.

#### Listen works for webhooks too

**Listen** arms a workflow for one real trigger so an author can confirm the wiring while watching.
For an event trigger the armed map is consulted by `publishLabDomainEventPipeline()`. A webhook never
goes through that pipeline — the delivery route evaluates the graph directly — so the route satisfies
the arm itself via `captureWebhookDelivery()`.

That split matters for one reason: the route has **already run** the graph by the time it reports, so
the capture records what arrived (and saves it as a reusable sample) **without evaluating again**. On a
live hook, reusing the bus capture would mean a second round of real notifications.

Both modes satisfy an arm. **"Let the capture really run"** therefore does two things for a webhook:
it force-starts the required apps before arming, and nothing else — the caller's choice of test vs
live URL already decided whether the run was real.

#### Captures are the only way to learn a shape

A webhook's payload is chosen by the caller, so `payloadFields` is empty in the catalog and the entry
sets `dynamicPayload: true`. Every call is recorded in `lab_workflow_webhook_captures` (pruned per
hook) — that record is what the output-mapping panel offers as paths.

#### Output mapping

The trigger node carries `mapping: { from, to }[]`:

- **Empty/absent** ⇒ the payload passes through unchanged (every pre-37 graph)
- **Populated** ⇒ only mapped fields survive

Unmapped fields are **dropped**, not passed through. A mapping that forwards everything is advisory,
and a misspelled `to` would be invisible instead of surfacing as a missing field.

#### Divergence is compared by shape, not values

`stepValue: 1` today and `2` tomorrow are the same shape. Comparing values would prompt on every
legitimate call and teach the author to dismiss the warning. `diffPayloadShapes` therefore flattens to
`path:type` and ignores values:

| Change | Prompts? |
|---|---|
| a value changes | no |
| keys reorder | no |
| a same-shape array grows | no |
| a field appears or disappears | **yes** |
| a field's type changes | **yes** |

**Adopt never auto-remaps.** It replaces `mapping_source_json` and leaves rows whose `from` vanished
**unresolved**, which blocks save. Guessing at intent would silently change what a `to` means.

### Durable `wait` — how resumption works

`wait` in minutes or more returns a **`suspend`** outcome rather than `continue`. The walker stops,
and the evaluator persists `lab_workflow_run_resumes`:

```sql
run_id (PK) · workflow_id · node_id · items_json · resume_at · claimed_at
```

| Element | Why |
|---|---|
| `items_json` | Carries the **item array** the next node needs. `wait` passes its input through unchanged, so no rehydration or replay is needed on resume — re-running upstream nodes would re-fire their side effects |
| `run_id` as PK | "One suspension per run" is a database invariant, not a status flag that can drift |
| `claimed_at` | The idempotency mechanism. Claiming is a conditional `UPDATE … WHERE claimed_at IS NULL`; `changes === 0` means another tick won. `scheduler.ticking` only guards one process — this guards a restart or a second backend, and a resume can notify people |
| No `definition_json` snapshot | A resume runs against the workflow **as it is when the clock fires**. Guarding a changed shape is the **owner's** job (a condition node that re-checks the fields). Only a *dangling* node id is the runtime's problem, and that finishes the run `failed` |

The resume pass runs in the existing 60 s tick, **after** the schedule pass (a scheduled trigger is
time-critical, a resume tolerates one tick). It walks the edges leaving the suspended node with
`pathVisited = new Set([nodeId])` so the wait is not re-entered — which would schedule a second
resumption of the same run.

**Granularity:** the tick is not generic. A wait is detected at the first tick at or after its
`resume_at`, so a 90 s wait resumes at ~120 s. Late, never early, bounded by 60 s. This is why
`seconds` exists as a separate unit.

### Loop semantics worth knowing

`loop` is a **graph** construct, not a step-loop. The evaluator's `walkNode` refuses to re-enter a
node, so `runLoopNode()` drives the passes itself: each body pass gets a fresh `pathVisited` minus
the loop's own id, and `maxIterations` is the bound. Consequences:

- **Loop state lives on the item.** The counter is a field on the item that travels the back-edge;
  state stored on the node would be invisible to the body.
- **`Done` carries the outcome.** Items leaving port 1 have `loopIteration`, `loopExhausted` and
  `loopMaxIterations`, so a downstream IF can message "finished" differently from "hit the cap".
- **No comparison operators.** Express "stop when…" as a flag (`payload_equals stop false`), not a
  threshold.
### Example: the seeded demo workflow — CRM sales approval (request)

A fresh lab seeds **CRM: sales approval — request** (`DEMO_WORKFLOW_ID`, platform demo pack). It is a
minimal **request half** of the CRM integration pattern: host app publishes intent → workflow raises
an approval on a dedicated policy.

```text
app-lab-crm.sales.approval_submitted
  → raise_approval (CRM sales deal policy; subject = CRM record from payload paths)
```

| What it demonstrates | Where to look |
|---|---|
| Host **intent** event from CRM Submit approval | Trigger node event type |
| `raise_approval` with `subjectAppId` / entity paths | Action node — pairs with **Decide** in CRM UI |
| Response graphs (separate seeded rows) | `platform-approvals.request.*` → rule → IF on `requestStatus` → update + notify |

For a **branching** tutorial (loops, IF, Messages DM), open **Demo: webhook loop with counter**
(`DEMO_WORKFLOW_WEBHOOK_LOOP_ID`) instead.

Seed revision: `DEMO_AUTOMATION_DEFINITION_REVISION` in
[`platform-catalog-demo-seed.ts`](../../src/backend/db/PlatformCatalog/platform-catalog-demo-seed.ts) —
bump it when the demo graph changes so an existing install refreshes on startup.

## Recommended triggers

| Trigger | Use when |
|---------|----------|
| App events (e.g. `app-lab-tasklist.task.created`) | React to product facts directly. |
| Time-derived events (see below) | React to a **date** passing — due, overdue, late, expiring. |
| `platform-rules.evaluation.completed` | Legacy bus-wide rules mode; branch on `matches[]` without duplicating conditions. |
| `platform-approvals.*` | Continue flows after approval decisions. |

### Time-derived triggers — delivered by the platform sweep

Five events describe the **passage of time** rather than a state change, so no app route publishes
them. The **platform requirement sweep** does: it lists each app's records through that app's
connector, compares one date field per record against today, and publishes the ordinary domain event
for each record that qualifies.

| Event | Fires when |
|-------|-----------|
| `app-home-maintenance.maintenance.due` | a task reaches its `dueDate` |
| `app-home-maintenance.maintenance.overdue` | a task is one day past `dueDate` |
| `app-rental-property.rent.late` | a payment's period has elapsed and it is still unpaid |
| `app-rental-property.lease.expiring` | an **active** lease ends within 30 days |
| `app-knowledge-base.article.review_due` | a **published** article has not been updated in 180 days |

What an author needs to know:

- **One event, not a stream.** A record fires **once when it enters the window**, not every day
  inside it. "Expiring within 30 days" is a range; the sweep remembers that it already told you.
- **The payload carries the record.** Every swept event includes `recordId`, `dueDate` (the field the
  comparison used), `requirementKey`, and the record's own fields (title, assignee-ish ids, amounts),
  so a downstream notify node can resolve recipients without re-reading the app. Event payloads carry
  **facts only**; the workflow resolves people.
- **`sourceAppId` is the app**, so the trigger appears under the app you expect in the picker.
- **A date that moves re-qualifies.** Extending a lease by a year is a new fact, not a repeat, so the
  event can fire again for that record.
- **Two were not delivered.** `app-onboarding-checklist.task.overdue` and
  `app-training-quizzes.cert.expiring` are **not** in the picker: the onboarding task has no due-date
  column and training has no certification entity, so there is nothing to compare. They return when
  the app has the field. Do not add a publisher to the app for any of these — an app has no moment at
  which "the date passed" occurs.

## The catalog app

**Workflow Studio (`app-lab-workflow-studio`) is the only place to author workflows.** The old
**Settings → My workflows** and **Settings → Lab workflows** entries were removed on 2026-10-20, so a
workflow has exactly one home and there is no second UI to keep in sync.

- Two tabs: **My workflows** (members CRUD their own `user` workflows) and **Lab workflows (admin)**
  (admins CRUD everything, including `global`).
- **Graph canvas** (**Vue Flow**): free-position **trigger**, **condition**, **rule**, and **action**
  nodes; connect with branches (**always**, **on true/false**, **on rule match/no match**).
  Double-click a connection to configure it. Legacy linear `steps[]` definitions (v1) migrate to the
  graph on open; new workflows save as **definition schema v2**.

### Editor layout

```text
[ single-line meta: Name | Description | Priority | Enabled ]
[ palette |  graph canvas  |  sidebar: Details | Test & run | Logs ]
```

The editor is a **view swap**, not a modal: opening a workflow replaces the list so the canvas owns
the whole view. The right sidebar is **tabbed** — only one of `Details`, `Test & run` or `Logs` is
visible at a time, and **selecting a node or connection always brings `Details` forward**, so a click
on the canvas never registers invisibly while `Logs` is open. Clearing the selection (an empty-canvas
click) deliberately leaves the open tab alone, so a stray click does not yank an author out of a run
in progress.

### Full screen

The icon beside the workflow title (immediately after **Edit workflow** / **Create workflow**) lifts
the entire editor — meta strip, palette, canvas and the tabbed sidebar — into a viewport overlay.
`Esc` leaves it.

**It is a fixed overlay, not the browser Fullscreen API.** Every nested designer dialog (connection
settings, quick-rule creation, the code-node editor, run details) is teleported to `<body>` and
positioned by PrimeVue's own z-index counter. A real fullscreen element would paint `<body>` *outside*
itself, so those dialogs would open **invisibly** — the overlay has to be an ordinary element to avoid
that. Consequences worth knowing before changing it:

- The overlay sits at **`z-index: 60`** — above the workspace's split-mode drag gutter (`z-20`), far
  below PrimeVue's popup layers (1000+). Do not raise it without moving the popups too.
- The shell's quick nav (9998) and Lab Sidecar (9999) are `fixed` siblings that no z-index inside the
  app pane can clear, so a `body.lab-designer-fullscreen` class hides both while it is active. Hiding
  the Sidecar is also what stops its chip overlapping the header's Save button.
- `Esc` is handled in the **capture** phase and stopped there. The editor can be hosted inside the
  Settings dialog, which also closes on `Esc`; without capturing, one press would both leave full
  screen *and* close Settings. It is ignored while a nested dialog is open, so that dialog keeps the
  key.

### Events vs integration data (lookups)

| Concept | Role in workflows today |
|---------|-------------------------|
| **Domain event catalog** | Trigger event types + **payload field** paths for conditions (`payload_exists`, `payload_equals`, `lookup_field_*`) and notify paths. |
| **Integration bindings** | Host-app UI wiring (slot → Forms Builder form). **Not** what workflows execute. |
| **Integration services** | Connector entities declared in each app manifest (`integrationServices` — e.g. `task-list.tasks`). Shown in the designer **App data (integrations)** palette via `GET /api/platform/lab-integrations/service-catalog`. |

**Runtime lookups:** graph **condition** nodes (and rules library conditions) support `lookup_field_exists` / `lookup_field_equals`. The engine loads a connector record using `recordIdPath` on the event payload, then tests an entity field. App servers are **warm-started** with the lab; connector calls use the platform service token and event actor (or workflow owner) for hub discovery.

**Designer live preview:** On connector lookup conditions, use **Fetch record** with a sample id — same platform route the runtime uses (`GET …/hub/{appId}/services/{serviceId}/records/{id}`).

**Connector writes:** the designer **Connector writes** palette adds `integration_create` / `integration_update` action nodes per CRUD integration service. Map body fields with `bodyFromPayload` JSON (`{"title":"payload.title"}`).

## Scheduled triggers — authoring

A workflow can fire on a **wall-clock pattern** with no event at all, or in addition to its event. The
schedule lives **on the trigger node**, as optional declarative data:

```json
{
  "id": "…",
  "kind": "trigger",
  "position": { "x": 0, "y": 0 },
  "eventType": "app-lab-tasklist.task.created",
  "schedule": { "kind": "cron", "expression": "0 9 * * 1-5", "timezone": "America/Denver" }
}
```

**Why on the node and not in a side table.** A row keyed only by trigger id is invisible state: the
graph cannot say "I am scheduled", and export/import — which serialises the definition — silently loses
it. The row in `lab_workflow_schedules` remains **runtime state** (`next_fire_at`, `last_fired_at`)
derived from the authored pattern, the same split action nodes use for retry policy.

### Authoring it

1. Select the **trigger** node.
2. Tick **Run on a schedule** in the detail panel.
3. Choose **Cron**, **Recurrence** or **Interval**; the panel renders the pattern in plain English
   (`0 9 * * 1-5` reads *Every weekday at 09:00*).
4. Pick a **time zone** — a named IANA zone, never an offset. A fixed offset drifts an hour twice a
   year, and the author sees it as "it ran at the wrong time" with nothing to point at.
5. **Save the workflow.** The panel shows **Next run** / **Last run** from the read route.

The **Schedule trigger** entry in the Layout palette does the same thing in one drop: it creates the
trigger with `0 9 * * 1-5` in your browser's zone.

### What is rejected

| Input | Result | Why |
|---|---|---|
| `0 9 * * 1-5 2026` (6 fields) | rejected | Reading it as 5 shifts every field by one — a plausible but wrong schedule. |
| `not/a-zone` | rejected | A silently-UTC schedule fires at the wrong hour forever. |
| Missing expression for `cron`/`recurrence` | rejected | It would store a schedule that never fires. |
| Both day-of-month and day-of-week restricted | rejected | Cron ORs them, RRULE ANDs them; any translation changes the meaning. |
| Interval under 60 s | **warning** | Legal to type; the tick's floor means it fires less often than written. |

`relative` and `staleness` are deliberately **not offered**. They derive their instant from a record
date, and the scheduler is never given one — authoring one would create a schedule that silently never
fires. Per-record timing is handled by the **requirement sweep** above (see *Time-derived triggers*).

### What the sweep and a schedule are not

A **schedule** answers "every Monday at 09:00" — one workflow, one wall-clock pattern, no record.
The **sweep** answers "this lease is 30 days from expiry" — one date per record. They are different
mechanisms with different failures, which is why both exist rather than one being bent to cover both.

### Export / import

A graph's `schedule` travels **with the definition**, so exporting and re-importing a scheduled
workflow keeps the pattern. The **runtime state** does not travel — `nextFireAt` is recomputed at import
rather than copied, which is correct: an imported workflow should start its schedule fresh rather than
inherit another lab's fire history.

## API

- `GET/POST /api/platform/lab-workflows`
- `PUT/DELETE /api/platform/lab-workflows/:id`
- `GET /api/platform/lab-workflows/:id/schedules` — effective schedules with `nextFireAt` / `lastFiredAt`
- `POST /api/platform/lab-workflows/dry-run`

There is deliberately **no** write route for schedules. A schedule is authored by editing the trigger
node and saving the workflow; two write paths with two validation paths is how a broken schedule gets
stored. The read route exists because the editor needs runtime state the graph does not hold.

Client: `src/shared/services/platform-lab-workflows.client.ts`

## Environment

| Variable | Default | Effect |
|----------|---------|--------|
| `LAB_BUS_RULES_EVALUATION` | off | When `1`/`true`, evaluate **all** enabled rules on every publish (legacy). |

## Out of scope

Per-record date **schedules** (`relative` / `staleness`) — the requirement sweep covers those.
Missed-window backfill (a scheduler that fires five times after a pause turns a reminder into a burst).
Schedule templates / a schedule library. A separate schedule-writing API route.

## Related

- [Lab automation architecture](lab-automation-architecture.md)
- [Lab domain events](lab-domain-events.md)
- [Rules engine](lab-rules-engine.md)
- [Approvals](lab-approvals.md)
- Plan: [plans/rm-60-workflow-studio/architecture.md](../../plans/rm-60-workflow-studio/architecture.md)
