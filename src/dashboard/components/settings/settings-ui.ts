/** Shared Settings chrome — tiered tabs for visual hierarchy (rm-49 → theme tokens). */

const TAB_BASE = 'border-t-0! border-b-2!';

function tier1Tab(isActive: boolean): string {
  if (isActive) {
    return 'text-lab-general-text! bg-lab-general-bg! border-b-lab-button-border! shadow-sm!';
  }
  return 'text-lab-general-text-muted! bg-transparent! border-b-lab-general-border! hover:text-lab-general-text! hover:bg-lab-prime-surface-200/50!';
}

function tier2Tab(isActive: boolean): string {
  if (isActive) {
    return 'text-lab-general-text! bg-lab-general-bg! border-b-lab-button-border!';
  }
  return 'text-lab-general-text-muted! bg-transparent! border-b-transparent! hover:text-lab-general-text! hover:bg-lab-prime-surface-200/40!';
}

function tier3Tab(isActive: boolean): string {
  if (isActive) {
    return 'text-lab-general-text! bg-lab-general-bg! border-b-lab-button-border!';
  }
  return 'text-lab-general-text-muted! bg-transparent! border-b-transparent! hover:text-lab-general-text! hover:bg-lab-prime-surface-200/35!';
}

const TAB_ACTIVE =
  'text-lab-general-text! bg-lab-prime-surface-200/55! border-lab-button-border!';
const TAB_INACTIVE =
  'text-lab-general-text-muted! bg-transparent! border-lab-general-border! hover:text-lab-general-text! hover:bg-lab-prime-surface-200/40! hover:border-lab-general-border!';

/** Top row: SYSTEM / USER MANAGEMENT / … */
export function settingsTabClassTier1(isActive: boolean): string {
  return `${TAB_BASE} ${tier1Tab(isActive)}`;
}

/** System section: API / Personas / … */
export function settingsTabClassTier2(isActive: boolean): string {
  return `${TAB_BASE} ${tier2Tab(isActive)}`;
}

/** In-panel tabs: Chat LLM / Embedding LLM */
export function settingsTabClassTier3(isActive: boolean): string {
  return `${TAB_BASE} ${tier3Tab(isActive)}`;
}

/** @deprecated Prefer tier helpers; default tier 2 for nested persona property tabs */
export function settingsTabClass(isActive: boolean): string {
  return settingsTabClassTier2(isActive);
}

/** Persona list tabs (vertical rail) */
export function settingsTabClassVertical(isActive: boolean): string {
  const base = 'border-t-0! border-r-2!';
  return `${base} ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`;
}

export const settingsTablistTier1PtClass =
  'lab-settings-tablist-tier-1 w-full! justify-between! gap-1!';

export const settingsTablistTier2PtClass =
  'lab-settings-tablist-tier-2 w-full! justify-between! gap-0.5!';

export const settingsTablistTier3PtClass =
  'lab-settings-tablist-tier-3 w-full! flex-1! gap-0.5!';

/** Content below tier-1 tabs */
export const settingsMainTabPanelsPtClass =
  'flex! flex-1! min-h-0! overflow-hidden! lab-settings-tabpanels-tier-1 w-full!';

/** Content below tier-2 (system) tabs */
export const settingsSystemTabPanelsPtClass =
  'flex! flex-1! min-h-0! overflow-hidden! lab-settings-tabpanels-tier-2 w-full!';

/** @deprecated Use tier-specific panel classes */
export const settingsTabPanelsPtClass = settingsMainTabPanelsPtClass;

export const settingsTabPanelsTier3PtClass =
  'h-full! flex-1! lab-settings-tabpanels-tier-3 pt-2!';

export const settingsNestedTabPanelsPtClass =
  'flex! flex-1! w-full! h-full! lab-settings-nested-tabpanels';
