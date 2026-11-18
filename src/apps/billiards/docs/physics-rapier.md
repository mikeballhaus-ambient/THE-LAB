# Billiards physics & true-3D ball rendering

Practice and server shot resolution use **[Rapier3D](https://rapier.rs/)** (`@dimforge/rapier3d-compat`)
for rigid-body simulation on a flat table plane (Y-up world, table coordinates mapped to X/Z).
The client animates the shot by stepping the **same** engine, and renders **real spheres** whose
orientation comes straight from `body.rotation()`.

## What makes the roll look real

| Concern | Implementation |
|---------|----------------|
| Geometry | `THREE.SphereGeometry` per scene, shared by every ball (`billiards-three-table.ts`) |
| Orientation | The rigid-body quaternion is applied **verbatim** (`mesh.quaternion.copy`) — no flattening to a 2D angle |
| Material | `MeshPhongMaterial` lit by `createBilliardsLights()` so each ball has a lit/shadow side |
| Markings | Equirectangular `CanvasTexture` — number roundels on the ±Y poles, stripe bands around the equator, measle dots on the cue ball |
| Contact shadow | A soft radial sprite per ball on the cloth, scaled from the ball radius |

> **Do not** go back to `CircleGeometry` discs with `texture.rotation`. That projection only
> carries one scalar (a heading), so the ball's markings can never tumble — the ball slides
> across the felt like a sticker. The sphere + quaternion path costs one draw call and looks
> like a ball.

The only place `texture.rotation` was ever involved was the removed disc path; the roundel
warp in `billiards-three-ball-texture.ts` is what keeps the painted number circular and
readable when the sphere's pole faces the overhead camera.

## Felt contact model (why english works)

Rapier's own tangential friction at the cloth is **disabled** (`setFriction(0)` on the felt
collider). Cloth interaction is resolved once, in `billiards-rolling-kinematics.ts`:

1. Compute the contact-patch slip velocity `u = v + ω × r_c`.
2. While `|u| > 0` the ball is **skidding** — apply a Coulomb impulse capped at `μ·g·dt`,
   targeting the exact `−(2/7)·u` that would establish pure rolling for a solid sphere.
3. Once **not** sliding (`|u|` tiny — effectively rolling), apply rolling resistance; let vertical-axis (side) spin decay. (**Not** while skidding — slip friction already removes energy; applying resistance there made breaks look glued.)
4. Below `FELT_STOP_SPEED` the ball is snapped to rest so a shot terminates promptly.

Because `ω` is never force-snapped to `v/r`, spin survives the shot:

- `englishY = −1` (top of the pad) → **follow** (ω > roll rate, ball runs forward after contact)
- `englishY = +1` (bottom) → **draw** (the ball checks up and reverses)
- `englishX = ±1` → **side spin** about the vertical axis (alters cushion rebound)

Spin is injected by `shotAngularVelocity()` at cue impact and bounded relative to the natural
roll rate, so no pad offset can fling the ball.

## Timestep

`world.timestep` is set to `PHYSICS_DT` (`1/120 s`) to match `PHYSICS_STEP_MS`. Rapier's 1/60
default silently doubled the simulated speed of every shot while the client accumulator advanced
120 Hz of simulated time.

Solver: `integrationParameters.numSolverIterations` / `numInternalPgsIterations` are raised above
Rapier defaults so dense **many-body** contacts (break stacks) resolve with less energy bleed —
applies to every shot, not a special-case break path.

Gravity is **off** (`new RAPIER.World({ x: 0, y: 0, z: 0 })`) — the felt model owns vertical
contact, and `lockBallOnFelt()` keeps each ball centre on the cloth plane.

## Integration order

Each frame: **`world.step()` first**, then `stepBilliardFeltContact()` on every live ball (`advanceFeltContact` in `billiards-rapier-sim.ts`). Felt must **not** run before the step: it rewrites linear/angular velocity, and doing that pre-step shrinks the speeds Rapier uses to resolve **ball–ball** collisions (weak impacts).

## Pockets

Between **sink-zone** entry and **capture** radius, a small inward velocity nudge helps balls fall. That nudge is **softer** than the original 6% per-step damping + fixed inward push, and is skipped when planar speed is above `POCKET_SINK_ATTRACT_MAX_PLANAR_SPEED` so balls **transiting** the corner mouth at break speed are not pulled into the pocket cluster every substep (same rule for all shots).

In that **throat** annulus, `stepBilliardFeltContact` also skips the **`FELT_STOP_SPEED` hard stop** — the global cloth “snap to rest” was zeroing motion while the ball still overlapped the lip, which read as the ball giving up rolling at the pocket.

