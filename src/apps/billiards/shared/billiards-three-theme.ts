import * as THREE from 'three';

/** sRGB-component parse of `color(srgb r g b [/ a])`, values 0–1. */
function parseColorSrgb(raw: string): THREE.Color | null {
  const m = /^color\(\s*srgb\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/i.exec(raw);
  if (!m) {
    return null;
  }
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  if (![r, g, b].every((n) => Number.isFinite(n))) {
    return null;
  }
  // setRGB with an explicit sRGB working space performs the sRGB → linear conversion that
  // THREE.Color applies for `rgb()` / hex input, so results match the on-page colour.
  return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
}

/**
 * Parse any computed colour string into a `THREE.Color`.
 *
 * `getComputedStyle` in modern Chromium returns `color(srgb 0.51 0.55 0.60)` for anything
 * derived from `color-mix()`. `THREE.Color` understands hex / `rgb()` / `hsl()` / named
 * colours only; given anything else it warns "Unknown color model" and leaves the instance
 * at its **default white** rather than throwing.
 *
 * That mattered more than it looks: every `--billiards-*` token came back white, so the
 * cloth, cushion and pockets all lost their theme colours while quietly falling back —
 * the felt rendered with no relation to the active preset.
 *
 * The `color(srgb …)` form is parsed explicitly here rather than delegated to a canvas,
 * because Chrome also serialises canvas `fillStyle` back into the same modern notation.
 */
function parseCssColor(raw: string, fallback: string): THREE.Color {
  if (!raw || raw === 'rgba(0, 0, 0, 0)' || raw === 'transparent') {
    return new THREE.Color(fallback);
  }
  const srgb = parseColorSrgb(raw);
  if (srgb) {
    return srgb;
  }
  if (/^#|^rgba?\(|^hsla?\(|^[a-z]+$/i.test(raw)) {
    try {
      return new THREE.Color(raw);
    } catch {
      /* fall through */
    }
  }
  return new THREE.Color(fallback);
}

/** Resolve a CSS custom property on the felt host (supports color-mix + inherited --lab-*). */
export function resolveBilliardsTokenColor(
  themeEl: HTMLElement | null,
  cssVar: string,
  fallback: string,
): THREE.Color {
  if (!themeEl || typeof document === 'undefined') {
    return new THREE.Color(fallback);
  }
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:0;top:0;';
  probe.style.backgroundColor = `var(${cssVar})`;
  themeEl.appendChild(probe);
  const rgb = getComputedStyle(probe).backgroundColor;
  themeEl.removeChild(probe);
  return parseCssColor(rgb, fallback);
}

export interface BilliardsThreeThemeColors {
  cloth: THREE.Color;
  clothDark: THREE.Color;
  cushion: THREE.Color;
  cushionLight: THREE.Color;
  pocketInner: THREE.Color;
  pocketOuter: THREE.Color;
}

/** Felt color from billiards cloth tokens on the felt host (matches SVG gradient mid tone). */
/**
 * Force a colour to be darker than the felt.
 *
 * A pocket must never be lighter than the cloth — if a theme yields a pale
 * `--billiards-pocket-inner` (light presets mix toward the near-white background), the
 * pocket reads as a bright cap instead of a hole. Clamping to a fraction of the cloth
 * lightness guarantees the illusion holds in every preset.
 */
function darkenBelow(color: THREE.Color, reference: THREE.Color, factor: number): THREE.Color {
  const refHsl = { h: 0, s: 0, l: 0 };
  reference.getHSL(refHsl);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  const ceiling = refHsl.l * factor;
  if (hsl.l <= ceiling) {
    return color;
  }
  const out = color.clone();
  out.setHSL(hsl.h, hsl.s, Math.max(0.02, ceiling));
  return out;
}

export function readBilliardsThreeTheme(themeEl: HTMLElement | null): BilliardsThreeThemeColors {
  const cloth = resolveBilliardsTokenColor(themeEl, '--billiards-cloth-mid', '#94a3b8');
  const dark = resolveBilliardsTokenColor(themeEl, '--billiards-cloth-dark', '#64748b');

  const cushion = resolveBilliardsTokenColor(themeEl, '--billiards-cushion-dark', '#4a6b52');
  const cushionLight = resolveBilliardsTokenColor(themeEl, '--billiards-cushion-light', '#5a7d62');
  const pocketInner = darkenBelow(
    resolveBilliardsTokenColor(themeEl, '--billiards-pocket-inner', '#0f172a'),
    cloth,
    0.22,
  );
  const pocketOuter = darkenBelow(
    resolveBilliardsTokenColor(themeEl, '--billiards-pocket-outer', '#1e293b'),
    cloth,
    0.34,
  );

  return {
    cloth,
    clothDark: dark,
    cushion,
    cushionLight,
    pocketInner,
    pocketOuter,
  };
}
