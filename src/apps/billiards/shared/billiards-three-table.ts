import * as THREE from 'three';
import { BALL_RADIUS, TABLE_HEIGHT, TABLE_WIDTH } from './billiards-types';
import { tableToWorld } from './billiards-world-coords';
import { billiardsBallCanvasTexture } from './billiards-three-ball-texture';
import {
  billiardsClothMeshCenter,
  buildBilliardsPlayfieldClothGeometry,
} from './billiards-three-cloth-geometry';
import { readBilliardsThreeTheme } from './billiards-three-theme';
import { POCKET_WELL_PAD, tablePocketVisuals } from './table-pocket-visual';
import { ballOrientationQuat, type BilliardsBallOrient } from './billiards-overhead-ball-display';

export interface BilliardsTableScene {
  root: THREE.Group;
  ballRoot: THREE.Group;
  shadowRoot: THREE.Group;
  ballMeshes: Map<string, THREE.Mesh>;
  shadowMeshes: Map<string, THREE.Mesh>;
  themeEl: HTMLElement | null;
  clothMesh: THREE.Mesh | null;
  ballGeometry: THREE.SphereGeometry;
  shadowGeometry: THREE.CircleGeometry;
  shadowMaterial: THREE.MeshBasicMaterial;
  lights: THREE.Light[];
}

export const BILLIARDS_MESH_ROLE = {
  cloth: 'billiards-cloth',
  pocketWell: 'billiards-pocket-well',
} as const;

/** Bump to force mesh rebuilds when the ball geometry contract changes. */
const BILLIARDS_BALL_GEOM_VERSION = 6;

/**
 * Render layers (must stay ordered):
 * - cloth: 0
 * - pocket wells + contact shadows: 1 (see well + `ensureShadowMesh`)
 * - balls: 2 — **above** pocket art so nothing in the 3D layer paints over a ball by renderOrder.
 */
const BALL_RENDER_ORDER = 2;

/** Sphere sides/rings — balance rim quality vs per-ball triangle count (15 balls × Phong). */
const BALL_WIDTH_SEGMENTS = 32;
const BALL_HEIGHT_SEGMENTS = 24;

/** Contact shadow footprint relative to the ball, and its lift off the cloth. */
const SHADOW_RADIUS_SCALE = 1.16;
const SHADOW_LIFT = 0.028;

const shadowTextureCache = new Map<number, THREE.CanvasTexture>();

