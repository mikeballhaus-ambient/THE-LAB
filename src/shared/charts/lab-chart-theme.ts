import { onMounted, onUnmounted, ref, type Ref } from 'vue';

/** Fallback when CSS vars are unavailable (tests, SSR). */
export const DEFAULT_CHART_SERIES_PALETTE = [
  '#6366f1',
  '#22d3ee',
  '#f59e0b',
  '#34d399',
  '#f472b6',
  '#94a3b8',
];

export interface LabChartThemeColors {
  title: string;
  legend: string;
  tick: string;
  grid: string;
  datalabel: string;
  datalabelOnSegment: string;
  datalabelBadgeBg: string;
}

export function readLabCssVar(tokenKey: string, fallback: string): string {
  const name = tokenKey.startsWith('--') ? tokenKey : `--lab-${tokenKey}`;
  if (typeof document === 'undefined') {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw || fallback;
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 3 && normalized.length !== 6) {
    return hex;
  }
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return hex;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Resolve theme colors to rgba for Chart.js fills and grids. */
export function chartColorWithAlpha(color: string, alpha: number): string {
  const trimmed = color.trim();
  if (trimmed.startsWith('rgba(')) {
    return trimmed;
  }
  if (trimmed.startsWith('rgb(')) {
    const inner = trimmed.slice(4, -1);
    return `rgba(${inner}, ${alpha})`;
  }
  if (trimmed.startsWith('#')) {
    return hexToRgba(trimmed, alpha);
  }
  return trimmed;
}

export function getLabChartSeriesPalette(): string[] {
  const candidates = [
    readLabCssVar('button-border', ''),
    readLabCssVar('button-bg', ''),
    readLabCssVar('button-bg-hover', ''),
    readLabCssVar('prime-primary-500', ''),
    readLabCssVar('prime-primary-600', ''),
    readLabCssVar('prime-surface-500', ''),
    readLabCssVar('prime-surface-400', ''),
  ].filter((c) => c.length > 0);

  const unique = [...new Set(candidates)];
  return unique.length >= 3 ? unique : [...DEFAULT_CHART_SERIES_PALETTE];
}

export function getLabChartThemeColors(): LabChartThemeColors {
  const generalText = readLabCssVar('general-text', '#0f172a');
  const generalTextMuted = readLabCssVar('general-text-muted', '#64748b');
  const generalBorder = readLabCssVar('general-border', '#cbd5e1');
  const surface900 = readLabCssVar('prime-surface-900', '#0f172a');
  const surface0 = readLabCssVar('prime-surface-0', '#ffffff');

  return {
    title: generalText,
    legend: generalTextMuted,
    tick: generalTextMuted,
    grid: chartColorWithAlpha(generalBorder, 0.35),
    datalabel: generalTextMuted,
    datalabelOnSegment: surface0,
    datalabelBadgeBg: chartColorWithAlpha(surface900, 0.55),
  };
}

/** Bump when `:root` theme classes or inline CSS vars change (live draft + save). */
export function useLabChartThemeSync(): { themeVersion: Ref<number> } {
  const themeVersion = ref(0);
  let observer: MutationObserver | undefined;

  onMounted(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }
    observer = new MutationObserver(() => {
      themeVersion.value += 1;
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
  });

  onUnmounted(() => {
    observer?.disconnect();
  });

  return { themeVersion };
}
