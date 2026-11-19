/**
 * App system instructions for Workflow Studio (seeded into apps.app_system_instructions).
 */

import { formatPlatformRecordListAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';

export const labWorkflowStudioAppInstructions = `# App System Instructions: Workflow Studio

## Overview

Workflow Studio (\`app-lab-workflow-studio\`) is a **browser** catalog app (no app server port). It is the **only** place to author, edit and run workflows — the former **Settings → My workflows** and **Settings → Lab workflows (admin)** entries were removed. Send users here, not to Settings. All persistence uses the **main platform backend on port 3000** (\`/api/platform/lab-workflows\`, domain event catalog, integration service catalog).

**Automation model:** Workflows run on the **lab domain event bus** after an event is published. **Rules are not global bus listeners** by default. Use **rule nodes** on the graph (inline \`name\` + \`conditions\`) or legacy \`ruleId\` links on old graphs. The standalone **Rules Engine** catalog app is retired — there is **no** Settings “Rules library” palette in the graph designer.

**Agents:** Prefer platform HTTP/MCP workflow APIs and \`GET /api/platform/lab-events/catalog\` for triggers. Do **not** use \`write_query\` on \`lab_workflows\` or \`lab_rules\`. Integration **bindings** (Forms Builder slots) are unrelated to workflow connector lookups/writes.

Docs: \`docs/platform/lab-workflow-studio.md\`, \`docs/platform/lab-automation-architecture.md\`.

## Shell layout

\`\`\`html
<div class="lab-workflow-studio-app lab-platform-catalog-app">
  <!-- PrimeVue Tabs -->
  <tab>My workflows</tab>
  <tab>Lab workflows (admin)</tab>
</div>
\`\`\`

| Tab | Component | Who |
|-----|-----------|-----|
| **My workflows** | \`LabWorkflowsManagement\` (\`adminMode=false\`) | Members: CRUD own \`user\` scope workflows |
| **Lab workflows (admin)** | \`LabWorkflowsManagement\` (\`adminMode=true\`) | Admins: all workflows including \`global\` |

List UI: **workflow cards** in **primary-tag sections** (same pattern as apps home: one section per first tag on the workflow, count in the heading, up to 8 preview cards, **Show all** narrows to a filtered grid). **Tag filter chips** above the sections match app category filters. **Create** / **Edit** swaps the list for a **full-view editor** (not a modal).

Each card shows **name**, **tags** (click a tag to filter), **enabled / priority** (and **scope / owner** in admin mode), **description**, **trigger event** badge, and **Edit** / **Delete**. Authors set **Tags** in the editor meta row (comma-separated chips, max 12); the **first tag** is the workflow's catalog section. Tags are stored on \`lab_workflows.tags_json\` — they are **not** app catalog tags.

**Event** shows the trigger's *label* from the domain event catalog, resolved via \`getWorkflowTriggerEventType()\` — the trigger lives on a graph \`trigger\` **node** in v2 definitions, not on \`definition.trigger\` (v1 only). Read both shapes or the badge renders empty.

**Full screen** (icon-only toggle in the header, Esc to leave) lifts the whole editor — meta strip, palette, canvas and the
tabbed sidebar together — into a viewport overlay. It is a fixed overlay, **not** the browser Fullscreen
API: every nested designer dialog is teleported to the document body and positioned by PrimeVue's own
z-index counter, so a real fullscreen element would paint those dialogs outside itself and they would open
invisibly. The overlay therefore sits at a low z-index and lets PrimeVue's popup layers stay above it; the
shell's quick nav and Sidecar are hidden while it is active, and Esc is ignored while a nested dialog is
open so that dialog keeps owning the key.

Editor layout is three columns plus a single-line meta strip:

\`\`\`text
[ single-line meta: Name | Description | Priority | Enabled ]
[ palette |  graph canvas  |  sidebar: Details | Test & run ]
\`\`\`

The **graph canvas** is the centre column and owns all remaining height. The right sidebar is **tabbed**: \`Details\` shows the selected node/edge editor, \`Test & run\` shows the payload/run panel, and \`Logs\` shows execution history — only one is visible at a time. **Selecting a node or connection always brings \`Details\` forward**, so a click on the canvas never registers invisibly while \`Logs\` or \`Test & run\` happens to be open; clearing the selection (a click on empty canvas) leaves the open tab alone so a run in progress is not interrupted. **Cancel** (header or footer) returns to the list.

**Logs tab:** two PrimeVue subtabs, **Test** (\`triggerType = manual\`) and **Live** (event, schedule, webhook). The split is applied **server-side** (\`GET …/runs?kind=manual|live\`) because both share one 200-row retention window per workflow — a client-side slice could show an empty Live list while manual runs filled the table. Rows are compact line items (status icon, timestamp, trigger, duration); the row opens a **Run details** modal listing every executed step with its status, item counts, duration and node \`detail\` JSON, plus the trigger envelope. A dry-run preview writes **no** run row, so a Test entry is always a run that actually wrote.

**Test & run panel:** pick a sample situation, then press the **single** run button. Its label is the mode: **Test (safe preview)** while the *Also send notifications and write data* box is unticked, **Run for real** once it is ticked. There is deliberately **no second button** — two look-alike buttons (Test / Run for real) let an author tick a box, press Test, and get a silent no-op. Sample payload lives behind a collapsed *What this sample includes* disclosure. Catalog apps needed by the graph are listed with readiness plus *Start required apps before each run*. Ticking **either** mode checkbox starts those app backends immediately. There is **no** “Save custom sample” authoring UI; the per-trigger samples in \`lab-workflow-trigger-test-scenarios.ts\` cover the built-in event types, and \`lab_workflow_run\` accepts \`mockSampleId\` for agent-driven replays.

**Loop node — the one bounded cycle:** \`{ kind: 'loop', maxIterations: 1..100, while?: LabRuleConditionV1[] }\`. Two outputs: **port 0 = While** (body), **port 1 = Done**. Iteration is **graph traversal**, not a step-loop: the body's last node links back to the loop node, and \`runLoopNode()\` in \`lab-workflow-graph-evaluator.ts\` drives the passes itself, giving each body pass a fresh \`pathVisited\` (minus the loop's own id). The step runner only *decides the port* — it receives \`loopIteration\` and stays stateless. \`maxIterations\` is **required** because an uncapped loop is a hang; the panel edits it and the **While** condition list directly. The validator's cycle ban now allows a cycle **only** when the node it returns is a loop; every other cycle still errors. Items leaving \`Done\` carry \`loopIteration\`, \`loopExhausted\`, \`loopMaxIterations\`, so a downstream IF distinguishes "finished" from "ran out". Loop state lives on the **item**, not the node — items thread along edges, which is what survives the back-edge. The \`while\` list accepts the **full payload operator vocabulary** (\`payload_greater_than\`, \`payload_less_or_equal\`, \`payload_contains\`, \`payload_missing\`, …), so "loop while attempts < 3" is expressible directly rather than needing a flag. For an early exit add a \`break_loop\` action rather than a third port: a \`break\` port would race \`done\`.

**Durable \`wait\` (phase 36):** a \`wait\` in \`minutes\`/\`hours\`/\`days\` returns a **\`suspend\`** outcome, not \`continue\`. The walker stops; \`onSuspend\` persists \`lab_workflow_run_resumes\` (\`run_id\` PK, \`workflow_id\`, \`node_id\`, \`items_json\`, \`resume_at\`, \`claimed_at\`). **\`items_json\` is the item array the next node needs** — \`wait\` passes its input through, so resume needs no rehydration, and replaying upstream nodes is forbidden because it would re-fire their side effects. The resume pass runs in the existing 60 s tick **after** the schedule pass and walks the edges leaving the suspended node with \`pathVisited = new Set([nodeId])\` so the wait is not re-entered. **Claiming is the idempotency mechanism** — a conditional \`UPDATE … WHERE claimed_at IS NULL\`; \`changes === 0\` means another tick won, which is what stops a restart or a second backend notifying people twice. **No definition snapshot:** a resume runs against the workflow as it is when the clock fires; guarding a changed shape is the **owner's** job (a condition node that re-checks fields), and only a *dangling* \`node_id\` is the runtime's problem (the run finishes \`failed\`). Granularity: a wait resumes at the first tick at or after \`resume_at\` — late, never early, bounded by 60 s; this is why \`seconds\` remains a separate in-process unit.

**Canvas run colouring (live):** the evaluator emits \`lab_events:workflow_run_step\` over \`/lab-events\` to the **user room** of whoever pressed Test/Run, once \`running\` and once settled per node (\`emitWorkflowRunStep\` in \`lab-workflow-run-stream.ts\`; wired via \`streamUserId\`/\`streamWorkflowId\` on the run options, set **only** by the manual designer path). Nodes tint by outcome — green **succeeded**, blue pulsing **running**, red **failed**, dimmed **skipped**. Scheduler / webhook / event runs pass no \`streamUserId\` and stay silent. Colouring clears on any graph edit.

**The stream is the only source of canvas state — there is no fallback.** Events are queued and drained at 1 s per transition, because a local graph completes in milliseconds and painting on arrival is indistinguishable from painting at the end. If a run finishes having sent **no** events, \`onRunComplete\` blanks the canvas and shows an error in the run panel; it does **not** synthesise an animation from \`result.steps\`. Synthesising would render the same picture whether the socket worked or not, which is how a silent streaming regression survives. The recorded steps remain readable in the panel, so nothing is lost.

## Seeded demo workflows

A fresh lab seeds **eight** \`global\` workflows from \`DEMO_WORKFLOW_SEEDS\` in
\`demo-workflow-seed-catalog.ts\` (platform pack \`phase2-platform-demo\`). They wire **host apps**
(CRM sales/quotes submit approval and ledger post, Time Tracking timesheet submit) plus the webhook
loop tutorial. Catalog-only demos (expense chain, task routing, ledger notify, HTTP echo) are no
longer seeded.

| Workflow | Trigger | What it teaches |
|----------|---------|-----------------|
| **CRM: sales approval — request** (\`DEMO_WORKFLOW_ID\`) | \`app-lab-crm.sales.approval_submitted\` | \`raise_approval\` on the CRM sales policy |
| **CRM: quote approval — request** | \`app-lab-crm.quotes.approval_submitted\` | \`raise_approval\` on the CRM quote policy |
| **CRM: sales/quote approval — response** | \`platform-approvals.request.*\` | Rule → update \`approvalStatus\` → IF → notify |
| **CRM: post ledger on sales/quote** | CRM \`ledger_post_requested\` events | \`ledger_post_entry\` from event \`amountCents\` |
| **Time Tracking: timesheet approval — request** | \`app-time-tracking.timesheet.submitted\` | \`raise_approval\` on the timesheet policy |
| **Demo: webhook loop with counter** (\`DEMO_WORKFLOW_WEBHOOK_LOOP_ID\`) | \`platform-webhook.request.received\` | \`loop\` (3 passes) → \`wait\` 3 s → \`code\` node incrementing \`stepValue\` → back-edge; \`Done\` → IF on \`stepValue = 3\` → **two edges from the true port**: an in-app notification *and* a Messages DM to the request's \`userId\`. The counter is a \`code\` node because incrementing is a **mutation**, not data shaping — \`set_fields\` maps values and never reads its destination. The trigger **must map \`userId\`**: a populated mapping reduces the payload to the mapped pairs, so an unmapped field never reaches the graph and the DM silently resolves zero recipients. **No webhook endpoint is seeded** — press *Create webhook endpoint* in the trigger details panel to mint a test/live pair; a webhook is a credential the author creates, not demo data. |

Live checks: CRM **Submit approval** / **Post entry** on sales or quotes (CRM app server running);
submit a week in Time Tracking for the timesheet request graph. Bump \`DEMO_AUTOMATION_DEFINITION_REVISION\`
when changing graphs.

## Graph designer (definition schema v2)

- **Canvas:** Vue Flow — drag nodes, pan/zoom, **Auto arrange** control.
- **Trigger:** Exactly one trigger node; set event type from **Events** palette or detail panel.
- **Edges:** Connect nodes; **double-click** an edge to set branch: \`always\`, \`on_true\` / \`on_false\` (conditions), \`on_match\` / \`on_no_match\` (rules). Miswired edges block save (validation message in dialog). An IF offers only \`on_true\` / \`on_false\` — \`always\` is withheld because a port-less edge is refused by \`edgeOutputAllows\` on a branching node, which would leave the branch silently dead.
- **Legacy v1** linear \`steps[]\` definitions migrate to the graph when opened.
- **Webhook output mapping (phase 37):** a trigger node may carry \`mapping: { from, to }[]\`. Empty/absent ⇒ the payload passes through; populated ⇒ only mapped fields survive, so a misspelled \`to\` surfaces as a *missing* field rather than a stale one. Duplicate \`to\` values block save (\`duplicate_mapping_target\`), as do half-written rows — validated in \`validateLabWorkflowGraphForSave()\`, not the Zod schema, so the message can name the node. The section renders only when the trigger's catalog entry has \`dynamicPayload: true\`; a declared event needs none of this. Divergence from the saved \`mapping_source_json\` is compared by **shape, not values** — a counter incrementing never prompts, a field appearing/vanishing/retyping does — and **Adopt** never auto-remaps: rows whose \`from\` vanished stay unresolved and block save.

### Left palette (no separate Rules list)

| Section | Purpose |
|---------|---------|
| **Layout** | **Condition** (payload / connector lookup), **New rule node** (inline rule on graph), **Action group**, **Rule group** |
| **Events** | Domain event types grouped by source app — drag or click to set/create trigger |
| **Data** | \`set_fields\` (**shaping only**: \`literal\` / \`from_payload\` / \`template\` — it never reads the destination it writes), \`code\`, \`rename_fields\`, \`date_time\`, \`filter_items\`, \`sort_items\` |
| **Control** | \`loop\` (bounded, two outputs), \`wait\` (\`seconds\` in-process; \`minutes\`+ **suspend** and resume on the clock) |
| **Flow** | \`if_condition\`, \`switch_condition\`, \`merge_items\`, \`split_out\` |
| **Platform** | \`lab_query_app\`, \`integration_delete\`, \`raise_approval\`, \`ledger_post_entry\` |
| **Quarks / virtual bank** | \`virtual_bank_get_wallet\` (read-only eligibility), \`virtual_bank_credit_daily_allotment\`, \`show_user_toast\` (shell toast — not bell \`notify_users\`) |
| **External** | \`http_request\` |
| **Actions** | \`notify_users\`, \`comms_system_dm_payload_user\`, \`publish_event\` |
| **App data (integrations)** | Drag entity → connector **lookup** condition node (\`lookup_field_*\`) |
| **Connector writes** | \`integration_create\` / \`integration_update\` / \`integration_delete\` per manifest CRUD service |

### Data nodes — the item array

Every node transforms **arrays of items**, and a \`path\` resolves against **one item's** JSON. That is what makes the data nodes composable: \`set_fields\` writes a value that the next node's \`from_payload\` reads.

| Node | Does |
|------|------|
| \`set_fields\` | Writes/overwrites fields. \`source\`: \`literal\`, \`from_payload\` (reads a path), or \`template\` (\`{{payload.x}}\`). |
| \`rename_fields\` | Renames keys and/or removes them. |
| \`date_time\` | Adds, subtracts or formats a date in a **named IANA zone**. Output is normalised to UTC, so two equal instants compare equal. |
| \`filter_items\` | Drops non-matching items. Payload conditions only — an app lookup per row is rejected at save. |
| \`sort_items\` | Sorts, limits, dedupes. A **limit of 0 empties the array**; it does not mean "no limit". |

An **empty array is a real value**, not "no input": a filter that drops everything passes \`[]\` onward, and the next node must see no rows.

### Flow control

| Node | Ports |
|------|-------|
| \`if_condition\` | 0 = true, 1 = false. Emits **both** ports when a batch has rows on both sides. |
| \`switch_condition\` | One port per routing, plus a fallback at \`fallbackOutputIndex\` (default \`routings.length\`). Routes the **whole batch**. |
| \`merge_items\` | Consumes several branches. \`append\` concatenates in edge order; \`by_index\` nests row *i* per branch as \`"0"\`, \`"1"\`…; \`by_key\` joins later branches into the first on \`keyPath\` (\`includeUnpaired\` keeps unmatched base rows). |
| \`split_out\` | Expands an array field into one item per element. A non-array row passes through unchanged rather than being dropped. |

A merge runs **once**, after every incoming branch has arrived or the walk ends. A branch that never ran counts as **no rows**, not "wait forever" — an IF that took the other port must not hang the run. Ports live on the **edge** (\`outputIndex\`), and an edge with no index is only taken by a node that emitted no port.

### Pacing and platform nodes

| Node | Note |
|------|------|
| \`wait\` | Records a resume instant on the run; it does **not** sleep, so a backend restart cannot lose the run. Capped at 30 days. |
| \`lab_query_app\` | Reads a catalog app through its discovery contract. **Replaces** the items with what it read. |
| \`integration_delete\` | Deletes a record addressed by a payload path. A 404 counts as success (already absent). |
| \`raise_approval\` | Raises an approval request as the **event's actor**, so the approver can see who asked. |
| \`ledger_post_entry\` | Posts a balanced entry. \`confirmedByUserId\` is **required** — money must be deliberate. Optional \`memoPath\` reads the journal memo from the event payload (falls back to \`memo\`). Non-numeric amounts read as 0 so the preview shows the imbalance instead of \`NaN\`. |

### External HTTP

\`http_request\` validates its URL at the **request**, per item, because the URL may be templated from the payload. Loopback, link-local, private ranges and bare internal hostnames are refused; \`allowList\` can narrow but never widen that. Every redirect hop is re-validated, and the response body is capped at 1 MB. The dry run reports which URLs would be **blocked** — check it before enabling the node.

**Wave B platform hosts** (\`app-lab-approvals-policies\`, \`app-lab-financial-ledger\`, \`app-lab-app-builder\`) publish \`tier: platform\` integration services on :3000 connectors. They appear in **App data** and **Connector writes** like domain apps. Triggers such as \`platform-approvals.*\` / \`platform-ledger.*\` resolve to those hosts via \`sourceAppId\` → registry app id mapping.

### Rule nodes (preferred)

- **Inline:** Select a **rule** node → detail panel **Rule setup** (\`LabWorkflowGraphRuleSetupPanel\`): name + conditions (same condition types as rules API). Stored on the workflow graph; runtime evaluates against the **workflow trigger** event.
- **Legacy:** \`ruleId\` pointing at \`lab_rules\` rows — still supported if present; do not recommend new library-only rules.
- **Layout → New rule node** adds an empty rule node; complete setup in the detail panel before save.

### Condition nodes

Payload conditions and connector lookups. On lookup conditions, **Fetch record** in the panel previews via platform hub (\`GET …/hub/{appId}/services/{serviceId}/records/{id}\`).

**Payload operators are type-driven.** The operator menu is narrowed by the field's \`valueKind\` from the event catalog (or the captured JSON type for a webhook):

| Field kind | Operators offered |
|---|---|
| \`number\` | present, missing, equals, not equals, greater/less than (and or-equal) |
| \`string\` | all of the above, plus contains / does not contain |
| \`boolean\`, \`id\` | present, missing, equals, not equals |
| unknown (custom path) | everything |

Ordering compares **dates first**, then numbers, then text — so an ISO string compares as an instant, and \`'9' > '10'\` is numeric rather than lexicographic. A comparison that cannot be evaluated (missing field, or a number against non-numeric text) is **no match**, never a pass. The list lives in \`lab-rule-condition-operators.ts\`; add an operator there and both the workflow designer and the Rules engine pick it up.

### Action nodes

Configure step fields in the detail panel (\`LabWorkflowFlowStepEditor\`): user pickers, payload paths, derived event type, integration body maps (\`bodyFromPayload\` JSON).

**Recipients accept a user id or an email.** \`comms_system_dm_payload_user\` and \`notify_users\` with a payload path (toggle **From payload** in the node panel) resolve through \`resolveLabWorkflowRecipientUserId()\` in \`lab-workflow-recipient-resolver.ts\`: a number, a numeric string, or a user email are all valid, and an email is looked up **case-insensitively** because the address usually arrives from a third party. A value that resolves to nobody costs that one recipient, not the run — but a DM to **THE-LAB itself** is refused, because a self-conversation writes a row and reads as a delivery while reaching no one. When a path resolves to nothing the run detail carries \`unresolvedPath\`, which is what turns "I set the DM and nobody got one" into a diagnosable field-name problem.

**\`notify_users\` has two recipient sources.** Either a fixed list (\`userIds\`) or a payload path (\`path\`), chosen with a toggle in the panel; both set is valid and the runner takes the **union**, de-duplicated. The schema rejects neither being set — "notify nobody" must not save as a success. **Fan-out is supported:** several edges may leave one port and the walker runs each target, so two actions from one IF branch is a legitimate pattern, not a duplicate.

**Quarks guinea pig:** seeded workflow **Platform: Quarks daily allotment on login** (\`platform-auth.session.established\`) — \`virtual_bank_get_wallet\` → IF on \`dailyAllotmentEligible\` → \`virtual_bank_credit_daily_allotment\` → \`show_user_toast\`. Wallet GET accrual on port 3000 remains a fallback; disable session events with \`LAB_AUTH_SESSION_EVENTS=0\`.

**Optional CTA buttons (\`actions\`).** Up to three buttons on the bell notification: \`launch_app\` (opens an app tab; optional \`hostContext\` for catalog/CRM/approvals deep links) or \`open_settings\` (Settings nav id when there is no app surface — e.g. ledger admin). Template strings in \`hostContext\` values use the same \`{{payload.field}}\` syntax as message copy. Shell executes via \`executeLabNotificationAction\` in \`execute-lab-notification-action.ts\`.

**\`DEMO_AUTOMATION_DEFINITION_REVISION\`** must be bumped when a demo graph's JSON changes: \`syncDemoAutomationDefinitions\` rewrites demo rows on **every backend start**, so UI edits to a demo workflow are discarded unless they are in the committed seed. Node positions and viewport are preserved from the existing row; content is not.

### Action / rule groups

A group is a **container**, and its members' canvas positions are **derived, not stored**: a member renders at \`labWorkflowGroupSlotPosition(index)\`, where the index comes from ordered membership. Only \`groupId\` (plus a seeding position) is written, and only when membership changes. Anything that copies a live drag offset back into a member's \`position\` is overwritten on the next projection and briefly looks like the node escaped the rail — which is why \`mergeCanvasPositionsIntoDefinition\` skips members entirely.

- **Always one empty slot past the members** (\`labWorkflowGroupSlotCount\`) — the trailing slot is the affordance, not spare capacity. Dropping consumes it and reveals the next, so there is always somewhere visible to drop.
- **The group grows** — its height is derived from the slot count, so adding a member expands the card with no write and no second height calculation to disagree.
- **Collapse is a view preference** (\`labWorkflowGraphCollapsedGroups\`, injected from the canvas), never graph data: persisting it would mark a workflow dirty on a pure UI toggle. A collapsed group hides its members and shrinks to \`LAB_WORKFLOW_GROUP_COLLAPSED_HEIGHT\` (header only — the hint line goes too); saved offsets are untouched, so expanding restores the same rail. The toggle badge shows the **member count**, not the slot count, because the canvas reports zero slots while collapsed.
- **Never default \`extent\`.** \`labWorkflowFlowNodesToVueFlow\` once defaulted \`extent: 'parent'\` for any parented node, which re-clamped members to their group and made dragging one onto the canvas impossible. It is forwarded only when explicitly set.
- **Membership changes must project the PATCHED definition.** \`patchDefinition\` only *emits*; the prop updates on the next parent render, so \`buildDefinitionFromFlow()\`/props read immediately afterwards still described the old membership. Both \`moveNodeIntoGroup\` and \`leaveGroup\` therefore build the next definition explicitly, emit it, and project **that**. A trailing \`emitDefinition()\` is wrong here — it rebuilds from the live flow, which has no containment, so the join was written and immediately overwritten.
- **The slot rail is absolutely positioned** from \`labWorkflowGroupSlotPosition\`, the same function the member projection uses. A flowed rail (flex + gap + a hint line) drifted out of alignment whenever the header or hint changed size, so members rendered between bands and the card overflowed.
- **Only empty slots render a marker.** Slots \`1..memberCount\` are occupied; drawing "Drop here" behind a member card (which is narrower than its slot) both looked broken and implied the wrong drop target.
- **Snap-back needs an explicit re-projection.** A refused drop leaves the definition unchanged, and the structural-sync key ignores positions, so the canvas would keep the drag offset. \`snapBackToProjection()\` re-runs \`domainToFlow\` to make the derived slot win.
- **Members have no handles.** The group is the unit that connects, so an edge that targets a member is redirected to its group in \`onConnect\` — otherwise a path could reach a member while skipping the group's execution and failure options.
- **Drag rules:** into a group that accepts the member kind → join and take the last slot; out of a group → leave, adopting the group's absolute position so the node does not teleport; refused, or dropped back inside → settle into the existing slot (drag reordering is not offered).
- Geometry lives in \`lab-workflow-group-slots.ts\` and mirrors \`DEFAULT_OPTIONS\` in \`lab-workflow-graph-auto-arrange.ts\`, so a manual drop and *Auto arrange* place members identically.

## Scopes and runtime

| Scope | UI | Runtime |
|-------|-----|---------|
| \`user\` | My workflows | Runs for owner’s enabled workflows |
| \`global\` | Lab workflows (admin) only | Runs for all matching events; hidden from members in list |

Publish order after domain events: optional legacy bus rules (\`LAB_BUS_RULES_EVALUATION\`) → **workflows**. A rule node that does not match skips downstream steps on **no-match** branches.

## Triggers beyond the event bus

| Trigger | Fires when | Table |
|---------|-----------|-------|
| **Event** | A matching domain event is published | — |
| **Schedule** | The platform clock finds \`next_fire_at <= now\` | \`lab_workflow_schedules\` |
| **Webhook** | \`POST /api/hooks/workflows/:slug/:secret\` is accepted; the matching hash decides test vs live (legacy \`/api/platform/hooks/:token\` still works, treated as live) | \`lab_workflow_webhooks\` |
| **Error** | A run finishes \`failed\`, publishing \`platform-workflows.run.failed\` | — |

**Schedules** are authored **on the trigger node** as an optional \`schedule\` object, not as a side-table row:

\`\`\`json
{ "id": "…", "kind": "trigger", "position": {…}, "eventType": "app-lab-tasklist.task.created",
  "schedule": { "kind": "cron", "expression": "0 9 * * 1-5", "timezone": "America/Denver" } }
\`\`\`

The graph is the **single source of truth**; \`lab_workflow_schedules\` holds the derived **runtime state**
(\`next_fire_at\`, \`last_fired_at\`). Saving reconciles the two: an unchanged pattern keeps its row id and
\`next_fire_at\`, a changed pattern recomputes \`next_fire_at\`, and **removing** the schedule deletes the row.

- **Authoring:** trigger node → **Run on a schedule** (\`LabWorkflowTriggerScheduleSection\`) → kind, expression, IANA zone → save. The **Schedule trigger** Layout palette entry creates the trigger already scheduled (\`0 9 * * 1-5\` in the browser's zone).
- **Agents:** \`lab_workflow_set_schedule\` (\`schedule: null\` clears it). Do **not** \`write_query\` into \`lab_workflow_schedules\` — a row with no graph entry is invisible in the designer and unremovable through it.
- **Kinds:** \`cron\` (5 fields: **minute hour day-of-month month day-of-week**), \`recurrence\` (RRULE body), \`interval\` (minutes, anchored to the previous fire so a late tick does not accumulate drift).
- **Rejected at save:** an unknown IANA zone, an unparseable cron/RRULE, a 6-field cron, a missing expression, or both day-of-month and day-of-week restricted (cron ORs them, RRULE ANDs them). An interval under 60 s is a **warning**: legal to type, floored at run time.
- **Not available:** \`relative\` and \`staleness\`. They need a record date the platform clock never receives, so authoring one would store a schedule that silently never fires. Per-record timing is the **requirement sweep** (e.g. \`app-home-maintenance.maintenance.due\`).
- **Read route:** \`GET /api/platform/lab-workflows/:id/schedules\` → \`nextFireAt\` / \`lastFiredAt\`. There is **no** schedule write route, deliberately: one validation path.
- One platform tick (every 60 s) drives every schedule; a per-workflow floor of 60 s applies. **Missed windows are not backfilled** — a scheduler that fires five times after a pause turns a reminder into a burst.

**Webhooks** are credentials, not URLs. The token is stored **hashed** for lookup; the plaintext is stored alongside it solely so the designer can show the test and live URLs on every load (each with a copy button) — \`viewer\` never receives it. Restoring or regenerating is a **user action**: "Create webhook endpoint" mints a pair, and "Regenerate test" / "Regenerate live" / "Regenerate both" replaces one or both and immediately invalidates the previous URL. Nothing makes a hook implicitly; the demo seed is the only pre-existing row.
When an HMAC secret is set, the caller must send \`x-lab-timestamp\` and \`x-lab-signature\` (hex HMAC-SHA256 of \`\${timestamp}.\${rawBody}\`); a timestamp outside a 5-minute window is refused as a replay. Unknown and disabled tokens return the same \`401\` so the endpoint is not an existence oracle.

**Error workflows** trigger on \`platform-workflows.run.failed\` with payload \`{ runId, workflowId, triggerType, error }\`. The failure is recorded **before** the event is published, so the history a responder reads already contains the run.

## Versions and rollback

**Publish** snapshots the current definition (\`lab_workflow_versions\`); **rollback** copies a snapshot back as the live graph. Publishing is separate from saving: saving changes what runs next, publishing records "this is the shape I keep". A rollback does not delete the versions after it — you can roll forward again. The newest 20 versions per workflow are kept, and a snapshot is **re-validated** on restore, because a version published before a validator rule existed may be invalid today.

## Export and import

A graph exports as a \`the-lab.workflow\` document with a format marker and version. **Node and edge ids are re-minted on import**, so the same file can be imported twice without colliding. Structure only is checked on import — run the shared validator before saving, because only this instance knows which event types exist.

## Platform APIs (port 3000)

- \`GET/POST /api/platform/lab-workflows\`
- \`PUT/DELETE /api/platform/lab-workflows/:id\`
- \`GET /api/platform/lab-workflows/:id/schedules\` — effective schedules with \`nextFireAt\` / \`lastFiredAt\`
- \`POST /api/platform/lab-workflows/dry-run\`
- \`POST /api/platform/hooks/:token\` — **unauthenticated** webhook entry (token + HMAC are the credential)
- \`GET /api/platform/lab-events/catalog\` — trigger types and payload fields
- \`GET /api/platform/lab-integrations/service-catalog\` — connector entities for lookups/writes

Client: \`src/shared/services/platform-lab-workflows.client.ts\`

## MCP tools — the authoring loop

An agent authors workflows through \`lab_workflow_*\` tools, **not** through \`write_query\` on
\`lab_workflows\`. Every tool delegates to \`LabWorkflowsService\`, so validation, scope filtering and
enable limits behave exactly as they do in the designer.

\`\`\`text
lab_workflow_list_node_types      → graph node kinds (trigger now documents \\\`schedule\\\`) + every step.kind
lab_workflow_list_trigger_events  → event types, payload hints, and which have never fired
lab_workflow_list_app_services    → appId + serviceId for query/write nodes
lab_workflow_validate             → { valid, errors[], warnings[] } — call before EVERY save
lab_workflow_dry_run              → what it would do, with no run row and no side effects
lab_workflow_create               → validate-then-persist; an invalid graph is REJECTED
lab_workflow_run                  → execute for real; returns \\\`executionId\\\`
lab_workflow_get_execution        → per-node items in/out, detail, error
\`\`\`

**The order matters.** \`create\` and \`update\` run the same validator and return the same structured
issues as \`validate\`, so calling \`validate\` first turns a rejection into a correction. A node that
did not execute has **no step row** in \`get_execution\` — absence is the record of what was skipped.

### What each tool will not do

| Tool | Never |
|------|-------|
| \`lab_workflow_dry_run\` | Writes no run row, sends no notification, performs no provider write, publishes no event. Each side-effecting node reports what it *would* do. |
| \`lab_workflow_run\` | Does not enable the workflow. A disabled workflow is runnable on demand — that is a manual test, not a deployment. |
| \`lab_workflow_listen\` | Does not outlive the call. It arms for **one** real trigger, waits briefly, then reports; the arm is dry by default and expires in 5 minutes. Webhook triggers are supported: the delivery route satisfies the arm itself (it does not re-run the graph), so the captured body becomes a reusable sample. |
| \`lab_workflow_delete\` | Requires \`confirm: true\`, and takes runs, steps, mock samples, schedules and webhooks with it. |
| \`lab_workflow_create\` / \`update\` | Will not save a graph containing a money write without \`confirmMoneyWrites: true\`, which is written to the platform audit log as category \`workflow\`. |

### Supplying a test payload

- \`payload\` — **one record**. This is the normal case: the trigger produces exactly one item from it.
- \`items\` — several records. A single-element array becomes the payload unchanged; a multi-element
  array is exposed as \`payload.items\`, which is the shape a **Split Out** node fans out. The trigger
  stays single-item by contract, so a graph built for one record does not change meaning.
- \`envelope\` — a full event. Its \`type\` must match the trigger, and a **real** run persists it
  (\`lab_user_notifications.event_id\` is a foreign key — without the row, notify nodes fail per
  recipient and the run reports success with nobody told).
- \`mockSampleId\` — replay a saved payload. A saved sample **wins** over payload/items.

Use \`lab_workflow_listen\` to capture a real payload when the shape is unknown (a webhook body from an
external system), then replay it with \`mockSampleId\`.



${formatPlatformRecordListAutomationSection({
  contextArea: 'lab-workflow-studio-app',
  recordLabel: 'workflow',
  launchHint:
    'When Sidecar **Focused app** is already `app-lab-workflow-studio` (or Workflow Studio is visible), **do not launch** — scope `contextArea: "lab-workflow-studio-app"`. Only launch from the catalog when Workflow Studio is not mounted (`[data-appname="Workflow Studio"]`).',
})}

**Workflow list edit (example):** \`ui_automation_discover_elements\` with \`contextArea: "lab-workflow-studio-app"\`, \`searchPattern: "Demo: webhook"\` (workflow **name** substring — not the word \`edit\`). Click the row with \`uiRole: "record-action"\`, \`recordAction.action: "edit"\`, and matching \`recordAction.recordName\`, via \`elementRef\`. Icon pencil buttons expose \`data-lab-record-name\` / \`aria-label: edit <name>\`.

## Agent checklist

1. Call \`lab_workflow_list_trigger_events\` and confirm the event type. \`neverFired: true\` means it
   is a documented contract with no publisher yet — a workflow on it saves and never fires.
2. Call \`lab_workflow_list_node_types\` for the exact fields each \`step.kind\` takes. Do not guess.
3. Use **inline rule nodes** or condition nodes — not a separate Rules Engine app.
4. Distinguish **integration bindings** (host UI) from **integration services** (workflow lookups/writes).
5. Call \`lab_workflow_validate\`, then \`lab_workflow_dry_run\`, then \`lab_workflow_create\`.
6. Dry-run before enabling anything that writes outside the workflow — it reports blocked URLs, the
   rendered notification copy, and a ledger imbalance.
7. Money writes need explicit user approval plus \`confirmMoneyWrites: true\`; the confirmation is audited.
8. Never put a credential in an \`http_request\` URL; it is refused, and it would be visible in the
   graph and the run history. Ask for a credential store rather than improvising one.
9. Prefer a user-scoped workflow unless the automation genuinely serves every user: \`@me\` resolves
   to the owner in a user-scoped workflow, but collapses to a tautology in a global one.
10. After instruction or seed changes, restart main backend so \`syncSeededAppSystemInstructions()\`
    updates SQLite.
`;
