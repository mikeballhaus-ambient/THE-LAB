import { onMounted, ref, watch } from 'vue';
import { SessionManager } from '@/shared/composables/session/session-manager';

const sessionManager = new SessionManager();

/**
 * Expand/collapse for the running-apps rail shown beside the app catalog while
 * apps are parked (minimize feature). Mirrors the compact app launcher sidebar:
 * collapsed = narrow rail button, expanded = sliding panel. Dexie-backed.
 */
export function useLabRunningAppsRailPanel() {
  const expanded = ref(true);
  const persistenceReady = ref(false);

  onMounted(async () => {
    await sessionManager.init();
    expanded.value = await sessionManager.getLabRunningAppsRailExpanded();
    persistenceReady.value = true;
  });

  watch(expanded, async (isExpanded) => {
    if (!persistenceReady.value) {
      return;
    }
    await sessionManager.setLabRunningAppsRailExpanded(isExpanded);
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
