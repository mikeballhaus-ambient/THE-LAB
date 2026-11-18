import { onMounted, ref } from 'vue';
import type { SplitterResizeEndEvent } from 'primevue/splitter';
import { SessionManager } from '@/shared/composables/session/session-manager';
import {
  DEFAULT_LAB_WORKFLOW_DESIGNER_PANEL_SIZES,
  normalizeLabWorkflowDesignerPanelSizes,
  type LabWorkflowDesignerPanelSizes,
} from '@/shared/types/lab-workflow-designer-layout';

const sessionManager = new SessionManager();

/** Resizable palette | canvas | sidebar widths (Dexie sessionState). */
export function useLabWorkflowDesignerSplitter() {
  const panelSizes = ref<LabWorkflowDesignerPanelSizes>([...DEFAULT_LAB_WORKFLOW_DESIGNER_PANEL_SIZES]);
  /** False until Dexie has been read — Splitter mounts after so PrimeVue picks up saved :size props. */
  const layoutReady = ref(false);
  let persistenceReady = false;

  onMounted(async () => {
    await sessionManager.init();
    const stored = await sessionManager.getLabWorkflowDesignerLayout();
    if (stored?.panelSizes) {
      panelSizes.value = normalizeLabWorkflowDesignerPanelSizes(stored.panelSizes);
    }
    layoutReady.value = true;
    persistenceReady = true;
  });

  async function persistPanelSizes(sizes: LabWorkflowDesignerPanelSizes): Promise<void> {
    if (!persistenceReady) {
      return;
    }
    await sessionManager.setLabWorkflowDesignerLayout({ panelSizes: sizes });
  }

  function onSplitterResizeEnd(event: SplitterResizeEndEvent): void {
    const normalized = normalizeLabWorkflowDesignerPanelSizes(event.sizes);
    panelSizes.value = normalized;
    void persistPanelSizes(normalized);
  }

  return {
    panelSizes,
    layoutReady,
    onSplitterResizeEnd,
  };
}
