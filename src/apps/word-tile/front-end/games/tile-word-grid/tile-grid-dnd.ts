import type { useDnDProvider } from '@vue-dnd-kit/core';

export const TW_TILE_DND_GROUP = 'tw-tile';

/** vue-dnd-kit keeps grab-point offset on the preview; center under the pointer for board drops. */
export function centerTileDragPreview(provider: ReturnType<typeof useDnDProvider>): void {
  const ptr = provider.pointer.value;
  if (ptr) {
    ptr.offset = { x: 0.5, y: 0.5 };
  }
}

export type RackTileDrag = { kind: 'rack'; letter: string; rackIndex: number };

export type StagedTileDrag = { kind: 'staged'; letter: string; row: number; col: number };

export type TileDragPayload = RackTileDrag | StagedTileDrag;

export function isTileDragPayload(data: unknown): data is TileDragPayload {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const d = data as TileDragPayload;
  if (d.kind === 'rack') {
    return typeof d.letter === 'string' && typeof d.rackIndex === 'number';
  }
  if (d.kind === 'staged') {
    return typeof d.letter === 'string' && typeof d.row === 'number' && typeof d.col === 'number';
  }
  return false;
}

export interface BoardDropPayload {
  row: number;
  col: number;
}
