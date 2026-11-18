export function generateChartKey(): string {
  const suffix = Math.random().toString(36).slice(2, 9);
  return `chart_${Date.now()}_${suffix}`;
}