/** Soft radial falloff so the ball reads as sitting on the cloth rather than pasted on. */
function billiardsShadowTexture(number: number): THREE.CanvasTexture {
  const tint = number === 0 ? '#5b6472' : '#0b1018';
  const cached = shadowTextureCache.get(number === 0 ? 0 : 1);
  if (cached) {
    return cached;
  }
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, `${tint}cc`);
    g.addColorStop(0.55, `${tint}66`);
    g.addColorStop(1, `${tint}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  shadowTextureCache.set(number === 0 ? 0 : 1, tex);
  return tex;
}

/**
 * Sphere material.
 *
 * Phong (not Basic) is what creates the lit-to-dark falloff that reads as three
 * dimensions. Two details matter for realism:
 *
 * - **Low `shininess`.** The camera looks straight down, so a tight specular lobe lands
 *   dead centre of every ball and reads as a blown-out white blob. A broad, dim
 *   highlight reads as polished resin instead of chrome.
 * - **No `emissive`.** A white emissive term is added to every pixel, desaturating the
 *   ball and flattening the shading it exists to provide.
 */
function ballMaterialForNumber(number: number): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    map: billiardsBallCanvasTexture(number),
    specular: 0x2a2e36,
    shininess: number === 0 ? 18 : 12,
    toneMapped: false,
  });
}

const pocketWellCache = new Map<string, THREE.CanvasTexture>();

/**
 * Pocket well — a **flat, very dark disc**.
 *
 * Matches how a hole actually reads from directly overhead: almost uniformly black, with
 * only a faint darkening toward the centre. Earlier versions ramped lightness back up at
 * the rim, which turned each pocket into a shaded dome bulging out of the cloth — the
 * opposite of a hole. Keep this flat; depth cues belong on the *jaw* (the SVG trim), not
 * inside the opening.
 *
 * The disc is drawn slightly larger than the mesh so its own edge never shows as a ring.
 */
function billiardsPocketWellTexture(color: THREE.Color): THREE.CanvasTexture {
  const key = color.getHexString();
  const cached = pocketWellCache.get(key);
  if (cached) {
    return cached;
  }
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = size / 2;
    const centre = color.clone().multiplyScalar(0.25);
    const edge = color.clone().multiplyScalar(0.55);
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, `#${centre.getHexString()}`);
    g.addColorStop(0.8, `#${edge.getHexString()}`);
    g.addColorStop(1, `#${edge.getHexString()}`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  pocketWellCache.set(key, tex);
  return tex;
}

export function buildBilliardsTableScene(themeEl: HTMLElement | null): BilliardsTableScene {
  const root = new THREE.Group();
  const theme = readBilliardsThreeTheme(themeEl);

  const clothGeom = buildBilliardsPlayfieldClothGeometry();
  const clothMat = new THREE.MeshBasicMaterial({
    color: theme.cloth,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const cloth = new THREE.Mesh(clothGeom, clothMat);
  cloth.userData.role = BILLIARDS_MESH_ROLE.cloth;
  cloth.renderOrder = 0;
  const clothCenter = billiardsClothMeshCenter();
  cloth.position.set(clothCenter.x, clothCenter.y, clothCenter.z);
  root.add(cloth);

  /**
   * Pocket wells sit **above** the cloth, not below it.
   *
   * The cloth is a solid surface with no holes punched in it (see
   * `buildBilliardsPlayfieldClothGeometry`), because the corner pocket circles straddle the
   * cloth boundary and earcut cannot handle that — it emitted slivers that covered the
   * hole. Drawing an opaque disc over the felt achieves the same result from the overhead
   * camera with no triangulation involved.
   *
   * The lift is small relative to `BALL_RADIUS` (17) so a ball still reads as sinking
   * beneath the felt rather than floating above the hole.
   */
  const wellTexture = billiardsPocketWellTexture(theme.pocketInner);
  for (const pocket of tablePocketVisuals()) {
    // Shares `POCKET_WELL_PAD` with the SVG trim circle, so the dark disc and the ring
    // around it are the same size and concentric by construction.
    const wellGeom = new THREE.CircleGeometry(pocket.r + POCKET_WELL_PAD, 48);
    wellGeom.rotateX(Math.PI / 2);
    const wellMat = new THREE.MeshBasicMaterial({
      map: wellTexture,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const well = new THREE.Mesh(wellGeom, wellMat);
    well.userData.role = BILLIARDS_MESH_ROLE.pocketWell;
    well.position.set(pocket.cx, clothCenter.y + 0.004, pocket.cy);
    well.renderOrder = 1;
    root.add(well);
  }

  const shadowRoot = new THREE.Group();
  root.add(shadowRoot);

  const ballRoot = new THREE.Group();
  root.add(ballRoot);

  const ballGeometry = new THREE.SphereGeometry(
    BALL_RADIUS,
    BALL_WIDTH_SEGMENTS,
    BALL_HEIGHT_SEGMENTS,
  );
  const shadowGeometry = new THREE.CircleGeometry(1, 24);
  shadowGeometry.rotateX(-Math.PI / 2);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: billiardsShadowTexture(0),
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
    toneMapped: false,
  });

  // Table cloth, wells, and lips never move — skip per-frame matrix walks for that subtree.
  root.matrixAutoUpdate = false;
  root.updateMatrixWorld(true);

  return {
    root,
    ballRoot,
    shadowRoot,
    ballMeshes: new Map(),
    shadowMeshes: new Map(),
    themeEl,
    clothMesh: cloth,
    ballGeometry,
    shadowGeometry,
    shadowMaterial,
    lights: createBilliardsLights(),
  };
}

export function refreshBilliardsTableTheme(scene: BilliardsTableScene): void {
  const theme = readBilliardsThreeTheme(scene.themeEl);
  const wellTexture = billiardsPocketWellTexture(theme.pocketInner);
  scene.root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) {
      return;
    }
    const mat = obj.material;
    if (!(mat instanceof THREE.MeshBasicMaterial)) {
      return;
    }
    const role = obj.userData.role as string | undefined;
    if (role === BILLIARDS_MESH_ROLE.cloth) {
      mat.color.copy(theme.cloth);
    } else if (role === BILLIARDS_MESH_ROLE.pocketWell) {
      // Wells render from a depth map, so a colour swap alone would do nothing.
      mat.map = wellTexture;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    }
  });
}

function ensureShadowMesh(scene: BilliardsTableScene, id: string, number: number): THREE.Mesh {
  let mesh = scene.shadowMeshes.get(id);
  if (!mesh) {
    mesh = new THREE.Mesh(scene.shadowGeometry, scene.shadowMaterial.clone());
    mesh.renderOrder = 1;
    scene.shadowRoot.add(mesh);
    scene.shadowMeshes.set(id, mesh);
  }
  const mat = mesh.material as THREE.MeshBasicMaterial;
  const wanted = billiardsShadowTexture(number);
  if (mat.map !== wanted) {
    mat.map = wanted;
    mat.needsUpdate = true;
  }
  return mesh;
}

