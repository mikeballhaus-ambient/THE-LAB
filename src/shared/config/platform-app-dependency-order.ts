/** Hybrid apps that must be up before CRM / Task List / Help Desk UI (forms + chart render). */
export const PLATFORM_INFRASTRUCTURE_APP_IDS = [
  'app-lab-formsbuilder',
  'app-lab-chartbuilder',
] as const;

export const CANONICAL_CRM_DEPENDENCIES = [
  'app-lab-formsbuilder',
  'app-lab-chartbuilder',
  'app-lab-tasklist',
  'app-lab-helpdesk',
] as const;

export const CANONICAL_REPORTING_APP_DEPENDENCIES = [
  'app-lab-formsbuilder',
  'app-lab-chartbuilder',
] as const;

/** Article forms + report charts (same providers as Help Desk reporting surfaces). */
export const CANONICAL_KNOWLEDGE_BASE_DEPENDENCIES = CANONICAL_REPORTING_APP_DEPENDENCIES;

export const CANONICAL_CRM_OPTIONAL_DEPENDENCIES = [
  'app-lab-approvals-policies',
  'app-lab-financial-ledger',
] as const;

/**
 * rm-64 §30.8 — Knowledge Base is a platform app and warms on boot.
 *
 * Launch deps: Forms Builder + Chart Builder (`syncKnowledgeBaseReportingDependencies`).
 */
export const KNOWLEDGE_BASE_PLATFORM_APP_ID = 'app-knowledge-base';

/** Infrastructure apps first, then remaining deps in their original order. */
export function orderDependenciesForLaunch(dependencyIds: readonly string[]): string[] {
  const infra = PLATFORM_INFRASTRUCTURE_APP_IDS.filter((id) => dependencyIds.includes(id));
  const rest = dependencyIds.filter(
    (id) => !(PLATFORM_INFRASTRUCTURE_APP_IDS as readonly string[]).includes(id),
  );
  return [...infra, ...rest];
}

export function mergeDependenciesCanonical(
  existing: string[],
  canonical: readonly string[],
): string[] {
  const set = new Set(existing);
  for (const id of canonical) {
    set.add(id);
  }
  return canonical.filter((id) => set.has(id));
}
