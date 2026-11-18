/**
 * Before **catalog Launch** discover with searchPattern, sync the apps-home toolbar search
 * so off-screen cards (8-per-section preview) mount in the DOM.
 * Only invoked from UIAutomationHandler when {@link isCatalogLaunchDiscoveryContext} is true
 * (not for in-app discover while a mounted app is open).
 */

const CATALOG_SEARCH_INPUT_SELECTOR = 'input.lab-catalog-search';
const CATALOG_LIST_CONTAINER_SELECTOR = '[class*="app-list-container"]';
const CATALOG_SIDEBAR_COLLAPSED_RAIL = 'button.lab-catalog-sidebar-rail';

function findCatalogSearchInput(): HTMLInputElement | null {
  const containers = document.querySelectorAll(CATALOG_LIST_CONTAINER_SELECTOR);
  for (const container of Array.from(containers)) {
    const input = container.querySelector(CATALOG_SEARCH_INPUT_SELECTOR);
    if (input instanceof HTMLInputElement) {
      const style = window.getComputedStyle(input);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return input;
      }
    }
  }
  return document.querySelector(CATALOG_SEARCH_INPUT_SELECTOR) as HTMLInputElement | null;
}

function dispatchInputEvents(input: HTMLInputElement): void {
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Applies search term to the catalog toolbar (Vue v-model). Returns true when a value was set. */
export function applyCatalogSearchForDiscovery(searchTerm: string): boolean {
  const term = searchTerm.trim();
  if (!term) return false;

  const input = findCatalogSearchInput();
  if (!input) return false;

  if (input.value.trim().toLowerCase() === term.toLowerCase()) {
    return false;
  }

  input.focus();
  input.value = term;
  dispatchInputEvents(input);
  return true;
}

/** Expands the compact app launcher sidebar when collapsed (running workspace). */
export function expandCollapsedCatalogSidebarIfNeeded(): boolean {
  const rail = document.querySelector(CATALOG_SIDEBAR_COLLAPSED_RAIL);
  if (!(rail instanceof HTMLButtonElement)) return false;
  if (rail.getAttribute('aria-expanded') === 'true') return false;
  const style = window.getComputedStyle(rail);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  rail.click();
  return true;
}

export function delayForCatalogDomRefresh(ms = 100): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
