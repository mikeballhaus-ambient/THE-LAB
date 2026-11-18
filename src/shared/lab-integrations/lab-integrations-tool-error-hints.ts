/**
 * Agent-facing recovery hints for lab_integrations_* tool failures (MCP + enriched tool results).
 */
export function resolveLabIntegrationsToolFixHint(toolId: string, detail: string): string | null {
  const lower = detail.toLowerCase();

  if (
    toolId === 'lab_integrations_upsert_binding' &&
    lower.includes('binding already exists')
  ) {
    return [
      'A binding row already exists for this host + slot — upsert create was rejected.',
      'Call `lab_integrations_list_bindings` for the host, find the slot, then call upsert again with that row\'s `bindingId` to update `providerRef` / config.',
      '`overwrite` is **not** on upsert_binding. If you need a fresh stub form first, call `lab_integrations_provision_form_stub` with **`overwrite: true`** (boolean), then update the binding with the new `formKey` via `bindingId`.',
    ].join(' ');
  }

  if (
    toolId === 'lab_integrations_upsert_binding' &&
    lower.includes('forms builder has no published form')
  ) {
    return 'Run `lab_integrations_provision_form_stub` for this host slot first (use returned `formKey` as `providerRef`), then upsert with `bindingId` if the slot is already bound.';
  }

  if (
    toolId === 'lab_integrations_provision_form_stub' &&
    (lower.includes('form already exists') || (lower.includes('conflict') && lower.includes('form')))
  ) {
    return 'Re-run `lab_integrations_provision_form_stub` with **`overwrite: true`** (boolean, not the string `"true"`) to replace the stub from the hub model, then upsert the binding if `providerRef` changed.';
  }

  if (
    toolId === 'lab_integrations_provision_chart_stub' &&
    (lower.includes('chart already exists') || (lower.includes('conflict') && lower.includes('chart')))
  ) {
    return 'Re-run chart stub provision with **`overwrite: true`** if the tool supports it, or delete the existing chart binding/stub before reprovisioning.';
  }

  return null;
}

/** Optional suffix appended to raw MCP tool error text. */
export function appendLabIntegrationsAgentHint(toolId: string, detail: string): string {
  const hint = resolveLabIntegrationsToolFixHint(toolId, detail);
  if (!hint) {
    return detail;
  }
  return `${detail}\n\nAgent hint: ${hint}`;
}
