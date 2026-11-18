export interface ContrastWarning {
  id: string;
  label: string;
  ratio: number;
  minimum: number;
}

function parseRgbChannel(value: string): number | null {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return null;
  return Math.min(255, Math.max(0, n));
}

/** Best-effort parse for hex / rgb() used in theme tokens. */
export function parseColorToRgb(color: string): { r: number; g: number; b: number } | null {
  const trimmed = color.trim();
  const hex = trimmed.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) {
      return {
        r: Number.parseInt(h[0] + h[0], 16),
        g: Number.parseInt(h[1] + h[1], 16),
        b: Number.parseInt(h[2] + h[2], 16),
      };
    }
    if (h.length >= 6) {
      return {
        r: Number.parseInt(h.slice(0, 2), 16),
        g: Number.parseInt(h.slice(2, 4), 16),
        b: Number.parseInt(h.slice(4, 6), 16),
      };
    }
  }
  const rgb = trimmed.match(/^rgba?\(\s*([^)]+)\)/i);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length >= 3) {
      const r = parseRgbChannel(parts[0]);
      const g = parseRgbChannel(parts[1]);
      const b = parseRgbChannel(parts[2]);
      if (r != null && g != null && b != null) {
        return { r, g, b };
      }
    }
  }
  return null;
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const srgb = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseColorToRgb(foreground);
  const bg = parseColorToRgb(background);
  if (!fg || !bg) {
    return null;
  }
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isAaBodyText(ratio: number | null, minimum = 4.5): boolean {
  if (ratio == null) return true;
  return ratio >= minimum;
}
