import { CATALOG_HOST_APP_IDS } from '@/shared/lab-integrations/catalog-manifests';

/**
 * Phase 10 — what a greenfield lab must ship from committed seeds (not wizard drift).
 *
 * Bindings are authored in TypeScript (`*-binding-seeds.ts`) and applied on
 * `labIntegrationsRepository.initialize()`. Manifests sync from
 * `integration-manifest-seeds.ts` on apps bootstrap.
 */
export const LAB_INTEGRATION_SEED_PACK_VERSION = 1 as const;

/** Platform pilots + every Wave C catalog host that mounts Forms Builder / Chart Builder. */
const GOLDEN_PLATFORM_MANIFEST_HOST_IDS = [
  'app-lab-tasklist',
  'app-lab-helpdesk',
  'app-lab-crm',
  'app-lab-chartbuilder',
  'app-lab-formsbuilder',
  'app-lab-approvals-policies',
  'app-lab-financial-ledger',
] as const;

/** Platform pilots + all Wave C catalog hosts (includes `app-knowledge-base`). */
export const GOLDEN_INTEGRATION_MANIFEST_HOST_IDS: readonly string[] = [
  ...GOLDEN_PLATFORM_MANIFEST_HOST_IDS,
  ...CATALOG_HOST_APP_IDS.filter((id) => !GOLDEN_PLATFORM_MANIFEST_HOST_IDS.includes(id as never)),
];

/**
 * Hosts that render `LabIntegrationSurface` but are **not** Wave C catalog hosts, so their bindings
 * come from `pilot-host-binding-seeds.ts`, which resolves services from each host's own manifest
 * rather than `CATALOG_MANIFEST_SEEDS`.
 *
 * Wave A pilots: Task List, Help Desk.
 *
 * **Chart Builder is here because it is a provider that is also a host.** It ships
 * `chart.connector.create|edit|delete.dialog` on its own *Manage data connectors* view, but it is
 * neither in `CATALOG_HOST_APP_IDS` (so `catalog-binding-seeds.ts` skips it) nor in
 * `PLATFORM_CATALOG_HOSTS` (so `platform-catalog-binding-seeds.ts` skips it). Nothing seeded those
 * three slots, so every connector's **Edit** button opened an unbound-slot hint — while the slots
 * themselves were declared in the manifest and covered by tests. Adding it to this list is what
 * makes `catalogServiceDescriptor()` unnecessary: the contract is built from Chart Builder's own
 * manifest, exactly as for the pilots.
 */
export const GOLDEN_INTEGRATION_PILOT_HOST_IDS: readonly string[] = [
  'app-lab-tasklist',
  'app-lab-helpdesk',
  'app-lab-chartbuilder',
];

/** Hosts that must have at least one `lab_integration_bindings` row after seed sync. */
export const GOLDEN_INTEGRATION_BINDING_HOST_IDS: readonly string[] = [
  'app-lab-crm',
  ...GOLDEN_INTEGRATION_PILOT_HOST_IDS,
  ...CATALOG_HOST_APP_IDS,
];

/** CRM dialog slots seeded in `crm-integration-binding-seeds.ts` (smoke subset). */
export const GOLDEN_CRM_FORM_DIALOG_SLOTS: readonly string[] = [
  'crm.quotes.create.dialog',
  'crm.task.create.dialog',
  'crm.ticket.create.dialog',
];

export interface LabIntegrationSeedPackVerifyResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    bindingCount: number;
    manifestHostsChecked: number;
    bindingHostsChecked: number;
  };
}
