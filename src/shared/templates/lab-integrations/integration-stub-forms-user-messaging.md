# Integration stub forms — what to tell the user (rm-64)

**Critical:** `lab_integrations_upsert_binding` only saves registry wiring — it does **not** create Forms Builder rows. Always **`provision_form_stub` first** (or confirm forms exist in Forms Builder after **Refresh**). If bindings show “connected” but Forms Builder has zero forms/connectors, stubs were skipped — provision each slot, then tell the user to **Refresh** in Forms Builder.

**Critical:** `lab_integrations_provision_form_stub` does **not** create empty forms. It **autopopulates** a published form in Forms Builder from the host app’s **integration service entity model** (fields, types, **required**, **hidden** context keys such as task list id on tasks). Bindings only connect a Task List dialog slot to that form key.

## After bindings are saved — user-facing summary MUST include

1. **It should work in Task List now** — ask them to try **New List**, **New Task**, **Edit List**, **Edit Task** (launch **Forms Builder** too if launch deps require it).
2. **Forms are already filled in** — standard fields exist; they do **not** need to manually add name, title, status, etc. unless they want something custom.
3. **Forms Builder is optional** — open it only to change **layout**, labels, styling, validation tweaks, or extra fields. Say “edit appearance,” not “build the form from scratch.”
4. **Hidden context** — e.g. which list a task belongs to is supplied by Task List when the dialog opens; users do not type it on the form.
5. **Delete slots** (`*.delete.dialog`) — provision **confirm** stubs (Label + danger Delete/Remove buttons); runtime uses connector `crud.delete`, not field POST. Same bind flow as create/edit.

## Do NOT tell the user

- That stub forms are “empty shells” or “need fields added before they work.”
- That they must open Forms Builder and add required columns as step 1 after integration setup (unless a tool **failed** or bindings are missing — then diagnose with `list_bindings` first).
- Slot ids / binding UUIDs in plain-language summaries (use action names: “create list”, “edit task”).

## If discover shows bindings but user says forms are blank

1. Confirm `list_bindings` + host `app-lab-tasklist` (not wrong host id).
2. Forms Builder app running; relaunch Task List after deps change.
3. Offer **re-provision with overwrite** only if forms were never provisioned or connector model changed — not as default “empty shell” advice.

## If discover shows no bindings

Report gaps from manifest vs bindings (plain language). Offer to provision + bind; explain that provisioning **creates ready-to-use** forms, not blanks.

## After bindings were deleted

**Unbind (`lab_integrations_delete_binding`)** removes the binding, demotes host **dependencies** when unused, and **deletes the rm-64 stub form** (and orphan integration connector) when no other binding references the same `providerRef`. Hand-picked non-stub forms bound manually are **not** deleted (`not_integration_stub` in tool cleanup result).

To re-wire a slot: provision stub (`overwrite: true` if reusing the same `formKey`), then upsert binding again.
