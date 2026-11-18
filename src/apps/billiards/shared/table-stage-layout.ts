import { CUE_VISUAL_LENGTH_PX, TABLE_HEIGHT, TABLE_WIDTH } from './billiards-types';
import { clampBallCenterToCushions } from './table-playfield';

export { STAGE_HEIGHT, STAGE_WIDTH } from './billiards-types';

/** SVG viewBox = table coordinates (playfield only; stage chrome is CSS padding). */
export const STAGE_VIEW_BOX = `0 0 ${TABLE_WIDTH} ${TABLE_HEIGHT}`;

/** Symmetric gutter so the full cue shaft can render outside the felt bounds. */
export const CUE_AIM_GUTTER_PX = CUE_VISUAL_LENGTH_PX;

export const CUE_AIM_VIEW_BOX = `${-CUE_AIM_GUTTER_PX} ${-CUE_AIM_GUTTER_PX} ${
  TABLE_WIDTH + 2 * CUE_AIM_GUTTER_PX
} ${TABLE_HEIGHT + 2 * CUE_AIM_GUTTER_PX}`;

const CUE_OVERLAY_WIDTH = TABLE_WIDTH + 2 * CUE_AIM_GUTTER_PX;
const CUE_OVERLAY_HEIGHT = TABLE_HEIGHT + 2 * CUE_AIM_GUTTER_PX;

/** Position cue handles on the expanded cue overlay (not the playfield box). */
export function tablePointToCueOverlayPercent(point: { x: number; y: number }): {
  left: string;
  top: string;
} {
  return {
    left: `${((point.x + CUE_AIM_GUTTER_PX) / CUE_OVERLAY_WIDTH) * 100}%`,
    top: `${((point.y + CUE_AIM_GUTTER_PX) / CUE_OVERLAY_HEIGHT) * 100}%`,
  };
}

export function tablePointToStagePercent(point: { x: number; y: number }): {
  left: string;
  top: string;
} {
  return {
    left: `${(point.x / TABLE_WIDTH) * 100}%`,
    top: `${(point.y / TABLE_HEIGHT) * 100}%`,
  };
}

export function tableSizeToStagePercentWidth(tablePx: number): string {
  return `${(tablePx / TABLE_WIDTH) * 100}%`;
}

export function tableSizeToStagePercentHeight(tablePx: number): string {
  return `${(tablePx / TABLE_HEIGHT) * 100}%`;
}

/** Map pointer position within the playfield element to table coordinates. */
export function tablePointFromStageClientRect(
  playfieldRect: DOMRect,
  clientX: number,
  clientY: number,
  options?: { clampToFelt?: boolean },
): { x: number; y: number } {
  const relX = (clientX - playfieldRect.left) / playfieldRect.width;
  const relY = (clientY - playfieldRect.top) / playfieldRect.height;
  let x = relX * TABLE_WIDTH;
  let y = relY * TABLE_HEIGHT;
  if (options?.clampToFelt) {
    const clamped = clampBallCenterToCushions(x, y);
    x = clamped.x;
    y = clamped.y;
  }
  return { x, y };
}
