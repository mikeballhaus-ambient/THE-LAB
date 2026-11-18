/** Palette drag payloads for the workflow graph designer (vue-dnd-kit). */

export interface LabWorkflowGraphLayoutPaletteBlock {
  dragId: string;
  /**
   * `schedule_trigger` creates (or converts) the trigger node into a scheduled one. It is offered
   * beside the event palette so a graph can be **started** from a schedule rather than only edited
   * into one — "I have no event, the clock is the trigger" is a legitimate first thought.
   */
  layoutKind: 'condition' | 'new_rule' | 'group' | 'rule_group' | 'schedule_trigger';
  label: string;
  description: string;
  isPalette: true;
}

/** Drag from App data (integrations) — adds a lookup condition node. */
export interface LabWorkflowGraphIntegrationDataPaletteBlock {
  dragId: string;
  providerAppId: string;
  serviceId: string;
  label: string;
  description: string;
  isPalette: true;
}

/** Drag from Connector writes — create or update step action node. */
export interface LabWorkflowGraphConnectorWritePaletteBlock {
  dragId: string;
  mode: 'create' | 'update';
  providerAppId: string;
  serviceId: string;
  label: string;
  description: string;
  isPalette: true;
}
