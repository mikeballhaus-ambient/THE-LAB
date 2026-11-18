import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Ref } from 'vue';
import * as THREE from 'three';
import type { BilliardsBall } from '../../shared/billiards-types';
import { ensureBilliardsRapier } from '../../shared/billiards-rapier-init';
import type { BilliardsBallPose } from '../../shared/billiards-rapier-sim';
import { updateBilliardsRapierColliderDebugSnapshot } from '../../shared/billiards-rapier-sim';
import { registerBilliardsRollFrameSyncConsumer } from '../../shared/billiards-roll-sync';
import { bumpBilliardsBallTextureGeneration } from '../../shared/billiards-three-ball-texture';
import {
  buildBilliardsColliderDebugGroup,
  syncBilliardsRapierColliderDebug,
} from '../../shared/billiards-three-collider-debug';
import {
  buildBilliardsTableScene,
  createBilliardsCamera,
  createBilliardsRenderer,
  disposeBilliardsTableScene,
  fitBilliardsOrthographicCamera,
  refreshBilliardsTableTheme,
  removeBallMesh,
  syncBallMesh,
  type BilliardsTableScene,
} from '../../shared/billiards-three-table';

export function useBilliardsThreeTable(
  canvasRef: Ref<HTMLCanvasElement | null>,
  themeRef: Ref<HTMLElement | null>,
  balls: Ref<BilliardsBall[]>,
  poses: Ref<BilliardsBallPose[] | null>,
  isRolling: Ref<boolean>,
  showColliderDebug: Ref<boolean>,
) {
  const ready = ref(false);
  const sceneRef = shallowRef<BilliardsTableScene | null>(null);
  let renderer: THREE.WebGLRenderer | null = null;
  let camera: THREE.OrthographicCamera | null = null;
  let threeScene: THREE.Scene | null = null;
  let colliderDebugGroup: THREE.Group | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let unregisterRollFrameSync: (() => void) | null = null;
  let renderScheduled = false;
  let renderRaf = 0;
  let rollBalls: BilliardsBall[] | null = null;
  let rollPoses: BilliardsBallPose[] | null = null;
  let colliderDebugSnapshotVersion = 0;

  function readCanvasPixelSize(canvas: HTMLCanvasElement): { width: number; height: number } {
    const parent = canvas.parentElement;
    let width = parent?.clientWidth ?? canvas.clientWidth;
    let height = parent?.clientHeight ?? canvas.clientHeight;
    if (width < 2 || height < 2) {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
    }
    return { width, height };
  }

  function scheduleColliderDebugSnapshot(): void {
    if (!showColliderDebug.value || isRolling.value || !ready.value) {
      return;
    }
    colliderDebugSnapshotVersion += 1;
    const version = colliderDebugSnapshotVersion;
    const ballSnapshot = [...balls.value];
    void ensureBilliardsRapier()
      .then(() => {
        if (!showColliderDebug.value || isRolling.value || version !== colliderDebugSnapshotVersion) {
          return;
        }
        updateBilliardsRapierColliderDebugSnapshot(ballSnapshot);
        scheduleRender();
      })
      .catch(() => {
        /* WASM init failure — leave overlay empty */
      });
  }

  /**
   * Ball ids playing a pocket drop, mapped to the timestamp the drop began, or `'done'`
   * once it has finished.
   *
   * `'done'` is load-bearing: the pose stream keeps reporting a pocketed ball until the
   * server acknowledges the shot, so simply deleting the entry would restart the sink on
   * the very next frame and the ball would never disappear.
   */
  const sinking = new Map<string, number | 'done'>();

  const POCKET_DROP_MS = 420;

  function syncBallsFrom(
    ballList: BilliardsBall[],
    poseList: BilliardsBallPose[] | null,
  ): void {
    const scene = sceneRef.value;
    if (!scene) {
      return;
    }
    const poseMap =
      poseList && poseList.length > 0 ? new Map(poseList.map((p) => [p.id, p])) : null;
    const now = performance.now();

    // A ball is "visible" while it is on the felt, and also while its drop is playing.
    const onFelt = ballList.filter((b) => !b.pocketed);
    for (const pose of poseList ?? []) {
      if (!pose.pocketed) {
        continue;
      }
      const state = sinking.get(pose.id);
      if (state === 'done') {
        continue;
      }
      if (state == null) {
        sinking.set(pose.id, now);
      } else if (now - state >= POCKET_DROP_MS) {
        sinking.set(pose.id, 'done');
        continue;
      }
      if (!onFelt.some((b) => b.id === pose.id)) {
        onFelt.push({
          id: pose.id,
          number: pose.number,
          x: pose.x,
          y: pose.y,
          pocketed: false,
        });
      }
    }

    // Forget drops for balls that are back in play (re-rack, ball in hand).
    for (const id of [...sinking.keys()]) {
      if (!(poseList ?? []).some((p) => p.id === id && p.pocketed)) {
        sinking.delete(id);
      }
    }

    const liveIds = new Set(onFelt.map((b) => b.id));
    for (const id of [...scene.ballMeshes.keys()]) {
      if (!liveIds.has(id)) {
        // removeBallMesh also drops the paired contact shadow.
        removeBallMesh(scene, id);
      }
    }

    for (const ball of onFelt) {
      const pose = poseMap?.get(ball.id);
      const state = sinking.get(ball.id);
      const sinkPct =
        typeof state === 'number'
          ? Math.max(0, Math.min(1, (now - state) / POCKET_DROP_MS))
          : 0;
      syncBallMesh(
        scene,
        ball.id,
        ball.number,
        ball.x,
        ball.y,
        pose ? { x: pose.rotX, y: pose.rotY, z: pose.rotZ, w: pose.rotW } : undefined,
        sinkPct,
      );
    }
  }

  function syncBalls(): void {
    if (rollBalls) {
      syncBallsFrom(rollBalls, rollPoses);
      return;
    }
    syncBallsFrom(balls.value, poses.value);
  }

  function renderFrame(): void {
    if (!renderer || !camera || !threeScene) {
      return;
    }
    const overlayBalls = rollBalls;
    syncBalls();
    if (colliderDebugGroup?.visible) {
      syncBilliardsRapierColliderDebug(colliderDebugGroup);
    }
    // Overlay data applies only to this draw — same frame as `emitBilliardsRollFrame`.
    if (overlayBalls != null) {
      rollBalls = null;
      rollPoses = null;
    }
    renderer.render(threeScene, camera);
    // A pocket drop is time-based and must keep stepping even after physics has gone
    // quiet, otherwise the ball would freeze mid-sink until the next pose arrives.
    for (const state of sinking.values()) {
      if (typeof state === 'number') {
        scheduleRender();
        break;
      }
    }
  }

  function scheduleRender(): void {
    if (renderScheduled) {
      return;
    }
    renderScheduled = true;
    renderRaf = requestAnimationFrame(() => {
      renderScheduled = false;
      renderFrame();
    });
  }

  /**
   * Called from the shot roll loop's rAF — **do not** call `renderFrame` synchronously here:
   * that stacks Rapier stepping + full WebGL in one handler and triggers Chrome's long-task
   * / "[Violation] requestAnimationFrame handler took Nms" warnings. Schedule the draw instead.
   */
  function ingestRollFrame(ballList: BilliardsBall[], poseList: BilliardsBallPose[]): void {
    rollBalls = ballList;
    rollPoses = poseList;
    scheduleRender();
  }

  function resize(): void {
    const canvas = canvasRef.value;
    if (!canvas || !renderer) {
      return;
    }
    const { width, height } = readCanvasPixelSize(canvas);
    if (width < 2 || height < 2) {
      return;
    }
    renderer.setSize(width, height, false);
    if (camera) {
      fitBilliardsOrthographicCamera(camera, width, height);
    } else {
      camera = createBilliardsCamera(width, height);
    }
    scheduleRender();
  }

  onMounted(() => {
    bumpBilliardsBallTextureGeneration();
    const canvas = canvasRef.value;
    if (!canvas) {
      return;
    }
    threeScene = new THREE.Scene();
    threeScene.matrixAutoUpdate = false;
    threeScene.updateMatrixWorld(true);
    const tableScene = buildBilliardsTableScene(themeRef.value);
    sceneRef.value = tableScene;
    threeScene.add(tableScene.root);
    colliderDebugGroup = buildBilliardsColliderDebugGroup();
    colliderDebugGroup.visible = showColliderDebug.value;
    threeScene.add(colliderDebugGroup);
    // Without these the sphere materials render flat — the lights are what make the
    // ball read as round and let the painted markings shade correctly as they tumble.
    for (const light of tableScene.lights) {
      threeScene.add(light);
    }
    renderer = createBilliardsRenderer(canvas);
    resize();
    ready.value = true;
    if (showColliderDebug.value) {
      scheduleColliderDebugSnapshot();
    }

    unregisterRollFrameSync = registerBilliardsRollFrameSyncConsumer(ingestRollFrame);

    void nextTick(() => {
      const scene = sceneRef.value;
      if (scene) {
        refreshBilliardsTableTheme(scene);
      }
      resize();
      // Warm up GPU programs on the idle tick so the first in-game rAF isn't dominated by compile.
      if (renderer && camera && threeScene) {
        renderer.compile(threeScene, camera);
      }
      scheduleRender();
    });

    resizeObserver = new ResizeObserver(() => resize());
    const observeTarget = canvas.parentElement ?? canvas;
    resizeObserver.observe(observeTarget);
  });

  watch(showColliderDebug, (show) => {
    if (colliderDebugGroup) {
      colliderDebugGroup.visible = show;
      if (show) {
        scheduleColliderDebugSnapshot();
      } else {
        colliderDebugSnapshotVersion += 1;
      }
      scheduleRender();
    }
  });

  watch(themeRef, () => {
    if (sceneRef.value) {
      sceneRef.value.themeEl = themeRef.value;
      refreshBilliardsTableTheme(sceneRef.value);
      scheduleRender();
    }
  });

  watch(
    () => [balls.value, poses.value, isRolling.value] as const,
    () => {
      // While Rapier rolls, `emitBilliardsRollFrame` → `ingestRollFrame` already schedules draws.
      // This watch also runs every physics frame (poses ref churn) and would **double** renders.
      if (isRolling.value) {
        return;
      }
      if (showColliderDebug.value) {
        scheduleColliderDebugSnapshot();
      }
      scheduleRender();
    },
  );

  watch(isRolling, (rolling) => {
    if (!rolling && showColliderDebug.value) {
      scheduleColliderDebugSnapshot();
    }
  });

  onBeforeUnmount(() => {
    unregisterRollFrameSync?.();
    unregisterRollFrameSync = null;
    cancelAnimationFrame(renderRaf);
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (colliderDebugGroup && threeScene) {
      threeScene.remove(colliderDebugGroup);
      colliderDebugGroup.traverse((obj) => {
        if (obj instanceof THREE.LineSegments || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (!Array.isArray(mat)) {
            mat.dispose();
          }
        } else if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose());
          } else {
            mat.dispose();
          }
        }
      });
      colliderDebugGroup = null;
    }
    if (threeScene) {
      threeScene.clear();
    }
    const scene = sceneRef.value;
    if (scene) {
      disposeBilliardsTableScene(scene);
    }
    renderer?.dispose();
    renderer = null;
    sceneRef.value = null;
    threeScene = null;
    camera = null;
  });

  return { ready };
}
