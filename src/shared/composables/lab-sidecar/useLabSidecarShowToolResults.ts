import { onMounted, ref, watch } from 'vue';
import { SessionManager } from '@/shared/composables/session/session-manager';
import { labDB } from '@/shared/types/lab-db';

const LEGACY_LOCAL_STORAGE_KEY = 'lab-sidecar-show-tool-results';

const sessionManager = new SessionManager();

function readLegacyLocal(): boolean | null {
  try {
    const raw = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    if (raw === null) return null;
    return raw === '1';
  } catch {
    return null;
  }
}

function clearLegacyLocal(): void {
  try {
    localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Sidecar composer — show grouped MCP tool results in the transcript (Dexie sessionState). */
export function useLabSidecarShowToolResults() {
  const showToolResults = ref(false);
  const persistenceReady = ref(false);

  onMounted(async () => {
    await sessionManager.init();
    const record = await labDB.sessionState.get('sessions');
    const legacy = readLegacyLocal();
    if (record?.labSidecarShowToolResults === undefined && legacy !== null) {
      showToolResults.value = legacy;
      await sessionManager.setLabSidecarShowToolResults(legacy);
      clearLegacyLocal();
    } else {
      showToolResults.value = await sessionManager.getLabSidecarShowToolResults();
      if (legacy !== null) {
        clearLegacyLocal();
      }
    }
    persistenceReady.value = true;
  });

  watch(showToolResults, async (on) => {
    if (!persistenceReady.value) return;
    await sessionManager.setLabSidecarShowToolResults(on);
  });

  function toggleShowToolResults(): void {
    showToolResults.value = !showToolResults.value;
  }

  return {
    showToolResults,
    toggleShowToolResults,
  };
}