export function ensureBallMesh(
  scene: BilliardsTableScene,
  id: string,
  number: number,
): THREE.Mesh {
  let mesh = scene.ballMeshes.get(id);
  if (
    mesh &&
    (!(mesh.geometry instanceof THREE.SphereGeometry) ||
      mesh.userData.billiardsBallGeomVersion !== BILLIARDS_BALL_GEOM_VERSION)
  ) {
    removeBallMesh(scene, id);
    mesh = undefined;
  }
  if (mesh) {
    return mesh;
  }
  const mat = ballMaterialForNumber(number);
  mesh = new THREE.Mesh(scene.ballGeometry, mat);
  mesh.userData.billiardsBallGeomVersion = BILLIARDS_BALL_GEOM_VERSION;
  mesh.userData.ballNumber = number;
  mesh.renderOrder = BALL_RENDER_ORDER;
  scene.ballRoot.add(mesh);
  scene.ballMeshes.set(id, mesh);
  ensureShadowMesh(scene, id, number);
  return mesh;
}

export function removeBallMesh(scene: BilliardsTableScene, id: string): void {
  const mesh = scene.ballMeshes.get(id);
  if (mesh) {
    scene.ballRoot.remove(mesh);
    // Geometry is shared per scene — only the per-ball material is ours to free.
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => m.dispose());
    } else {
      mesh.material.dispose();
    }
    scene.ballMeshes.delete(id);
  }
  const shadow = scene.shadowMeshes.get(id);
  if (shadow) {
    scene.shadowRoot.remove(shadow);
    (shadow.material as THREE.Material).dispose();
    scene.shadowMeshes.delete(id);
  }
}

/** How far a pocketed ball shrinks as it drops, and how far it sinks below the felt. */
const SINK_SHRINK = 0.82;

/**
 * Position + orient one ball.
 *
 * `orient` is the rigid body's world quaternion, applied verbatim: the sphere's own
 * geometry then tumbles through the roll, which is what makes the painted number,
 * stripe and measle dots behave like a real ball.
 *
 * `sink` (0…1) plays the pocket drop. The camera looks straight down orthographically,
 * so vertical travel is literally invisible on screen — the drop is therefore sold by
 * **shrinking** the ball toward the throat while its contact shadow fades out, which is
 * what perspective would have done to it.
 */
export function syncBallMesh(
  scene: BilliardsTableScene,
  id: string,
  number: number,
  x: number,
  tableY: number,
  orient?: BilliardsBallOrient,
  sink?: number,
): void {
  const mesh = ensureBallMesh(scene, id, number);
  if (mesh.userData.ballNumber !== number) {
    (mesh.material as THREE.MeshPhongMaterial).dispose();
    mesh.material = ballMaterialForNumber(number);
    mesh.userData.ballNumber = number;
  }
  const pos = tableToWorld(x, tableY);
  const sinkAmount = Math.max(0, Math.min(1, sink ?? 0));

  // Ease-out so the ball accelerates away from the lip, like a real drop.
  const eased = sinkAmount * sinkAmount * (3 - 2 * sinkAmount);
  mesh.position.set(pos.x, pos.y - eased * BALL_RADIUS, pos.z);
  mesh.scale.setScalar(1 - SINK_SHRINK * eased);

  const quat = ballOrientationQuat(orient);
  if (quat) {
    mesh.quaternion.copy(quat);
  } else if (!mesh.userData.oriented) {
    // Setup / drag placement has no physics pose — rest the markings facing the camera.
    mesh.quaternion.identity();
  }
  mesh.userData.oriented = Boolean(quat);

  const shadow = ensureShadowMesh(scene, id, number);
  const radius = BALL_RADIUS * SHADOW_RADIUS_SCALE;
  shadow.position.set(pos.x, SHADOW_LIFT, pos.z);
  shadow.scale.set(radius, 1, radius);
  // The shadow stays behind in the mouth as the ball goes under.
  const shadowMat = shadow.material as THREE.MeshBasicMaterial;
  shadowMat.opacity = 0.55 * (1 - eased);
  shadow.visible = eased < 0.98;
}

