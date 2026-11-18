import type { Card } from './useKlondike';

export type KlondikeDragSource =
  | { kind: 'waste' }
  | { kind: 'tableau'; col: number; fromIndex: number };

export function isKlondikeDragSource(data: unknown): data is KlondikeDragSource {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const d = data as KlondikeDragSource;
  if (d.kind === 'waste') {
    return true;
  }
  if (d.kind === 'tableau') {
    return typeof d.col === 'number' && typeof d.fromIndex === 'number';
  }
  return false;
}

export function klondikeDragKey(source: KlondikeDragSource): string {
  if (source.kind === 'waste') {
    return 'waste';
  }
  return `t-${source.col}-${source.fromIndex}`;
}

export type KlondikeDropTarget =
  | { kind: 'foundation'; index: number }
  | { kind: 'tableau'; col: number };

export function dropTargetId(target: KlondikeDropTarget): string {
  if (target.kind === 'foundation') {
    return `f-${target.index}`;
  }
  return `t-${target.col}`;
}

export function parseDropZoneId(zoneId: string): KlondikeDropTarget | null {
  if (zoneId.startsWith('f-')) {
    const index = Number.parseInt(zoneId.slice(2), 10);
    if (Number.isNaN(index)) {
      return null;
    }
    return { kind: 'foundation', index };
  }
  if (zoneId.startsWith('t-')) {
    const col = Number.parseInt(zoneId.slice(2), 10);
    if (Number.isNaN(col)) {
      return null;
    }
    return { kind: 'tableau', col };
  }
  return null;
}

export type { Card };
