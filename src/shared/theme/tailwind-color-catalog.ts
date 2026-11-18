/** Tailwind v3 default scales (rm-49 Phase 9). `mist` mirrors `slate` (legacy alias). */
export const TAILWIND_COLOR_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

export type TailwindColorStep = (typeof TAILWIND_COLOR_STEPS)[number];

export const TAILWIND_COLOR_PALETTES = ['slate', 'gray', 'cyan', 'indigo', 'stone', 'mist'] as const;
export type TailwindColorPalette = (typeof TAILWIND_COLOR_PALETTES)[number];

export type TailwindColorPrefix = 'bg' | 'text' | 'border';

const SLATE_SCALE: Record<TailwindColorStep, string> = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
};

const GRAY_SCALE: Record<TailwindColorStep, string> = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
  950: '#030712',
};

const CYAN_SCALE: Record<TailwindColorStep, string> = {
  50: '#ecfeff',
  100: '#cffafe',
  200: '#a5f3fc',
  300: '#67e8f9',
  400: '#22d3ee',
  500: '#06b6d4',
  600: '#0891b2',
  700: '#0e7490',
  800: '#155e75',
  900: '#164e63',
  950: '#083344',
};

const INDIGO_SCALE: Record<TailwindColorStep, string> = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b',
};

const STONE_SCALE: Record<TailwindColorStep, string> = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e7e5e4',
  300: '#d6d3d1',
  400: '#a8a29e',
  500: '#78716c',
  600: '#57534e',
  700: '#44403c',
  800: '#292524',
  900: '#1c1917',
  950: '#0c0a09',
};

export function getTailwindPaletteHex(
  palette: TailwindColorPalette,
  step: TailwindColorStep,
): string {
  const scale =
    palette === 'gray'
      ? GRAY_SCALE
      : palette === 'cyan'
        ? CYAN_SCALE
        : palette === 'indigo'
          ? INDIGO_SCALE
          : palette === 'stone'
            ? STONE_SCALE
            : SLATE_SCALE;
  return scale[step];
}
