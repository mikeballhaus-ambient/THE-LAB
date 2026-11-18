/** Drag payload for @vue-dnd-kit/core (palette copy + trigger reorder). */
export interface RuleEventDragBlock {
  dragId: string;
  eventType: string;
  label: string;
  description: string;
  isPalette?: boolean;
}
