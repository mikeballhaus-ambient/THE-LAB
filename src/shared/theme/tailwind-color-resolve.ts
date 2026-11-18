import {
  getTailwindPaletteHex,
  TAILWIND_COLOR_PALETTES,
  TAILWIND_COLOR_STEPS,
  type TailwindColorPalette,
  type TailwindColorPrefix,
  type TailwindColorStep,
} from '@/shared/theme/tailwind-color-catalog';

export interface TailwindColorSelection {
  palette: TailwindColorPalette;
  step: TailwindColorStep;
  /** 1–100; 100 means no `/NN` suffix in the displayed class. */
  opacityPercent: number;
}

function hexToRgbChannels(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return null;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return null;
  }
  return { r, g, b };
}

export function formatTailwindColorCss(
  hex: string,
  opacityPercent: number,
): string {
  const channels = hexToRgbChannels(hex);
  if (!channels) {
    return hex;
  }
  if (opacityPercent >= 100) {
    return hex;
  }
  const alpha = Math.min(1, Math.max(0, opacityPercent / 100));
  return `rgb(${channels.r} ${channels.g} ${channels.b} / ${alpha})`;
}

export function formatTailwindUtilityClass(
  prefix: TailwindColorPrefix,
  palette: TailwindColorPalette,
  step: TailwindColorStep,
  opacityPercent: number,
): string {
  const base = `${prefix}-${palette}-${step}`;
  if (opacityPercent >= 100) {
    return base;
  }
  const suffix = Math.round(opacityPercent);
  return `${base}/${suffix}`;
}

export function resolveTailwindColorUtility(
  _prefix: TailwindColorPrefix,
  palette: TailwindColorPalette,
  step: TailwindColorStep,
  opacityPercent = 100,
): string {
  const hex = getTailwindPaletteHex(palette, step);
  return formatTailwindColorCss(hex, opacityPercent);
}

function parseRgbCss(value: string): { r: number; g: number; b: number; alpha: number } | null {
  const modern = value.match(
    /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+))?\s*\)$/i,
  );
  if (modern) {
    return {
      r: Number(modern[1]),
      g: Number(modern[2]),
      b: Number(modern[3]),
      alpha: modern[4] !== undefined ? Number(modern[4]) : 1,
    };
  }
  const legacy = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (legacy) {
    return {
      r: Number(legacy[1]),
      g: Number(legacy[2]),
      b: Number(legacy[3]),
      alpha: legacy[4] !== undefined ? Number(legacy[4]) : 1,
    };
  }
  return null;
}

function channelsToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function findCatalogMatch(
  r: number,
  g: number,
  b: number,
): { palette: TailwindColorPalette; step: TailwindColorStep } | null {
  const target = channelsToHex(r, g, b).toLowerCase();
  for (const palette of TAILWIND_COLOR_PALETTES) {
    for (const step of TAILWIND_COLOR_STEPS) {
      const hex = getTailwindPaletteHex(palette, step).toLowerCase();
      if (hex === target) {
        return { palette, step };
      }
    }
  }
  return null;
}

function colorDistanceSq(r: number, g: number, b: number, hex: string): number {
  const channels = hexToRgbChannels(hex);
  if (!channels) {
    return Number.POSITIVE_INFINITY;
  }
  const dr = r - channels.r;
  const dg = g - channels.g;
  const db = b - channels.b;
  return dr * dr + dg * dg + db * db;
}

/** Best-effort picker state when stored CSS is not an exact catalog swatch. */
export function findNearestCatalogSelection(
  value: string,
): (TailwindColorSelection & { exact: boolean }) | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'transparent') {
    return null;
  }

  let r: number;
  let g: number;
  let b: number;
  let opacityPercent = 100;

  if (trimmed.startsWith('#')) {
    const channels = hexToRgbChannels(trimmed);
    if (!channels) {
      return null;
    }
    ({ r, g, b } = channels);
  } else {
    const rgb = parseRgbCss(trimmed);
    if (!rgb) {
      return null;
    }
    ({ r, g, b } = rgb);
    opacityPercent = rgb.alpha >= 0.999 ? 100 : Math.round(rgb.alpha * 100);
  }

  const exact = findCatalogMatch(r, g, b);
  if (exact) {
    return { ...exact, opacityPercent, exact: true };
  }

  let best: { palette: TailwindColorPalette; step: TailwindColorStep; dist: number } | null = null;
  for (const palette of TAILWIND_COLOR_PALETTES) {
    for (const step of TAILWIND_COLOR_STEPS) {
      const hex = getTailwindPaletteHex(palette, step);
      const dist = colorDistanceSq(r, g, b, hex);
      if (!best || dist < best.dist) {
        best = { palette, step, dist };
      }
    }
  }
  if (!best) {
    return null;
  }
  return { palette: best.palette, step: best.step, opacityPercent, exact: false };
}

export function parseTokenValueToUtility(value: string): TailwindColorSelection | null {
  const nearest = findNearestCatalogSelection(value);
  if (!nearest || !nearest.exact) {
    return null;
  }
  const { palette, step, opacityPercent } = nearest;
  return { palette, step, opacityPercent };
}