## Modules

| Module | Role |
|--------|------|
| `shared/billiards-rapier-init.ts` | One-time WASM init (`ensureBilliardsRapier()`) |
| `shared/billiards-rolling-kinematics.ts` | Slip → roll friction, rolling resistance, cue spin |
| `shared/billiards-rapier-cushions.ts` | Felt plane (frictionless) + fixed cuboid cushion colliders (`getBilliardsTableColliderDescriptors()` describes the same layout for docs/tests) |
| `shared/billiards-three-collider-debug.ts` | **Show colliders:** vertex-colored **`LineSegments`** from Rapier **`world.debugRender()`** only (no hand-built boxes). Idle: `updateBilliardsRapierColliderDebugSnapshot` builds a one-step world (table + balls). Live shot: `stepRapierShotSession` refreshes buffers each step — `depthTest: false` + high `renderOrder` |
| `shared/billiards-rapier-sim.ts` | Shot session: balls, impulses, pockets, first-hit, 120 Hz step |
| `shared/billiards-physics.ts` | `simulateShot()` for server/tests |
| `shared/billiards-three-ball-texture.ts` | Equirectangular ball maps (roundels, stripes, measles) |
| `shared/billiards-overhead-ball-display.ts` | Body quaternion → mesh orientation helpers |
| `shared/billiards-three-table.ts` | Scene, sphere meshes, lights, contact shadows, camera |
| `shared/billiards-roll-quat.ts` | Client fallback roll integration when no body quaternion exists |
| `front-end/composables/useBilliardsRollAnimation.ts` | Live Rapier stepping synced to `requestAnimationFrame` |
| `front-end/composables/useBilliardsThreeTable.ts` | Canvas lifecycle, per-frame sync, disposal |
| `front-end/components/BilliardsTable3D.vue` | WebGL canvas in the playfield |

Cushion **colliders** are simply the six lines in `CUSHION_LINES` ([`table-cushion-wall-segments.ts`](src/apps/billiards/shared/table-cushion-wall-segments.ts)): the top and bottom rails each split in two around the middle pocket, and the left and right rails running between the corner pockets. **That list is the entire cushion geometry** — one cuboid per line, no clipping pass, no pocket maths, no per-pocket special cases. To move a cushion, change a number.

**The gaps do the work.** Each rail stops short of the pocket it faces: the corner gaps are wide enough for a ball (Ø34) to pass on the diagonal, and the middle gaps are wide enough to drop into. A rail that ran all the way to the pocket edge would present a flat 90° end for the ball to bounce off and the pocket would play as sealed — that was the original bug, where the two corner rail tips sat only ~41 units apart and corner pockets rejected **every** approach angle.

Measured with this layout: all six pockets are reachable to capture depth, middle pockets pot across ±45°, and corner pockets pot from roughly ±25°.

Each Rapier cuboid uses half-thickness `CUSHION_HALF_THICK` / `CUSHION_COLLIDER_HALF_THICK` on local Z — shifted **outward** so the **inboard** face meets the segment line. Ball-centre clamp limits still use `cushionWallContactCenters()` in `table-bumper-physics.ts` (nose + inset for resting on rubber). **Table chrome** draws the full mitered strips plus the pocket mask. Pocketing uses **distance-to-pocket-centre** capture in `billiards-rapier-sim.ts` once the ball is in the throat. Cushion restitution is **`CUSHION_RAIL_RESTITUTION`** for all cushion bodies.

**Show colliders:** **`syncBilliardsRapierColliderDebug`** draws **only** Rapier `debugRender` line soup (`getBilliardsRapierDebugLineBuffers`). **Idle:** `updateBilliardsRapierColliderDebugSnapshot` creates a throwaway world with felt + cushions + **fixed** ball colliders at current `x,y`, steps once, and captures lines — no shot required. **During a shot:** `stepRapierShotSession` updates the same buffers after every `world.step()`. When a roll ends, `useBilliardsRollAnimation` calls `updateBilliardsRapierColliderDebugSnapshot` so the overlay does not go blank.

Ball **restitution**, ball–ball **tangential friction**, and **`BILLIARDS_MAX_CUE_SPEED`** (impulse scales with pull power × this cap) live in `billiards-types.ts` / `billiards-rapier-sim.ts`; all cloth tuning lives at the top of `billiards-rolling-kinematics.ts`. Ball–ball friction is kept **low** (~0.06): high values made rack impacts bleed energy through persistent contact manifolds (weak breaks).

Server startup and the billiards app client call `ensureBilliardsRapier()` before stepping physics.
