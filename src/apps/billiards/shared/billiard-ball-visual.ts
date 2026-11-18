/** Standard pool ball colors (solids 1–7 match stripes 9–15). */
const SOLID_COLORS: Readonly<Record<number, string>> = {
  1: '#E8C400',
  2: '#1B6FB8',
  3: '#C41E1E',
  4: '#5E2D8C',
  5: '#E85C00',
  6: '#0B6B3A',
  7: '#7B1313',
};

export type BilliardBallVisualKind = 'cue' | 'solid' | 'stripe' | 'eight';

export interface BilliardBallVisual {
  kind: BilliardBallVisualKind;
  label: string;
  /** CSS background for the sphere (includes simple highlight). */
  background: string;
  numberClass: string;
}

function sphereHighlight(baseLayers: string): string {
  return `${baseLayers}, radial-gradient(circle at 32% 26%, color-mix(in srgb, white 28%, transparent) 0%, transparent 36%)`;
}

/** Solid sphere: capped edge darkness so purple/green/maroon do not “shrink” on dark felt. */
function solidSphereBackground(color: string): string {
  const highlight = `color-mix(in srgb, white 24%, ${color})`;
  const body = color;
  const edgeLift = `color-mix(in srgb, ${color} 68%, white 32%)`;
  const rim = `color-mix(in srgb, ${color} 78%, black 22%)`;
  return sphereHighlight(
    `radial-gradient(circle at 32% 28%, ${highlight} 0%, ${body} 48%, ${edgeLift} 82%, ${rim} 100%)`,
  );
}

export function billiardBallVisual(number: number): BilliardBallVisual {
  if (number === 0) {
    return {
      kind: 'cue',
      label: '',
      background: sphereHighlight(
        'radial-gradient(circle at 30% 28%, #ffffff 0%, #f2f2f2 42%, #c8c8c8 100%)',
      ),
      numberClass: 'billiards-ball__number--cue',
    };
  }
  if (number === 8) {
    return {
      kind: 'eight',
      label: '8',
      background: sphereHighlight(
        'radial-gradient(circle at 32% 28%, color-mix(in srgb, white 12%, #3a3a3a) 0%, #1a1a1a 50%, color-mix(in srgb, #252525 70%, white 30%) 88%, #2a2a2a 100%)',
      ),
      numberClass: 'billiards-ball__number--eight',
    };
  }
  if (number >= 9 && number <= 15) {
    const color = SOLID_COLORS[number - 8] ?? '#888';
    return {
      kind: 'stripe',
      label: String(number),
      background: sphereHighlight(
        [
          `linear-gradient(90deg, #e8e8e8 0%, #e8e8e8 16%, ${color} 16%, ${color} 84%, #e8e8e8 84%, #e8e8e8 100%)`,
          `radial-gradient(circle at 50% 50%, color-mix(in srgb, white 96%, ${color}) 0%, color-mix(in srgb, white 88%, ${color}) 38%, transparent 39%)`,
        ].join(', '),
      ),
      numberClass: 'billiards-ball__number--stripe',
    };
  }
  const color = SOLID_COLORS[number] ?? '#888';
  return {
    kind: 'solid',
    label: String(number),
    background: solidSphereBackground(color),
    numberClass: 'billiards-ball__number--solid',
  };
}

export function trayBallBackground(number: number): string {
  return billiardBallVisual(number).background;
}
