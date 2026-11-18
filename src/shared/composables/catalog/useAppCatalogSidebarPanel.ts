import { onMounted, ref, watch } from 'vue';
import { syncLabCatalogSidebarShellState } from '@/shared/composables/lab-catalog-sidebar/lab-catalog-sidebar-shell-state';
import { SessionManager } from '@/shared/composables/session/session-manager';

const sessionManager = new SessionManager();

/** Expand/collapse for compact app catalog sidebar (Dexie-backed). */
export function useAppCatalogSidebarPanel() {
  const expanded = ref(true);
  const persistenceReady = ref(false);

  onMounted(async () => {
    await sessionManager.init();
    expanded.value = await sessionManager.getLabCatalogSidebarExpanded();
    syncLabCatalogSidebarShellState(expanded.value);
    persistenceReady.value = true;
  });

  watch(expanded, async (isExpanded) => {
    syncLabCatalogSidebarShellState(isExpanded);
    if (!persistenceReady.value) {
      return;
    }
    await sessionManager.setLabCatalogSidebarExpanded(isExpanded);
  });

  function expand(): void {
    expanded.value = true;
  }

  function collapse(): void {
    expanded.value = false;
  }

  function toggle(): void {
    expanded.value = !expanded.value;
  }

  return { expanded, expand, collapse, toggle };
}
