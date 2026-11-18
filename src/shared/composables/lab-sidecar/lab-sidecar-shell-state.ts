import { computed, ref } from 'vue';

/** Shared shell inset state (single Sidecar instance at dashboard level). */
export const labSidecarExpanded = ref(false);
export const labSidecarPanelWidthPx = ref(400);

/** Content inset only when panel is open (collapsed rail sits in top-right chrome). */
export const labSidecarInsetPx = computed(() =>
  labSidecarExpanded.value ? labSidecarPanelWidthPx.value : 0,
);

export function syncLabSidecarShellState(expanded: boolean, panelWidthPx: number): void {
  labSidecarExpanded.value = expanded;
  labSidecarPanelWidthPx.value = panelWidthPx;
}

/** Open the dashboard Sidecar panel (updates shared shell state; `useLabSidecarPanel` mirrors this). */
export function openLabSidecarPanel(panelWidthPx = labSidecarPanelWidthPx.value): void {
  syncLabSidecarShellState(true, panelWidthPx);
}
