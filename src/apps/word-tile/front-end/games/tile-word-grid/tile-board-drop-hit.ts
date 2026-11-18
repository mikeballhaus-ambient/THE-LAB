import type { useDnDProvider } from '@vue-dnd-kit/core';

export interface BoardCellCoord {
  row: number;
  col: number;
}

/** Hit-test using the drag preview center (what the player aligns with the grid). */
export function boardCellAtPreviewCenter(
  boardRoot: HTMLElement | null,
  provider: ReturnType<typeof useDnDProvider>,
): BoardCellCoord | null {
  if (!boardRoot) {
    return null;
  }
  const pos = provider.preview.position.value;
  const size = provider.preview.size.value;
  if (!pos || !size?.width || !size?.height) {
    return null;
  }
  const cx = pos.x + size.width / 2;
  const cy = pos.y + size.height / 2;
  const stack = document.elementsFromPoint(cx, cy);
  const cell = stack
    .map((el) => el.closest('[data-tw-board-row]'))
    .find((el) => el && boardRoot.contains(el));
  if (!cell) {
    return null;
  }
  const row = Number(cell.getAttribute('data-tw-board-row'));
  const col = Number(cell.getAttribute('data-tw-board-col'));
  if (!Number.isFinite(row) || !Number.isFinite(col)) {
    return null;
  }
  return { row, col };
}
