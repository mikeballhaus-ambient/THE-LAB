# Lab Sidecar

The **Lab Sidecar** is the in-context **Lab Assistant** panel on the **apps workspace** (catalog and mounted apps)—labeled **Lab Assistant** on the top-right chip and panel header. It uses the same Dexie chat session as **Laboratory** (full-screen chat), but each send includes **lab view context** so the agent gets the right app system instructions and UI automation defaults. **Laboratory and Sidecar** chat turns also pass the signed-in user’s **Lab profile display name** (`User.name`) on the socket; the backend adds a system-prompt appendix so the agent may use their first name occasionally—not every reply.

Terminology: [lab-shell-terminology.md](lab-shell-terminology.md).

## Using the Sidecar

1. Stay on the **apps workspace** (not full-screen **Laboratory**).
2. Click **Lab Assistant** in the **top-right** to expand the Sidecar panel (catalog card styling, anchored to the top of the shell).
3. Use the **session tabs** under the panel header to switch conversations (same sessions as Laboratory; stays on the apps workspace — does not open Laboratory). Create or delete sessions only in Laboratory.
4. Type and send — messages go to the **selected** session tab.
5. When the agent uses **todo_list**, a **Tasks** bar appears under the session tabs; expanding it opens a **drop-shadow overlay** over the message area (same Dexie session as Laboratory; `text-xxs`).
6. When file tools run in the session, a **Files** bar (change count and +/- stats) uses the same overlay pattern over the chat column.
7. Use **Open Laboratory** in the panel header for long sessions, `@` file attachments, tool-call visibility, and the full Laboratory todo/file overlays, and repo-wide work.

**Collapse** stores your preference in Dexie (`sessionState.labSidecarExpanded`, same store as chat sessions and catalog toggles). **Show tools** is saved on the same `sessionState` record as `labSidecarShowToolResults`. When expanded, the app shell may inset horizontally so catalog and apps are not covered by the panel.

## Sidecar vs Laboratory

| | Lab Sidecar | Laboratory |
|---|-------------|------------|
| Where | Apps workspace (catalog + mounted apps) | Full-screen chat (quick nav or brand header) |
| Session | Same Dexie sessions; switch-only tabs in panel | Same sessions; full tab bar (+ New Chat, delete) |
| System prompt | Base template + **view context** appendix | Full template only |
| UI | User + assistant messages; **Thinking…** / rotating lab status while tools run. Tool calls hidden by default — **Show tools** (composer, next to Send) reveals grouped MCP results like Laboratory. | Full transcript with tool-call / MCP activity |
| Best for | “In this app / on this screen” questions, UI automation on visible UI | Files, deep planning, watching tool execution |

Personas and MCP tools are the same; only the system appendix and Sidecar UI differ.

## What the agent sees

Each Sidecar message appends **Lab Sidecar view context** to the system prompt:

| View | Meaning |
|------|--------|
| Apps home | Catalog only — no mounted app instructions. Sidecar appendix includes the **full enabled registry** (id, name, description by category) because the grid shows only **8 apps per category** until **Show all**. Launch via **UI automation** (`searchPattern` from the registry + **Launch** via `elementRef`), then **poll** until the tab/pane appears (up to **30s**). See [lab-ui-automation.md](lab-ui-automation.md). |
| Shell overlay (foreground) | When **Settings**, **Messages**, **Notifications**, **Quarks**, or **About** is open on the apps workspace, Sidecar context names that surface + sub-state (Settings tab, active DM partner, About topic, …). **UI automation** should target the overlay first; mounted apps remain as background context. |
| Single app | One mounted app + its instructions; Sidecar **in-app UI automation** targets the **focused** mount first. Catalog launch guidance is only for **additional** apps (compact launcher sidebar while tabs are open). |
| Split apps | Both visible apps’ instructions; **focused tab** is the default UI automation target; same sidebar launcher for additional apps |
| Full Laboratory | Sidecar context is not applied (full template) |

## Chat preview (removed)

The old **Chat Preview** peek was removed in **rm-57**. Dexie `labAssistantPreview` is cleared on next settings touch; use the Sidecar instead.

## Admin — activity status text

Owners and admins can edit Sidecar status copy under **Settings → Administration → Sidecar activity text**:

- **Thinking label** — shown before tool/MCP activity appears in the turn.
- **Working labels** — one phrase per line; rotated while tools run (hidden in the Sidecar transcript).
- **Rotation interval** — milliseconds between working-label changes (1500–15000).

