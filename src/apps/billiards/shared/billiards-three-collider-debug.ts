import * as THREE from 'three';
import { getBilliardsRapierDebugLineBuffers } from './billiards-rapier-sim';

const RAPIER_DEBUG_USER_DATA_ROLE = 'billiards-rapier-debug-lines';

/** Draw on top of the table/balls so colliders stay visible when toggled on. */
const DEBUG_COLLIDER_RENDER_ORDER = 1000;

const rapierDebugLineMaterial = (): THREE.LineBasicMaterial =>
  new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });

/**
 * Empty root — **`syncBilliardsRapierColliderDebug`** adds Rapier `debugRender` line soup only.
 * No handcrafted box wireframes (those duplicated logic and drifted from simulation).
 */
export function buildBilliardsColliderDebugGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'billiards-collider-debug';
  group.userData.role = 'billiards-collider-debug-root';
  group.renderOrder = DEBUG_COLLIDER_RENDER_ORDER;
  return group;
}

/**
 * Updates **`LineSegments`** from `getBilliardsRapierDebugLineBuffers()` (Rapier `world.debugRender()`).
 * Populated by `stepRapierShotSession` during a shot, or `updateBilliardsRapierColliderDebugSnapshot` when idle.
 */
export function syncBilliardsRapierColliderDebug(root: THREE.Group): void {
  const buf = getBilliardsRapierDebugLineBuffers();
  let lines = root.children.find(
    (c): c is THREE.LineSegments =>
      c instanceof THREE.LineSegments && c.userData.role === RAPIER_DEBUG_USER_DATA_ROLE,
  );

  if (!buf || buf.vertices.length < 6) {
    if (lines) {
      root.remove(lines);
      lines.geometry.dispose();
      const m = lines.material;
      if (!Array.isArray(m)) {
        m.dispose();
      }
    }
    return;
  }

  const { vertices, colors } = buf;

  if (!lines) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    lines = new THREE.LineSegments(geom, rapierDebugLineMaterial());
    lines.name = 'billiards-rapier-debug';
    lines.userData.role = RAPIER_DEBUG_USER_DATA_ROLE;
    lines.renderOrder = DEBUG_COLLIDER_RENDER_ORDER + 2;
    lines.frustumCulled = false;
    root.add(lines);
    return;
  }

  const geom = lines.geometry;
  const pos = geom.getAttribute('position') as THREE.BufferAttribute | undefined;
  const col = geom.getAttribute('color') as THREE.BufferAttribute | undefined;
  if (!pos || pos.array.length !== vertices.length) {
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  } else {
    (pos.array as Float32Array).set(vertices);
    pos.needsUpdate = true;
    if (col && col.array.length === colors.length) {
      (col.array as Float32Array).set(colors);
      col.needsUpdate = true;
    } else {
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    }
  }
  geom.computeBoundingSphere();
}
