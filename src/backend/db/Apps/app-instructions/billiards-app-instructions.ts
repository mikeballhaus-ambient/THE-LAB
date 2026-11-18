/**
 * App system instructions for Billiards (seeded into apps.app_system_instructions).
 *
 * Registry id: `app-billiards` · slug: `billiards` · hybrid · app port 4119.
 */

export const billiardsAppInstructions = `# App System Instructions: Billiards

## Overview

\`app-billiards\` is a **hybrid** catalog game on the **shared game-platform kit**. UI: \`src/apps/billiards/front-end/App.vue\`; app server on **\`props.serverUrl\`** (port **4119**).

**Modes:**
| Mode | Catalog \`gameId\` | Phase |
|------|-------------------|--------|
| **Practice (solo)** | \`billiards-practice\` | Shipped — layout editor + shots (\`opponent_kind: solo\`) |
| **Vs Lab Assistant** | \`billiards\` | Shipped — \`billiards_submit_shot\`, lobby rules **8-ball** or **9-ball**; random break each frame (\`openingTurnSeat\` / kit starting seat) |
| **Friend (PvP)** | \`billiards\` | Shipped — Lab Messages invite (\`useGameInvites\`); same replay pipeline and \`stateRevision\` ordering as vs AI; **optional Quarks wager** on invite (\`wagerQuarks\` on invite rules + match state) |

Practice is permanent product surface (not a throwaway test harness). Reference solo UX: \`app-solitaire\`; reference multiplayer kit: \`app-chess\`.

## Authority

Rules, layout validation, and shot physics live in \`src/apps/billiards/shared/\` and \`back-end/adapter.ts\`. **Shot resolution uses Rapier3D** (\`shared/billiards-rapier-sim.ts\`; see \`src/apps/billiards/docs/physics-rapier.md\`). **Authoritative sync contract:** \`src/apps/billiards/docs/authoritative-sync.md\` — server \`state_json\` owns felt layout; client preview only during live roll or human shot ack (\`billiards-felt-layout.ts\`). The client may step Rapier in \`useBilliardsRollAnimation\` (preview); **Three.js** (\`BilliardsTable3D.vue\`) displays authoritative or preview per that contract. Shots use \`stampShotWithAuthoritativeCue\` + \`resolveShotForSimulation\` on server and client. The table UI sends moves via \`useTurnBasedMatch().submitMove\`. All drags use \`@vue-dnd-kit/core\`.

## Rendering & physics invariants (do not regress)

- Balls are **spheres** (\`THREE.SphereGeometry\` + \`MeshPhongMaterial\` + \`createBilliardsLights()\`), oriented by the Rapier body quaternion **verbatim**. Never replace them with flat \`CircleGeometry\` discs or drive roll with \`texture.rotation\` — that projection carries a single heading and cannot tumble.
- Ball markings are equirectangular maps in \`shared/billiards-three-ball-texture.ts\` (number roundels on the ±Y poles, stripe bands at the equator, measle dots on the cue ball). Markings ride the real orientation; keep the roundel pole-warp so numbers stay circular from overhead.
- Cloth contact is owned by \`shared/billiards-rolling-kinematics.ts\` (slip → roll friction, rolling resistance after slip ends, side-spin decay). The felt collider is **frictionless** on purpose; do not re-enable Rapier tangential friction on it. Ball–ball colliders use **low** tangential friction (~0.06) — high values made breaks look glued.
- \`world.timestep\` must stay equal to \`PHYSICS_DT\` (1/120 s). Rapier's 1/60 default doubled shot speed.
- Rapier \`integrationParameters.numSolverIterations\` / \`numInternalPgsIterations\` are raised above defaults for dense ball–ball stacks (energy not artificially break-only).
- Pocket throat: inward velocity nudge in the sink zone is **skipped** when planar speed is high; when slow, nudge is **gentler** than before. In the throat annulus the felt pass skips the \`FELT_STOP_SPEED\` hard snap so the lip does not read like instant stop.
- **English is functional**: \`englishY\` −1 follow / +1 draw, \`englishX\` ±1 side spin, applied at impact by \`shotAngularVelocity()\`. Angular velocity must never be force-snapped back to the rolling condition each step.
- **Step order**: Rapier \`world.step()\` runs **before** the custom felt pass (\`stepBilliardFeltContact\` / \`advanceFeltContact\`) so ball–ball collisions see full pre-felt speeds; felt-only braking must not run pre-step.
- **Cushion colliders**: cuboids are offset **outward** from the contact line by \`CUSHION_HALF_THICK\` so half-thickness does not cover pocket throats (jaw shots were blocked when the body sat centred on the line).

## Practice flow

\`phase\`: \`setup\` → (\`layout/lock\`) → \`aim\` → (\`shot\`) → \`aim\` or \`place_cue\` after scratch.

Move types: \`layout/autoRack\`, \`layout/clear\`, \`layout/placeBall\`, \`layout/addBall\`, \`layout/lock\`, \`layout/endPractice\`, \`layout/reopen\` (free profile only — UI **Edit layout** returns to setup with balls on table), \`cue/place\`, \`shot\`.

**Testing:** In free practice after layout is locked, sidebar **Show colliders** (beside **Edit layout**) toggles a Three.js wireframe of the **Rapier** felt plane and cushion cuboids (\`getBilliardsTableColliderDescriptors\` / \`billiards-three-collider-debug.ts\`). Ball colliders are not drawn.

Lobby rules: **8-ball**, **9-ball**, or **open practice**. Competitive frames store \`continueTurnSeat\` from kit \`startingSeat\` (coin flip per match). Cue UI uses dnd-kit aim/pull handles plus english pad. Power can reach **0%** — releasing at 0% **cancels** the shot (no \`shot\` move).

**Ball in hand:** \`placementZone\` is authoritative (\`kitchen\` on a break foul, else \`table\`). **Wrong object first** (eight-ball wrong group / eight first with group left, nine-ball not lowest) is **turn over only** — cue stays on table; scratches and kitchen/head-string fouls still award ball in hand.
 \`canPlaceBallAt\` treats a **missing** zone as \`table\` and always enforces felt bounds + pocket-mouth exclusion — an unknown zone must never validate off-table coordinates. The client mirrors this: \`scratchBallInHandPlacementZone\` / \`resolveBilliardsEffectivePlacementZone\` — \`kitchen\` only when \`shotsTaken === 0\` on a scratch (break foul); \`table\` (anywhere on the felt) on every later scratch; kitchen overlays render **only** for kitchen-restricted ball in hand.

Collected-pocket tray: DOM/CSS ball; **roll angle** from tray travel (\`d theta = ds / r\` in px) via \`rotateZ\` on shell + markings — not Rapier, not overlay specks. Motion is **visual**: constant speed (px/s, linear — \`TRAY_VISUAL_SPEED_PX_PER_SEC\` in \`useBilliardsCollectedTray.ts\`). New balls get an **initial** rotation offset from the known entry → final slot path so the cumulative roll ends at **upright** (no post-stop correction); packed-slot shuffles slide with \`rollAngleDeg\` held at 0. **Timing:** a ball starts rolling as soon as the roll simulation marks it pocketed — the stagger is per batch of balls sunk in the same sync pass, never a frame-global pocket counter, so later pockets in a long shot do not wait for the table animation to finish.

**Shot hints (testing, default on):** While the player can shoot (\`BilliardsTable.vue\`), an SVG overlay shows a **geometric** path: cue **surface** toward the first object’s **contact surface**; cue bank bounces **after** that hit use **equal-mass elastic** deflection (object gets the normal direction, cue tangential exit) then **specular banks** (same geometry as open-table but **shorter cap** than shooting into open space); **object chain** is dashed (each hop assumes the struck ball was **at rest**). With **no object** in the aim line, the cue hint is bank segments only, **capped** for length. Logic: \`shared/billiard-shot-hint-paths.ts\` (\`computeBilliardsShotHintPaths\`). It is not Rapier — english, friction, and real cushion facets differ from the resolved shot. Competitive matches: **Shot path preview** costs Quarks (\`hint_purchase\`, SKU \`shot-path\`, 50) per shot via \`POST /api/game-hints/purchase\`; **practice** shows paths free. Dev: mock purchase button when \`VITE_LAB_GAME_HINT_DEV_MOCK\` allows.

Solo matches: socket \`billiards:match:create-solo\` / HTTP \`POST /api/matches/solo\`.

## Vs Lab Assistant

- Agent prompts: \`back-end/agent.ts\` + strategy/difficulty modules. **AIM HINTS** (\`billiards-agent-aim-hints.ts\`): tiered density (boss: all **EASY MAKE**, 14 ranked lines, 1-decimal pocket aimDeg, cut vs center-hit warnings, optional Suggested tool args); legal first-contact ball list; rejection hints name nearest line. LLM submits the shot — no server rewrite (\`billiards-agent-shot-policy.ts\` pass-through).
- Structural tools \`billiards_submit_shot\` (aim) and \`billiards_place_cue\` (ball in hand); purpose \`billiards.billiards.agent-turn\`; **reasoningEffort: none** on agent turns.
- Opponent placement replays on the client via \`lastCuePlaceReplay\` (drag-style animation from the kitchen/spare-cue origin).
- Vs matches: dual pocket trays above the table (you vs opponent) with \`pocketedBySeat\` on balls; practice keeps the single collected tray.
- **Quarks (optional):** Checkbox in the **Lab Assistant** lobby section — default **no bet**. When on, stake is **fixed per difficulty** (\`src/shared/game-platform/catalog-match-wager.ts\`: easy 50, medium 250, hard 500, boss 1000; lobby via \`useCatalogGameWagerLobby\`). Server validates on \`match:create-ai\`; \`wagerQuarks\` is stored on match state; \`catalogHeadToHeadWagerSettlementLines\` on the eight-ball adapter settles win (+stake) / loss (−stake) at frame end.
- Sidecar table talk: \`shared/billiards-banter-moments.ts\` via \`useTurnBasedMatch({ detectBanterMoment })\` — pockets, scratches/fouls, eight-ball fouls, match end (shared \`detectMatchEndBanterMoment\`). Banter uses ball roster + JSON state in \`format-lab-game-match-state-for-prompt.ts\`. Spoken banter must not use the lab user's display name every line — see \`build-banter-llm-prompt.ts\` (\`BANTER_SPOKEN_NAMING_RULE\`).

## Friend (PvP)

- Lobby: \`BILLIARDS_LOBBY_PVP_ENABLED\` — invite section uses \`GameLobbyModePanel\` + \`sendGameInvite\` with lobby \`rulesProfile\` (\`eight-ball\` / \`nine-ball\` only; open practice is solo).
- Platform: \`createHumanMatch\` + \`match:state\` push on opponent moves; \`applyAuthoritativeMatch\` + \`shouldApplyMatchViewRevision\` guard stale snapshots (ack, push, refresh, agent done).
- Presentation: same \`lastShotReplay.preShotBalls\` job queue for **human** \`opponentKind\` as for AI — no separate PvP animation path.
- Agent / banter: no \`matchAgentTurn\` or Sidecar LLM banter on \`opponentKind: 'human'\` (\`detectBilliardsBanterMoment\` returns null when not vs AI).
- Quarks: optional on invite — lobby checkbox + stake select (50 / 250 / 500 / 1000); \`match:invite-create\` carries \`wagerQuarks\`; \`resolveHumanMatchWagerQuarks\` on the eight-ball adapter; invite envelope \`rules.wagerQuarks\` shown in Lab Messages; \`createHumanMatch\` copies stake into state; PvP \`virtualBankSettlements\` credits winner and debits loser.

User doc: \`docs/apps/billiards.md\`.
`;
