import * as THREE from 'three';
import { billiardBallVisual } from './billiard-ball-visual';
import { billiardsBallHex, isStripeBall } from './billiards-three-ball-colors';

/**
 * Equirectangular ball maps for `THREE.SphereGeometry`.
 *
 * `u` wraps longitude 0 → 2π and `v` runs from the +Y pole (top row) to the −Y pole
 * (bottom row), matching the sphere's built-in UV layout. Painting the markings here
 * means the number roundels, stripes and cue dots ride the sphere's real quaternion
 * instead of being a flat sticker spun by `texture.rotation`.
 *
 * Convention: the two white roundels sit on the ±Y poles, so a freshly racked ball
 * (`identity` rotation) shows its number straight up to the overhead camera.
 */
const TEX_W = 512;
const TEX_H = 256;

/** Half-angle of the white number roundel around each pole (~33° ≈ 55% of the silhouette). */
const ROUNDEL_HALF_ANGLE = (33 * Math.PI) / 180;
/** Stripe band limits, measured from the +Y pole — leaves a white cap + thin white seam. */
const STRIPE_EDGE_INNER = (56 * Math.PI) / 180;
const STRIPE_EDGE_OUTER = Math.PI - STRIPE_EDGE_INNER;

const ROUNDEL_PX = 256;

const CUE_BASE = '#f4f2ec';
const ROUNDEL_BASE = '#f7f7f4';
const NUMBER_INK = '#15181d';
const MEASLE_DOT = '#c0392b';
/** Angular radius of a cue-ball measle dot. */
const MEASLE_DOT_ANGLE = (5 * Math.PI) / 180;

const TAU = Math.PI * 2;

const textureCache = new Map<number, THREE.CanvasTexture>();

function hexToCss(hex: string): string {
  return hex.startsWith('#') ? hex : `#${hex}`;
}

/** White roundel with the ball number, drawn flat; the cap warp re-projects it. */
function paintRoundel(number: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ROUNDEL_PX;
  canvas.height = ROUNDEL_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }
  const c = ROUNDEL_PX / 2;
  const radius = c - 3;
  ctx.fillStyle = ROUNDEL_BASE;
  ctx.beginPath();
  ctx.arc(c, c, radius, 0, TAU);
  ctx.fill();

  const label = billiardBallVisual(number).label;
  if (!label) {
    return canvas;
  }
  ctx.fillStyle = NUMBER_INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(radius * 1.12)}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText(label, c, c + radius * 0.04);
  return canvas;
}

/** Source-over one pixel of the flat roundel onto the equirectangular map. */
function blendPixel(
  out: Uint8ClampedArray,
  destOffset: number,
  src: Uint8ClampedArray,
  srcOffset: number,
  srcAlpha: number,
): void {
  const destAlpha = out[destOffset + 3] / 255;
  const outAlpha = srcAlpha + destAlpha * (1 - srcAlpha);
  if (outAlpha <= 0) {
    return;
  }
  const keep = (destAlpha * (1 - srcAlpha)) / outAlpha;
  const take = srcAlpha / outAlpha;
  out[destOffset] = src[srcOffset] * take + out[destOffset] * keep;
  out[destOffset + 1] = src[srcOffset + 1] * take + out[destOffset + 1] * keep;
  out[destOffset + 2] = src[srcOffset + 2] * take + out[destOffset + 2] * keep;
  out[destOffset + 3] = outAlpha * 255;
}

/**
 * Warp a flat disc onto both spherical polar caps.
 *
 * Each disc pixel at radius ρ maps to polar angle θ = ρ·halfAngle and azimuth β, so the
 * number stays circular and legible when viewed down the pole (a plain canvas circle
 * would smear into an ellipse near the pole of an equirectangular map).
 *
 * Disc +X → world +X and disc +Y → world −Z, which is exactly screen-right / screen-up
 * for the overhead camera, so painted text reads upright at rest.
 */