Settings are stored in the main platform SQLite table `lab_sidecar_activity_settings` and loaded when the Sidecar chat panel mounts. **Reset to defaults** restores the built-in lab phrases.

## App developers — host context

Mounted apps run in a separate Vue app; the shell **re-provides** workspace context from `AppLifecycle`. In composables or setup:

```ts
import { useLabSidecar } from '@/shared/composables/useLabSidecar';

const sidecar = useLabSidecar();

// When the user opens a record, form, etc.
sidecar.setContext({ entityId: record.id, route: 'detail' });

// Optional: clear when leaving a screen (shell also clears on tab change)
sidecar.clearContext();
```

Host keys appear under **Host context** in the Sidecar system appendix. Keep values short strings (ids, slugs).

### Vs–Lab Assistant catalog games

During an active vs–Lab Assistant match, `useTurnBasedMatch` publishes `gameView`, `gameId`, `matchId`, and `gameDifficulty` host keys (see `lab-game-assistant-opponent.ts`). The shell keeps a **live match snapshot** (full human-visible `MatchView.state` JSON, full turn history, whose turn, scores) updated on each authoritative match tick; when you send Sidecar chat or when proactive **banter** runs, that snapshot is merged into the LLM turn only (your Dexie message stays plain text). When the user **opens** the Sidecar panel mid-match, the shell attaches the **Chat** persona tab (`LAB_GAME_SIDECAR_PERSONA`) — **one Dexie tab per catalog game id** (e.g. all chess matches reuse the same tab when it still exists; a new tab is created only the first time you play that game in Sidecar). Tab titles stay **`{gameId} vs Lab Assistant`** (first-message auto-rename is skipped for those sessions). Separate from in-game move turns on the app server.

**Reused game tabs:** when a **new match id** starts on an existing game tab, the shell **clears Dexie messages** for that tab first so prior-match banter does not linger in the panel. If the thread was non-trivial (≥10 messages) and still meets policy (context use ≥45% or message count ≥24), it may then run the same **Summarize context** pipeline as Laboratory (Chroma compacted to a `[SYSTEM SUMMARY]` turn) so long-running tabs do not grow without bound.

Sidecar instructions tell the assistant to comment on **important moments** and match end (not every move). Each banter completion includes an **authoritative facts block** (`Who just moved`, human vs Lab Assistant seats) plus voice rules: **PG, good-natured** table talk (wry and lightly competitive — no profanity, trash talk, or gloating threats); **first person** when the Lab Assistant just moved (never praise the human for your capture); **friendly opponent** when the human moved (no generic coach lines like “good move” on every capture). Catalog vs–Lab Assistant games register `detectBanterMoment`; when Sidecar is **expanded**, moments trigger **`labGameBanter`** on `SOCKET_EVENTS.MESSAGE` — a **Chat LLM** completion (ephemeral user turn, no Dexie user row, tools disabled for that turn, **`reasoningEffort: none`** so thinking models do not burn tokens on table talk). There is **no template fallback**; if banter does not appear, treat it as a bug (chat not ready, socket, session, or provider). Capture/check/end moments are not time-throttled; slow-turn nudges fire once per human turn after 45–90s (and at most about once per minute per match). Detectors set **`moverSeat`** on each moment (chess/checkers read the last turn-history entry). Detectors: `src/shared/game-platform/lab-assistant-banter/detectors/` (Connect Four includes **block** when an immediate win threat is stopped).

## App Builder profile

When **App Builder** mode is on (from **Settings → App Builder → Open App Builder in Sidecar**), Sidecar sends include `toolProfile: app_builder`. The panel subtitle shows **App Builder**; MCP tools are limited to App Management + catalog UI automation. See [lab-app-builder.md](lab-app-builder.md).

## Related

- Per-game banter audit and guardrails: [lab-sidecar-game-banter.md](lab-sidecar-game-banter.md)
- Shell terms: [lab-shell-terminology.md](lab-shell-terminology.md)
- App creation: [lab-app-builder.md](lab-app-builder.md)
- Team chat (separate product surface): [lab-messaging.md](lab-messaging.md)
- Plan: [plans/roadmap/rm-57-lab-sidecar.md](../../plans/roadmap/rm-57-lab-sidecar.md)
- Types: `src/shared/types/lab-sidecar-view-context.ts`
