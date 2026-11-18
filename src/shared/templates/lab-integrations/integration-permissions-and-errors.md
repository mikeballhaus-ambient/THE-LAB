# Integration tools — permissions and FORBIDDEN responses

Platform integration MCP tools enforce **the signed-in user’s** permissions (session `userId` — never another user). The agent cannot bypass this.

## When a tool returns `FORBIDDEN: …`

This is **not** a bug or transient failure. The current user is **not allowed** to perform that action on the **host app** (e.g. `app-lab-tasklist`).

**Do:**

1. **Stop** retrying the same write (provision stub, upsert/delete binding) for that user.
2. Explain in **plain, kind language** — no error codes, no “FORBIDDEN”, no JWT/API jargon.
3. Say **what they were trying to do** (e.g. wire forms for Task List) and **who can help**.

**Suggested user-facing framing (adapt to context):**

> I’m not able to change integrations for this app with your current access. Connecting forms and plugins requires **permission to update that app** (or an **owner/admin** on THE-LAB). Please ask someone with those rights to run this setup, or have an admin grant you **update** access for that app in **Settings → Users / app permissions**.

**Read vs write:**

| Intent | Typical tools | Who usually passes |
|--------|----------------|-------------------|
| See what’s wired (manifest, bindings) | `lab_integrations_get_manifest`, `lab_integrations_list_bindings` | Anyone who can **launch** the host app (or update it) |
| Change wiring (stubs, bindings) | `lab_integrations_provision_form_stub`, `lab_integrations_provision_chart_stub`, `lab_integrations_upsert_binding`, `lab_integrations_delete_binding` | **Owner/admin**, global **manage apps**, or **update** on that host app |

If **read** tools also return FORBIDDEN, the user likely cannot launch or view that app’s integration metadata — same kindness: they need appropriate app access from an admin.

**Do not:** blame the user, suggest workarounds that edit SQLite or skip tools, or impersonate a higher-privilege user.
