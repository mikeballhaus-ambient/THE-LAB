/**
 * Persona activate/response run in-process via `/workflow/*` handlers (no external orchestrator).
 */
export function isLabPersonaDirectWorkflow(): boolean {
  const v = process.env.LAB_PERSONA_DIRECT_WORKFLOW;
  return v === '1' || v === 'true';
}

/** Use in-process `/workflow/*` handlers (default; set LAB_PERSONA_DIRECT_WORKFLOW=0 to opt out if added later). */
export function shouldUsePersonaDirectWorkflow(): boolean {
  if (process.env.LAB_PERSONA_DIRECT_WORKFLOW === '0' || process.env.LAB_PERSONA_DIRECT_WORKFLOW === 'false') {
    return false;
  }
  return true;
}