function compositeRoundelOnPoles(
  ctx: CanvasRenderingContext2D,
  disc: HTMLCanvasElement,
  halfAngle: number,
): void {
  const discCtx = disc.getContext('2d');
  if (!discCtx) {
    return;
  }
  const sw = disc.width;
  const sh = disc.height;
  const src = discCtx.getImageData(0, 0, sw, sh).data;
  const image = ctx.getImageData(0, 0, TEX_W, TEX_H);
  const out = image.data;
  const radiusPx = Math.min(sw, sh) / 2;
  const cx = sw / 2;
  const cy = sh / 2;

  for (let sy = 0; sy < sh; sy += 1) {
    for (let sx = 0; sx < sw; sx += 1) {
      const srcOffset = (sy * sw + sx) * 4;
      const srcAlpha = src[srcOffset + 3] / 255;
      if (srcAlpha <= 0) {
        continue;
      }
      const dx = (sx + 0.5 - cx) / radiusPx;
      const dy = (sy + 0.5 - cy) / radiusPx;
      const rho = Math.hypot(dx, dy);
      if (rho > 1) {
        continue;
      }
      const theta = rho * halfAngle;
      const beta = Math.atan2(dy, dx);

      // North pole (+Y): phi = π + β.
      const northPhi = (((Math.PI + beta) % TAU) + TAU) % TAU;
      const northX = Math.min(TEX_W - 1, Math.floor((northPhi / TAU) * TEX_W));
      const northY = Math.min(TEX_H - 1, Math.floor((theta / Math.PI) * TEX_H));
      blendPixel(out, (northY * TEX_W + northX) * 4, src, srcOffset, srcAlpha);

      // South pole (−Y): phi = π − β, mirrored across the seam.
      const southPhi = (((Math.PI - beta) % TAU) + TAU) % TAU;
      const southX = Math.min(TEX_W - 1, Math.floor((southPhi / TAU) * TEX_W));
      const southY = Math.min(
        TEX_H - 1,
        Math.max(0, Math.floor(((Math.PI - theta) / Math.PI) * TEX_H)),
      );
      blendPixel(out, (southY * TEX_W + southX) * 4, src, srcOffset, srcAlpha);
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** Coloured band around the equator, with white caps left for the roundels. */
function paintStripeBand(ctx: CanvasRenderingContext2D, color: string): void {
  const y0 = (STRIPE_EDGE_INNER / Math.PI) * TEX_H;
  const y1 = (STRIPE_EDGE_OUTER / Math.PI) * TEX_H;
  ctx.fillStyle = color;
  ctx.fillRect(0, y0, TEX_W, y1 - y0);
}

/**
 * Measle-ball dots on the cue ball — the cheapest, clearest proof that the sphere is
 * actually rolling (a plain white ball reads as static no matter how it spins).
 */
function paintCueDots(ctx: CanvasRenderingContext2D): void {
  const dots: ReadonlyArray<readonly [number, number]> = [
    [Math.PI / 2, 0],
    [Math.PI / 2, Math.PI / 2],
    [Math.PI / 2, Math.PI],
    [Math.PI / 2, (3 * Math.PI) / 2],
    [Math.PI / 4, Math.PI / 4],
    [Math.PI / 4, (5 * Math.PI) / 4],
    [(3 * Math.PI) / 4, (3 * Math.PI) / 4],
    [(3 * Math.PI) / 4, (7 * Math.PI) / 4],
  ];
  ctx.fillStyle = MEASLE_DOT;
  for (const [theta, phi] of dots) {
    const cxDot = (phi / TAU) * TEX_W;
    const cyDot = (theta / Math.PI) * TEX_H;
    // Longitude compresses by sin(θ) on the sphere, so widen the dot to stay round.
    const halfW = Math.max(2, ((MEASLE_DOT_ANGLE / Math.sin(theta)) / TAU) * TEX_W);
    const halfH = Math.max(2, (MEASLE_DOT_ANGLE / Math.PI) * TEX_H);
    ctx.beginPath();
    ctx.ellipse(cxDot, cyDot, halfW, halfH, 0, 0, TAU);
    ctx.fill();
  }
}

function paintBallCanvas(ctx: CanvasRenderingContext2D, number: number): void {
  ctx.clearRect(0, 0, TEX_W, TEX_H);

  if (number === 0) {
    ctx.fillStyle = CUE_BASE;
    ctx.fillRect(0, 0, TEX_W, TEX_H);
    paintCueDots(ctx);
    return;
  }

  if (isStripeBall(number)) {
    ctx.fillStyle = CUE_BASE;
    ctx.fillRect(0, 0, TEX_W, TEX_H);
    paintStripeBand(ctx, hexToCss(billiardsBallHex(number)));
  } else {
    ctx.fillStyle = hexToCss(billiardsBallHex(number));
    ctx.fillRect(0, 0, TEX_W, TEX_H);
  }

  compositeRoundelOnPoles(ctx, paintRoundel(number), ROUNDEL_HALF_ANGLE);
}

/** Equirectangular map applied to a sphere mesh; orientation comes from the rigid body. */
export function billiardsBallCanvasTexture(number: number): THREE.CanvasTexture {
  const cached = textureCache.get(number);
  if (cached) {
    return cached;
  }
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    textureCache.set(number, fallback);
    return fallback;
  }
  paintBallCanvas(ctx, number);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  textureCache.set(number, texture);
  return texture;
}

export function clearBilliardsBallTextureCache(): void {
  for (const tex of textureCache.values()) {
    tex.dispose();
  }
  textureCache.clear();
}

/** Call after changing ball texture paint so cached maps refresh. */
export function bumpBilliardsBallTextureGeneration(): void {
  clearBilliardsBallTextureCache();
}
