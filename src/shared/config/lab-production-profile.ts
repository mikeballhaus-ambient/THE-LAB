/** Staging/production deploy profile (**D-03**, **D-05**). */
export function isLabProductionProfile(): boolean {
  return process.env.LAB_PRODUCTION_PROFILE === '1';
}

/** Production profile disables developer-mode sysMsg (**D-03**). */
export function effectiveDeveloperMode(requested: boolean | undefined): boolean {
  if (isLabProductionProfile()) {
    return false;
  }
  return requested ?? false;
}
