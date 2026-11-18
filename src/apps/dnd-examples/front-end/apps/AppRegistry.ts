export interface AppRegistryEntry {
  id: string;
  name: string;
  description: string;
}

export const APP_REGISTRY: readonly AppRegistryEntry[] = [
  { id: 'activation', name: 'Activation', description: 'Triggers on drag start, over, drop or leave events' },
  { id: 'animation', name: 'Animation', description: 'Smooth animations for draggable items and zones' },
  { id: 'autoscroll', name: 'AutoScroll', description: 'Automatically scrolls list when dragging near edges' },
  { id: 'basedrop', name: 'BaseDrop', description: 'Basic drag-and-drop with zone validation' },
  { id: 'changingoverlay', name: 'ChangingOverlay', description: 'Dynamic overlay changes based on dragged element type' },
  { id: 'checkers', name: 'Checkers', description: 'Classic checkers game with piece movement rules' },
  { id: 'chess', name: 'Chess', description: 'Full chess implementation with move validation' },
  { id: 'constraintarea', name: 'ConstraintArea', description: 'Drag items within defined boundary constraints' },
  { id: 'copy', name: 'Copy', description: 'Clone draggable item to drop zone instead of moving' },
  { id: 'customoverlay', name: 'CustomOverlay', description: 'Context-aware overlays showing related tasks or notes' },
  { id: 'disabled', name: 'Disabled', description: 'Toggleable drag-and-drop zones and items' },
  { id: 'draggablezone', name: 'DraggableZone', description: 'Nested zones with hierarchical item management' },
  { id: 'draghandle', name: 'DragHandle', description: 'Multi-handle dragging for grouped elements' },
  { id: 'groups', name: 'Groups', description: 'Group items together and move as a unit' },
  { id: 'groupvalidation', name: 'GroupValidation', description: 'Validate group composition before allowing drop' },
  { id: 'keyboard', name: 'Keyboard', description: 'Full keyboard navigation for drag-and-drop' },
  { id: 'modifier', name: 'Modifier', description: 'Shift/Ctrl modifiers enable multi-selection dragging' },
  { id: 'multiselection', name: 'MultiSelection', description: 'Select and move multiple items simultaneously' },
  { id: 'overlaytransition', name: 'OverlayTransition', description: 'Smooth transitions between overlay states' },
  { id: 'promisedrop', name: 'PromiseDrop', description: 'Async drop operations with loading feedback' },
  { id: 'snapgrid', name: 'SnapGrid', description: 'Snaps items to grid positions during drag' },
  { id: 'sortinglists', name: 'SortingLists', description: 'Sort items within list columns by dragging' },
  { id: 'swap', name: 'Swap', description: 'Exchange items between two zones with animation' },
  { id: 'tree', name: 'Tree', description: 'Nested tree structure with expand/collapse drag support' },
];

export function findAppById(id: string): AppRegistryEntry | undefined {
  return APP_REGISTRY.find(entry => entry.id === id);
}
