/** rm-46 **5.6** — optional JSON log lines + request correlation. */
export function isStructuredLoggingEnabled(): boolean {
  const raw = process.env.LAB_STRUCTURED_LOGS?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}
