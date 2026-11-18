/** Drag payload for workflow canvas event nodes (palette + trigger). */
export interface WorkflowCanvasEventBlock {
  dragId: string;
  eventType: string;
  label: string;
  description: string;
  isPalette?: boolean;
}

export interface WorkflowCanvasRulePaletteBlock {
  dragId: string;
  ruleId: string;
  label: string;
  description: string;
  isPalette: true;
}

export interface WorkflowCanvasActionPaletteBlock {
  dragId: string;
  /**
   * Mirrors `WorkflowActionPaletteKind`. Declared structurally rather than imported to keep this
   * type module dependency-free; the two are checked against each other where the palette is built.
   */
  kind:
    | 'set_fields'
    | 'code'
    | 'rename_fields'
    | 'date_time'
    | 'filter_items'
    | 'sort_items'
    | 'if_condition'
    | 'switch_condition'
    | 'split_out'
    | 'merge_items'
    | 'loop'
    | 'wait'
    | 'lab_query_app'
    | 'integration_delete'
    | 'raise_approval'
    | 'ledger_post_entry'
    | 'http_request'
    | 'notify_users'
    | 'comms_system_dm_payload_user'
    | 'publish_event';
  label: string;
  description: string;
  isPalette: true;
}

export interface WorkflowCanvasNewRulePaletteBlock {
  dragId: string;
  kind: 'new_rule_placeholder';
  label: string;
  description: string;
  isPalette: true;
}
