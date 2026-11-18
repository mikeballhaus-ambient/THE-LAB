# App Builder (platform v1)

**App Builder** helps owners and admins plan and scaffold THE-LAB apps from the **apps workspace** without opening full **Laboratory** first. It combines:

- **App Builder catalog app** (`app-lab-app-builder`) — guided wizard (name → description → icon → review)
- **Settings → Administration → App Builder** — same wizard
- **Continue with Lab Assistant** — new Sidecar chat tab + formatted consultation message (no registry create until you approve the plan)
- **Lab Sidecar** with `toolProfile: app_builder` — narrowed MCP allowlist
- **App Management MCP** — registry + scaffold + per-app DB helpers (after explicit approval)
- **Open Laboratory** — full tool surface for `src/apps/**` source edits (Code persona)

There is **no extra HTTP API** on port 3000 for v1.

## Who can use it

Owners and admins (`create-apps` global permission). App Management `create_app` enforces the same permission on the server.

## Guided wizard

1. **Name** — catalog display name.
2. **Describe** — what the app should do for users.
3. **Catalog section** — pick a platform catalog tag (Platform, Productivity, Builder, …) or **Recommend for me** so the Lab Assistant proposes tags during the chat.
4. **Icon** — search a curated Font Awesome list (`faIcon` registry style, e.g. `fa-hammer`).
5. **Review** — **Continue with Lab Assistant** opens Sidecar on a **new session**, sends a message tagged `[THE-LAB App Builder — new app consultation]`.

The wizard uses the same themed shell as Workflow Studio and other catalog apps (`platform-catalog-app.css`, `lab-form-runtime` controls).

The agent consults first (app type, proposed `app-*` id, scope, **which existing catalog apps to reuse**), then calls App Management only after you agree.

After scaffold, agents are instructed to use **Forms Builder** and **Chart Builder** via [lab-app-integrations](lab-app-integrations.md) (rm-64 bindings)—not hand-built inline forms or ad-hoc charts in the new host app.

## Sidecar tool profile (`app_builder`)

When active, the backend intersects the persona tool list with:

- All `app_management_*` tools
- `ui_automation_discover_elements`, `ui_automation_element_action`
- `awaiter` (catalog launch polling)

File/repo MCP tools (`read_file`, `update_file`, etc.) are **not** available in this profile. The system prompt appendix instructs the agent to direct users to **Open Laboratory** for code changes.

Session enforcement: narrowed allowlist is stored per chat `sessionId` for the duration of Sidecar turns with App Builder mode.

## Typical flow

1. Open **App Builder** from the catalog (or Settings → App Builder).
2. Complete the wizard → **Continue with Lab Assistant** (Sidecar opens, new session on **Code** persona).
3. Refine scope with the agent in Sidecar; approve a written plan.
4. Agent calls `app_management_create_app` with **`catalogTagIds` or `catalogTags` on the same call** (primary first). If the user chose **Recommend for me**, the agent must agree tag ids in chat, list them in the plan, then pass them on `create_app` — not only in prose. Then `update_app` / DB helpers as needed.
5. Optional: agent launches the new app via UI automation on the catalog.
6. For Vue/server implementation work → **Open Laboratory** (Code persona).

## Related

- [Lab Sidecar](lab-sidecar.md)
- [Lab domain events](lab-domain-events.md) — optional future `platform-app-builder.*` events (not v1)
- App registry rules: `.cursorrules` / `AGENTS.md` (App Management only for metadata)

## Out of scope (v1)

Visual app designer, codegen beyond template generator, Phase 3 catalog app integration patterns beyond the App Builder host itself.
