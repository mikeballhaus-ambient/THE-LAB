/** Defaults for unauthenticated forms submit routes (rm-46 1.12 / O-02). */
export function resolveFormsPublicSubmitRateLimit(): { max: number; windowMs: number } {  const maxRaw = process.env.LAB_FORMS_PUBLIC_SUBMIT_MAX?.trim();
  const windowRaw = process.env.LAB_FORMS_PUBLIC_SUBMIT_WINDOW_MS?.trim();
  const max = maxRaw ? Number.parseInt(maxRaw, 10) : 60;
  const windowMs = windowRaw ? Number.parseInt(windowRaw, 10) : 60_000;
  return {
    max: Number.isFinite(max) && max > 0 ? max : 60,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000,
  };
}
