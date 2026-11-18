/** Default PrimeIcon when an entity has no icon (pi icon name without `pi` prefix). */
export const DEFAULT_ENTITY_ICON = 'pi-database';

/**
 * Normalizes stored icon values (`pi-users`, `pi pi-users`) to PrimeIcons class list.
 */
export function normalizeEntityIconClass(icon?: string | null): string {
  const raw = icon?.trim();
  if (!raw) {
    return `pi ${DEFAULT_ENTITY_ICON}`;
  }
  if (raw.startsWith('pi ')) {
    return raw;
  }
  if (raw.startsWith('pi-')) {
    return `pi ${raw}`;
  }
  return `pi pi-${raw.replace(/^pi-?/, '')}`;
}

/** PrimeVue Button `icon` prop (e.g. `pi pi-users`). */
export function entityIconForPrimeButton(icon?: string | null): string {
  return normalizeEntityIconClass(icon);
}
