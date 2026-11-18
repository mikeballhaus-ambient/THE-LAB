/** Percent widths for palette | canvas | sidebar — must sum to 100. */
export type LabWorkflowDesignerPanelSizes = [number, number, number];

export interface LabWorkflowDesignerLayoutPersistence {
  panelSizes: LabWorkflowDesignerPanelSizes;
}

export const DEFAULT_LAB_WORKFLOW_DESIGNER_PANEL_SIZES: LabWorkflowDesignerPanelSizes = [16, 68, 16];

export function cloneLabWorkflowDesignerLayoutPersistence(
  value: LabWorkflowDesignerLayoutPersistence,
): LabWorkflowDesignerLayoutPersistence {
  return {
    panelSizes: [value.panelSizes[0], value.panelSizes[1], value.panelSizes[2]],
  };
}

export function normalizeLabWorkflowDesignerPanelSizes(
  sizes: number[] | undefined,
): LabWorkflowDesignerPanelSizes {
  if (!sizes || sizes.length !== 3) {
    return [...DEFAULT_LAB_WORKFLOW_DESIGNER_PANEL_SIZES];
  }
  const palette = clampPanelSize(sizes[0]);
  const canvas = clampCanvasSize(sizes[1]);
  const sidebar = clampPanelSize(sizes[2]);
  const sum = palette + canvas + sidebar;
  if (sum < 90 || sum > 110) {
    return [...DEFAULT_LAB_WORKFLOW_DESIGNER_PANEL_SIZES];
  }
  return [palette, canvas, sidebar];
}

function clampPanelSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_LAB_WORKFLOW_DESIGNER_PANEL_SIZES[0];
  }
  return Math.min(45, Math.max(8, Math.round(value)));
}

function clampCanvasSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_LAB_WORKFLOW_DESIGNER_PANEL_SIZES[1];
  }
  return Math.min(80, Math.max(20, Math.round(value)));
}