/**
 * Table-space rectangle visible in a `width × height` canvas, using the same uniform
 * `meet` fit as the SVG cue overlay (`preserveAspectRatio="xMidYMid meet"`).
 *
 * This is load-bearing, not cosmetic. The cue overlay, the drag handles and the ball
 * chrome all position themselves with `x / TABLE_WIDTH` and `y / TABLE_HEIGHT` across the
 * playfield. If the camera's mapping differs even slightly, the rendered ball is drawn
 * away from the position every overlay assumes it has — which is why the cue appeared to
 * pivot off the cue-ball centre.
 *
 * The rect always *contains* the whole table: the slack axis grows, the bounding axis
 * stays at its native size. (The previous implementation had these two branches inverted,
 * so it cropped the table instead of containing it, and added a pad the overlay never had.)
 */
export function billiardsCameraViewRect(
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  const viewAspect = width / Math.max(1, height);
  const tableAspect = TABLE_WIDTH / TABLE_HEIGHT;
  if (viewAspect > tableAspect) {
    // Canvas is wider than the table — fit the height, let width carry the slack.
    const h = TABLE_HEIGHT;
    const w = h * viewAspect;
    return { x: (TABLE_WIDTH - w) / 2, y: 0, w, h };
  }
  // Canvas is taller — fit the width, let height carry the slack.
  const w = TABLE_WIDTH;
  const h = w / viewAspect;
  return { x: 0, y: (TABLE_HEIGHT - h) / 2, w, h };
}

export function createBilliardsCamera(width: number, height: number): THREE.OrthographicCamera {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2500);
  fitBilliardsOrthographicCamera(cam, width, height);
  return cam;
}

export function fitBilliardsOrthographicCamera(
  camera: THREE.OrthographicCamera,
  width: number,
  height: number,
): void {
  const cx = TABLE_WIDTH / 2;
  const cz = TABLE_HEIGHT / 2;
  camera.position.set(cx, 600, cz);
  camera.up.set(0, 0, -1);
  camera.lookAt(cx, 0, cz);
  camera.updateMatrixWorld(true);

  const view = billiardsCameraViewRect(width, height);

  // View space: +X = world +X, +Y = world −Z (camera `up` is (0,0,-1)), so a larger
  // table y maps to a smaller view y. Invert the offset from the camera centre.
  camera.left = view.x - cx;
  camera.right = view.x + view.w - cx;
  camera.top = cz - view.y;
  camera.bottom = cz - (view.y + view.h);
  camera.updateProjectionMatrix();
}

export function createBilliardsRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Fixed renderOrder on cloth / wells / shadows / balls — skip sort pass each frame.
  renderer.sortObjects = false;
  // Cap DPR so fill-rate doesn't blow up on 4K / HiDPI (ortho table + 15 Phong spheres).
  renderer.setPixelRatio(
    typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.35) : 1,
  );
  return renderer;
}

/**
 * Table lighting for the sphere materials.
 *
 * The overhead key sits off-centre so the lit side of each ball is offset from its
 * silhouette — that offset is the depth cue. Intensities are deliberately restrained:
 * ambient + hemi + key + fill all sum, and over-lighting is what produced the washed-out
 * glare. Total diffuse energy here is ~1.1, which just reaches full colour on the lit
 * side while leaving the far side properly shaded.
 */
export function createBilliardsLights(): THREE.Light[] {
  // Balanced so a mid-tone ball lands near its true colour on the lit side: diffusion
  // sums to ~1.35 (slight boost, since the canvas map follows sRGB and reads darker than
  // the raw hex) while the unlit side still falls to roughly half. Cutting the glare and
  // cutting the exposure are different problems — this fixes only the former.
  const ambient = new THREE.AmbientLight(0xffffff, 0.95);
  const hemi = new THREE.HemisphereLight(0xf7faff, 0x1a2332, 0.55);
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(TABLE_WIDTH * 0.3, 620, TABLE_HEIGHT * 0.34);
  const fill = new THREE.DirectionalLight(0xe8efff, 0.38);
  fill.position.set(TABLE_WIDTH * 0.82, 380, TABLE_HEIGHT * 0.86);
  return [ambient, hemi, key, fill];
}

/** Release everything the scene owns. Textures stay cached by number. */
export function disposeBilliardsTableScene(scene: BilliardsTableScene): void {
  for (const id of [...scene.ballMeshes.keys()]) {
    removeBallMesh(scene, id);
  }
  scene.ballGeometry.dispose();
  scene.shadowGeometry.dispose();
  scene.shadowMaterial.dispose();
  scene.root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) {
      return;
    }
    if (obj.geometry === scene.ballGeometry || obj.geometry === scene.shadowGeometry) {
      return;
    }
    obj.geometry.dispose();
    if (Array.isArray(obj.material)) {
      obj.material.forEach((m) => m.dispose());
    } else {
      obj.material.dispose();
    }
  });
}
