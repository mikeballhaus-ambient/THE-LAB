export type LabWorkflowGraphSelection =
  | { kind: 'node'; nodeId: string }
  | { kind: 'edge'; edgeId: string }
  | null;
