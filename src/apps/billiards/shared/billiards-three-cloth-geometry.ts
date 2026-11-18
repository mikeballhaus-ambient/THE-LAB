import * as THREE from 'three';
import {
  TABLE_BUMPER_NOSE,
  TABLE_CLOTH_CORNER_RADIUS,
  TABLE_HEIGHT,
  TABLE_RAIL_INSET,
  TABLE_WIDTH,
} from './billiards-types';

export const BILLIARDS_CLOTH_X = TABLE_RAIL_INSET;
export const BILLIARDS_CLOTH_Y = TABLE_RAIL_INSET;
export const BILLIARDS_CLOTH_W = TABLE_WIDTH - TABLE_RAIL_INSET * 2;
export const BILLIARDS_CLOTH_H = TABLE_HEIGHT - TABLE_RAIL_INSET * 2;

function appendRoundedRect(
  shape: THREE.Shape,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  if (rr < 0.01) {
    shape.moveTo(x, y);
    shape.lineTo(x + w, y);
    shape.lineTo(x + w, y + h);
    shape.lineTo(x, y + h);
    shape.lineTo(x, y);
    return;
  }
  shape.moveTo(x + rr, y);
  shape.lineTo(x + w - rr, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + rr);
  shape.lineTo(x + w, y + h - rr);
  shape.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  shape.lineTo(x + rr, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - rr);
  shape.lineTo(x, y + rr);
  shape.quadraticCurveTo(x, y, x + rr, y);
}

/**
 * Playing cloth surface — a solid rounded rectangle, **no holes**.
 *
 * The pockets are not cut into this geometry. They are opaque discs drawn slightly *above*
 * it (`POCKET_WELL_LIFT` in `billiards-three-table.ts`), which reads identically from the
 * overhead camera and avoids a whole class of failure:
 *
 * - The corner pocket circles are centred in the wood apron, so each one straddles the
 *   cloth's outer boundary. `ShapeGeometry` uses earcut, which requires every hole to lie
 *   strictly inside its contour — given a straddling hole it emits sliver triangles that
 *   paint *over* the hole. That is exactly why the four corners showed felt across the
 *   opening while the two side pockets looked correct.
 * - A solid surface has no triangulation edge cases at all, so the throat cannot be
 *   obstructed by geometry regardless of where the pockets are placed.
 */
export function buildBilliardsPlayfieldClothGeometry(): THREE.ShapeGeometry {
  const lip = TABLE_BUMPER_NOSE;
  const shape = new THREE.Shape();
  appendRoundedRect(
    shape,
    -lip,
    -lip,
    BILLIARDS_CLOTH_W + lip * 2,
    BILLIARDS_CLOTH_H + lip * 2,
    TABLE_CLOTH_CORNER_RADIUS + lip,
  );

  const geom = new THREE.ShapeGeometry(shape);
  geom.rotateX(-Math.PI / 2);
  geom.computeBoundingBox();
  const box = geom.boundingBox;
  if (box) {
    const cx = (box.min.x + box.max.x) * 0.5;
    const cz = (box.min.z + box.max.z) * 0.5;
    geom.translate(-cx, 0, -cz);
  }
  return geom;
}

export function billiardsClothMeshCenter(): { x: number; y: number; z: number } {
  return {
    x: BILLIARDS_CLOTH_X + BILLIARDS_CLOTH_W / 2,
    y: 0.02,
    z: BILLIARDS_CLOTH_Y + BILLIARDS_CLOTH_H / 2,
  };
}
