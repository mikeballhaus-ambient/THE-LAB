export type LabShellToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface LabShellToastPayload {
  severity: LabShellToastSeverity;
  summary: string;
  detail?: string;
  life?: number;
}