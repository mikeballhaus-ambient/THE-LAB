import { onMounted, ref, watch } from 'vue';
import {
  labSidecarExpanded,
  labSidecarPanelWidthPx,
  syncLabSidecarShellState,
} from '@/shared/composables/lab-sidecar/lab-sidecar-shell-state';
import { SessionManager } from '@/shared/composables/session/session-manager';
import { labDB } from '@/shared/types/lab-db';

/** @deprecated Migrated to Dexie `sessionState.labSidecarExpanded` */
const LEGACY_LOCAL_STORAGE_KEY = 'lab-sidecar-expanded';

const DEFAULT_WIDTH_PX = 400;
const MIN_WIDTH_PX = 320;
const MAX_WIDTH_PX = 520;

const sessionManager = new SessionManager();

function readLegacyLocalExpanded(): boolean | null {
  try {
    const raw = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    if (raw === null) return null;
    return raw === '1';
  } catch {
    return null;
  }
}

function clearLegacyLocalExpanded(): void {
  try {
    localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Expand/collapse + width for Lab Sidecar shell (rm-57.1.2). */
export function useLabSidecarPanel() {
  const expanded = ref(false);
  const panelWidthPx = ref(DEFAULT_WIDTH_PX);
  const persistenceReady = ref(false);

  onMounted(async () => {
    await sessionManager.init();
    const record = await labDB.sessionState.get('sessions');
    const legacy = readLegacyLocalExpanded();
    if (record?.labSidecarExpanded === undefined && legacy !== null) {
      expanded.value = legacy;
      await sessionManager.setLabSidecarExpanded(legacy);
      clearLegacyLocalExpanded();
    } else {
      expanded.value = await sessionManager.getLabSidecarExpanded();
      if (legacy !== null) {
        clearLegacyLocalExpanded();
      }
    }
    syncLabSidecarShellState(expanded.value, panelWidthPx.value);
    persistenceReady.value = true;
  });

  watch(labSidecarExpanded, (isExpanded) => {
    if (expanded.value !== isExpanded) {
      expanded.value = isExpanded;
    }
  });

  watch(labSidecarPanelWidthPx, (width) => {
    const clamped = Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, Math.round(width)));
    if (panelWidthPx.value !== clamped) {
      panelWidthPx.value = clamped;
    }
  });

  watch(
    [expanded, panelWidthPx],
    async ([isExpanded, width]) => {
      syncLabSidecarShellState(isExpanded, width);
      if (!persistenceReady.value) return;
      await sessionManager.setLabSidecarExpanded(isExpanded);
    },
  );

  function expand(): void {
    expanded.value = true;
  }

  function collapse(): void {
    expanded.value = false;
  }

  function toggle(): void {
    expanded.value = !expanded.value;
  }

  function setPanelWidthPx(width: number): void {
    panelWidthPx.value = Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, Math.round(width)));
  }

  return {
    expanded,
    panelWidthPx,
    expand,
    collapse,
    toggle,
    setPanelWidthPx,
  };
}
