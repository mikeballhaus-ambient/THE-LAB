import { ref } from 'vue';

/** Compact app launcher sidebar expanded (apps workspace). */
export const labCatalogSidebarExpanded = ref(true);

export function syncLabCatalogSidebarShellState(expanded: boolean): void {
  labCatalogSidebarExpanded.value = expanded;
}
