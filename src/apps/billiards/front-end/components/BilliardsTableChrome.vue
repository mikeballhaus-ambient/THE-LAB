<script setup lang="ts">
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  TABLE_BUMPER_POCKET_CUT_PAD,
  TABLE_CHROME_BLEED,
  TABLE_CLOTH_CORNER_RADIUS,
  TABLE_CORNER_RADIUS,
  TABLE_HEIGHT,
  TABLE_RAIL_INSET,
  TABLE_WIDTH,
} from '../../shared/billiards-types';
import {
  POCKET_WELL_PAD,
  cornerWoodEarFillPaths,
  cornerWoodEarMaskPaths,
  pocketMaskCircles,
  tablePocketVisuals,
  tableRailSightPoints,
} from '../../shared/table-pocket-visual';
import type { TableRailBumperBand } from '../../shared/table-rail-bumpers';
import { tableRailBumperBands } from '../../shared/table-rail-bumpers';

const { generateUniqueId } = useUniqueElementId();

const props = withDefaults(
  defineProps<{ frameOnly?: boolean; showRailBumpers?: boolean }>(),
  { showRailBumpers: true },
);
const { frameOnly } = props;

/**
 * Host covers the playfield exactly — **no** margin inset.
 *
 * The Three.js camera maps `0…1000 × 0…500` onto the full playfield box. If this SVG box
 * is any larger, its viewBox spans more table units across more pixels and the two scales
 * diverge, so the chrome disc and the WebGL well drift apart — visible as the corner
 * pocket sitting off-centre inside its surround.
 *
 * The apron still extends past the playfield: `.billiards-table-chrome` is
 * `overflow: visible`, so geometry drawn outside the viewBox renders outside the box.
 */
const chromeHostStyle = computed(() =>
  frameOnly ? ({ inset: '0' } as const) : ({ inset: `-${TABLE_CHROME_BLEED}px` } as const),
);

/** Table coordinates only — keeps 1 unit = 1 camera unit so the layers stay aligned. */
const chromeViewBox = `0 0 ${TABLE_WIDTH} ${TABLE_HEIGHT}`;

/**
 * Outer wood margin.
 *
 * The apron previously ended exactly at the table's own bounds (0…1000 × 0…500), and the
 * corner pockets sit at 36 — so only 6 units of wood lay outside each pocket, reading as
 * holes punched through the very edge. A real table has a substantial rail body around the
 * pockets. Extending the wood past the playfield by this margin lets the pockets sit inset.
 *
 * The SVG viewBox grows to match (see `chromeViewBox`) so nothing is clipped.
 */
const WOOD_MARGIN = 14;

/**
 * Outer apron corner radius — deliberately tight.
 *
 * This must stay well below `CORNER_POCKET_CENTER_AXIS` (36). With margin `M` and radius
 * `R` the corner arc is centred at `(-M+R, -M+R)`, so the pocket at (36,36) is inside the
 * rounded region only while `R <= √2·(36 + M − R)`.
 *
 * Using the concentric `TABLE_CORNER_RADIUS + WOOD_MARGIN` = 92 put the arc centre at
 * (66,66): only 42 units from the pocket, *less* than the radius, so the corner pocket fell
 * outside the wood and read as offset. A real table has tight outer corners anyway — the
 * heavy rounding was the awkward part of the silhouette.
 */
const WOOD_CORNER_RADIUS = 18;

/**
 * Cloth inner-shadow radius, clamped at zero.
 *
 * `TABLE_CLOTH_CORNER_RADIUS` is 0 (square cloth corners), so the decorative insets
 * `r - 2` / `r - 3` went negative. An SVG `rx` must be non-negative — Chromium rejects it
 * outright, which is the `<rect> attribute rx: A negative value is not valid. ("-3")`
 * error logged on every mount.
 */
function clothInnerRadius(inset: number): number {
  return Math.max(0, TABLE_CLOTH_CORNER_RADIUS - inset);
}

const woodPatternId = generateUniqueId('billiards-wood-pattern');
const woodGradientId = generateUniqueId('billiards-wood-grad');
const cushionGradientId = generateUniqueId('billiards-cushion-grad');
const clothGradientId = generateUniqueId('billiards-cloth-grad');
const pocketDepthId = generateUniqueId('billiards-pocket-depth');
const railBumperShadeGradientId = generateUniqueId('billiards-rail-bumper-shade');
const railBumperShadeVerticalGradientId = generateUniqueId('billiards-rail-bumper-shade-v');
const clothMaskId = generateUniqueId('billiards-cloth-mask');
const railTrimMaskId = generateUniqueId('billiards-rail-trim-mask');
const railTrimMask3dId = generateUniqueId('billiards-rail-trim-mask-3d');
const railBumperPocketMaskId = generateUniqueId('billiards-rail-bumper-pocket-mask');
const woodSurfaceMaskId = generateUniqueId('billiards-wood-surface-mask');
const woodSurfaceMask3dId = generateUniqueId('billiards-wood-surface-mask-3d');

/** Wood is cut at the pocket throats when the WebGL canvas supplies the pocket wells. */
const woodMaskRef = computed(() =>
  frameOnly ? `url(#${woodSurfaceMask3dId})` : `url(#${woodSurfaceMaskId})`,
);

const clothX = TABLE_RAIL_INSET;
const clothY = TABLE_RAIL_INSET;
const clothW = TABLE_WIDTH - TABLE_RAIL_INSET * 2;
const clothH = TABLE_HEIGHT - TABLE_RAIL_INSET * 2;

const pockets = computed(() => tablePocketVisuals());
const cornerWoodEarMasks = computed(() => cornerWoodEarMaskPaths(pockets.value));
const cornerWoodEarFills = computed(() => cornerWoodEarFillPaths(pockets.value));
const clothCuts = computed(() => pocketMaskCircles(pockets.value, 'cloth'));
const railBumpers = computed(() =>
  tableRailBumperBands(
    pockets.value,
    clothX,
    clothY,
    clothW,
    clothH,
    TABLE_CLOTH_CORNER_RADIUS,
  ),
);

const railSightPoints = computed(() => tableRailSightPoints());

function railBumperFill(band: TableRailBumperBand): string {
  const grad =
    band.edge === 'left' || band.edge === 'right'
      ? railBumperShadeVerticalGradientId
      : railBumperShadeGradientId;
  return `url(#${grad})`;
}
</script>

<template>
  <div class="billiards-table-chrome-host" :style="chromeHostStyle">
  <svg
    class="billiards-table-chrome"
    :viewBox="chromeViewBox"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    <defs>
      <pattern :id="woodPatternId" patternUnits="userSpaceOnUse" width="64" height="16">
        <rect width="64" height="16" fill="var(--billiards-wood-base)" />
        <path
          d="M0 6 Q16 2 32 6 T64 6"
          fill="none"
          stroke="var(--billiards-wood-grain)"
          stroke-width="1.6"
          opacity="0.65"
        />
        <path
          d="M0 12 Q16 14 32 12 T64 12"
          fill="none"
          stroke="var(--billiards-wood-grain-dark)"
          stroke-width="1.1"
          opacity="0.5"
        />
      </pattern>
      <linearGradient
        :id="woodGradientId"
        gradientUnits="userSpaceOnUse"
        :x1="0"
        :y1="0"
        :x2="TABLE_WIDTH"
        :y2="TABLE_HEIGHT"
      >
        <stop offset="0%" stop-color="var(--billiards-wood-highlight)" />
        <stop offset="100%" stop-color="var(--billiards-wood-shadow)" />
      </linearGradient>
      <linearGradient :id="cushionGradientId" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="var(--billiards-cushion-light)" />
        <stop offset="100%" stop-color="var(--billiards-cushion-dark)" />
      </linearGradient>
      <linearGradient :id="clothGradientId" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="var(--billiards-cloth-light)" />
        <stop offset="50%" stop-color="var(--billiards-cloth-mid)" />
        <stop offset="100%" stop-color="var(--billiards-cloth-dark)" />
      </linearGradient>
      <radialGradient :id="pocketDepthId" cx="50%" cy="42%" r="58%">
        <stop offset="0%" stop-color="var(--billiards-pocket-inner)" />
        <stop offset="100%" stop-color="var(--billiards-pocket-outer)" />
      </radialGradient>
      <!-- Across bumper thickness (top/bottom rails). -->
      <linearGradient :id="railBumperShadeGradientId" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="var(--billiards-bumper-light)" />
        <stop offset="45%" stop-color="var(--billiards-bumper-mid)" />
        <stop offset="100%" stop-color="var(--billiards-bumper-dark)" />
      </linearGradient>
      <!-- Across bumper thickness (left/right rails) — not top-to-bottom along the rail. -->
      <linearGradient :id="railBumperShadeVerticalGradientId" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="var(--billiards-bumper-light)" />
        <stop offset="45%" stop-color="var(--billiards-bumper-mid)" />
        <stop offset="100%" stop-color="var(--billiards-bumper-dark)" />
      </linearGradient>


      <mask :id="clothMaskId">
        <rect :x="clothX" :y="clothY" :width="clothW" :height="clothH" :rx="TABLE_CLOTH_CORNER_RADIUS" fill="white" />
        <circle
          v-for="(c, i) in clothCuts"
          :key="`cloth-cut-${i}`"
          :cx="c.cx"
          :cy="c.cy"
          :r="c.r"
          fill="black"
        />
      </mask>

      <mask :id="railTrimMaskId">
        <rect
          :x="-WOOD_MARGIN"
          :y="-WOOD_MARGIN"
          :width="TABLE_WIDTH + WOOD_MARGIN * 2"
          :height="TABLE_HEIGHT + WOOD_MARGIN * 2"
          :rx="WOOD_CORNER_RADIUS"
          fill="white"
        />
        <rect
          :x="clothX"
          :y="clothY"
          :width="clothW"
          :height="clothH"
          :rx="TABLE_CLOTH_CORNER_RADIUS"
          fill="black"
        />
      </mask>

      <!-- Rail trim (wood only) matching the 3D throat cut-outs. -->
      <mask :id="railTrimMask3dId">
        <rect
          :x="-WOOD_MARGIN"
          :y="-WOOD_MARGIN"
          :width="TABLE_WIDTH + WOOD_MARGIN * 2"
          :height="TABLE_HEIGHT + WOOD_MARGIN * 2"
          :rx="WOOD_CORNER_RADIUS"
          fill="white"
        />
        <rect
          :x="clothX"
          :y="clothY"
          :width="clothW"
          :height="clothH"
          :rx="TABLE_CLOTH_CORNER_RADIUS"
          fill="black"
        />
        <circle
          v-for="p in pockets"
          :key="`rail-trim-hole-3d-${p.simX}-${p.simY}`"
          :cx="p.cx"
          :cy="p.cy"
          :r="p.r + 3"
          fill="black"
        />
      </mask>

      <!--
        Cut **rubber** back from the pocket opening: radius = mouth `p.r` + `TABLE_BUMPER_POCKET_CUT_PAD`
        (same pad as nose-segment chord math in `table-rail-bumpers.ts`). Previously `p.r - 2` let filled
        bumpers read into the hole. Well / inset layers still use `p.r` for wood and felt.
      -->
      <mask :id="railBumperPocketMaskId">
        <rect
          :x="-WOOD_MARGIN"
          :y="-WOOD_MARGIN"
          :width="TABLE_WIDTH + WOOD_MARGIN * 2"
          :height="TABLE_HEIGHT + WOOD_MARGIN * 2"
          fill="white"
        />
        <circle
          v-for="p in pockets"
          :key="`bumper-pocket-cut-${p.simX}-${p.simY}`"
          :cx="p.cx"
          :cy="p.cy"
          :r="Math.max(16, p.r + TABLE_BUMPER_POCKET_CUT_PAD)"
          fill="black"
        />
      </mask>

      <!-- Wood stays visible around pocket throats; only the hole interior is cut. -->
      <mask :id="woodSurfaceMaskId">
        <rect
          :x="-WOOD_MARGIN"
          :y="-WOOD_MARGIN"
          :width="TABLE_WIDTH + WOOD_MARGIN * 2"
          :height="TABLE_HEIGHT + WOOD_MARGIN * 2"
          :rx="WOOD_CORNER_RADIUS"
          fill="white"
        />
        <path
          v-for="(d, i) in cornerWoodEarMasks"
          :key="`wood-ear-${i}`"
          :d="d"
          fill="white"
        />
        <circle
          v-for="p in pockets"
          :key="`wood-hole-${p.simX}-${p.simY}`"
          :cx="p.cx"
          :cy="p.cy"
          :r="p.r"
          fill="black"
        />
      </mask>

      <!--
        Wood mask for the WebGL frame.

        The 3D pocket wells are r + 2, and the wood apron rects are clipped only to the
        cloth *rectangle* — which does not carve the pocket throats. Any wood painted in
        the band between the mouth radius and the well edge therefore leaked into the
        open hole as a bright grain crescent, which is what made the pockets read as
        painted circles. This cuts each throat 1 unit wider than the well so the hole is
        genuinely clear on every side, with no left/right asymmetry.
      -->
      <mask :id="woodSurfaceMask3dId">
        <rect
          :x="-WOOD_MARGIN"
          :y="-WOOD_MARGIN"
          :width="TABLE_WIDTH + WOOD_MARGIN * 2"
          :height="TABLE_HEIGHT + WOOD_MARGIN * 2"
          :rx="WOOD_CORNER_RADIUS"
          fill="white"
        />
        <path
          v-for="(d, i) in cornerWoodEarMasks"
          :key="`wood-ear-3d-${i}`"
          :d="d"
          fill="white"
        />
        <circle
          v-for="p in pockets"
          :key="`wood-hole-3d-${p.simX}-${p.simY}`"
          :cx="p.cx"
          :cy="p.cy"
          :r="p.r + 3"
          fill="black"
        />
      </mask>
    </defs>

    <!-- Wood apron (masked so grain wraps corner pockets; frame-only cuts out cloth for 3D) -->
    <!--
      Outer apron — extends `WOOD_MARGIN` past the playfield on every side so each pocket
      sits inset in wood rather than flush against the table edge. Masked so the cloth
      opening and pocket throats stay clear.
    -->
    <rect
      :x="-WOOD_MARGIN"
      :y="-WOOD_MARGIN"
      :width="TABLE_WIDTH + WOOD_MARGIN * 2"
      :height="TABLE_HEIGHT + WOOD_MARGIN * 2"
      :rx="WOOD_CORNER_RADIUS"
      :fill="`url(#${woodPatternId})`"
      :mask="`url(#${frameOnly ? railTrimMask3dId : woodSurfaceMaskId})`"
    />
    <rect
      :x="-WOOD_MARGIN"
      :y="-WOOD_MARGIN"
      :width="TABLE_WIDTH + WOOD_MARGIN * 2"
      :height="TABLE_HEIGHT + WOOD_MARGIN * 2"
      :rx="WOOD_CORNER_RADIUS"
      :fill="`url(#${woodGradientId})`"
      opacity="0.45"
      :mask="`url(#${frameOnly ? railTrimMask3dId : woodSurfaceMaskId})`"
    />
    <rect
      :x="5 - WOOD_MARGIN"
      :y="5 - WOOD_MARGIN"
      :width="TABLE_WIDTH - 10 + WOOD_MARGIN * 2"
      :height="TABLE_HEIGHT - 10 + WOOD_MARGIN * 2"
      :rx="TABLE_CORNER_RADIUS - 6 + WOOD_MARGIN"
      fill="none"
      class="billiards-table-chrome__wood-frame"
    />

    <!--
      NOTE: there is deliberately no "cushion band" rectangle here.

      The visible cushion comes from `.billiards-table-chrome__rail-bumpers` further down —
      per-edge strips built by `tableRailBumperBands()` and cut around each pocket mouth.
      Those ARE the rubber, and they are positioned off the *cloth* line (cloth − 5 →
      cloth + 3), which is what makes them read as rails.

      The old `cushionW/H` rectangle was inset 54 while the cloth rect is inset 30, so it
      sat entirely INSIDE the playing surface rather than in the rail band. It painted
      rubber across the felt and was only ever invisible because the cloth rect covered it
      afterwards in the flat preview. Hoisting it out for the WebGL frame is what exposed
      it as the pale rounded rectangle on top of the table.
    -->

    <!-- Flat cloth fill: preview only. The game uses the WebGL felt mesh. -->
    <g v-if="!frameOnly">
    <rect
      :x="clothX"
      :y="clothY"
      :width="clothW"
      :height="clothH"
      :rx="TABLE_CLOTH_CORNER_RADIUS"
      :fill="`url(#${clothGradientId})`"
      :mask="`url(#${clothMaskId})`"
    />

    <rect
      :x="clothX + 2"
      :y="clothY + 2"
      :width="clothW - 4"
      :height="clothH - 4"
      :rx="clothInnerRadius(2)"
      fill="none"
      class="billiards-table-chrome__cloth-shadow"
      :mask="`url(#${clothMaskId})`"
    />
    </g>

    <rect
      v-if="frameOnly"
      :x="clothX + 3"
      :y="clothY + 3"
      :width="clothW - 6"
      :height="clothH - 6"
      :rx="clothInnerRadius(3)"
      fill="none"
      class="billiards-table-chrome__cloth-shadow billiards-table-chrome__cloth-shadow--3d"
      :mask="`url(#${clothMaskId})`"
    />

    <g
      v-if="props.showRailBumpers"
      class="billiards-table-chrome__rail-bumpers"
      :mask="`url(#${railBumperPocketMaskId})`"
    >
      <path
        v-for="(band, i) in railBumpers"
        :key="`rail-bumper-${band.edge}-${i}`"
        :d="band.d"
        :fill="railBumperFill(band)"
        class="billiards-table-chrome__rail-bumper"
      />
      <path
        v-for="(band, i) in railBumpers"
        :key="`rail-bumper-nose-${band.edge}-${i}`"
        :d="band.noseD"
        class="billiards-table-chrome__rail-bumper-nose"
        fill="none"
      />
    </g>

    <!-- Wood ears wrap *around* the corner pocket throats. In the WebGL frame the pocket
         cavity is no longer painted here (it lives under the balls in Three.js), so these
         fills must be clipped to the wood surface or the grain shows straight through the
         open hole. -->
    <!--
      Always masked. These ear paths are derived from `CORNER_WOOD_WRAP_PAD` and reach
      further out than the tightened `WOOD_CORNER_RADIUS` apron, so unmasked they poked
      past the outer silhouette as those diagonal bulges at each corner.
    -->
    <path
      v-for="(d, i) in cornerWoodEarFills"
      :key="`wood-ear-fill-${i}`"
      :d="d"
      :fill="`url(#${woodPatternId})`"
      :mask="woodMaskRef"
    />
    <path
      v-for="(d, i) in cornerWoodEarFills"
      :key="`wood-ear-grad-${i}`"
      :d="d"
      :fill="`url(#${woodGradientId})`"
      opacity="0.45"
      :mask="woodMaskRef"
    />

    <g class="billiards-table-chrome__rail-sights">
      <circle
        v-for="(s, i) in railSightPoints"
        :key="`rail-sight-${i}`"
        :cx="s.cx"
        :cy="s.cy"
        r="4.2"
        class="billiards-table-chrome__rail-sight"
      />
    </g>

    <!-- Pocket cavities. Drawn only for the flat SVG cloth; in the WebGL frame the
         wells belong *under* the balls, so they live in Three.js (see
         `buildBilliardsTableScene`). Painting them here would put the hole's z-index
         above the canvas and make a sinking ball vanish instead of dropping. -->
    <g v-if="!frameOnly" class="billiards-table-chrome__pockets">
      <circle
        v-for="p in pockets"
        :key="`depth-${p.simX}-${p.simY}`"
        :cx="p.cx"
        :cy="p.cy"
        :r="p.r"
        :fill="`url(#${pocketDepthId})`"
      />
    </g>

    <!-- Pocket jaws + rail caps -->
    <g class="billiards-table-chrome__pocket-trim">
      <!--
        Side and corner pockets: one concentric ring at well radius (`r + POCKET_WELL_PAD`),
        masked to **wood only** (same `railTrimMaskId` as side pockets). Corners used to skip
        this mask so the stroke sat on cloth/wood flat — under the 3D frame it read as missing
        the bright inner rim next to the apron. Corner rings are no longer duplicated in WebGL.
      -->
      <template v-for="p in pockets" :key="`trim-${p.simX}-${p.simY}`">
        <circle
          :cx="p.cx"
          :cy="p.cy"
          :r="p.r + POCKET_WELL_PAD"
          class="billiards-table-chrome__pocket-lip"
          fill="none"
          :mask="`url(#${railTrimMaskId})`"
        />
      </template>
    </g>
  </svg>
  </div>
</template>

<style scoped>
.billiards-table-chrome {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: visible;
}

.billiards-table-chrome-host {
  position: absolute;
  overflow: visible;
  pointer-events: none;
  z-index: 2;
}

.billiards-table-chrome__wood-frame {
  stroke: var(--billiards-chrome-stroke);
  stroke-width: 2;
  opacity: 0.55;
}

.billiards-table-chrome__cushion-edge {
  stroke: var(--billiards-chrome-stroke);
  stroke-width: 1.5;
  opacity: 0.45;
}

.billiards-table-chrome__cloth-shadow {
  stroke: var(--billiards-cloth-shadow);
  stroke-width: 5;
  opacity: 0.22;
}

.billiards-table-chrome__cloth-shadow--3d {
  stroke-width: 3;
  opacity: 0.14;
}

.billiards-table-chrome__pocket-jaw {
  stroke: color-mix(in srgb, var(--lab-general-text) 38%, var(--lab-general-border));
  stroke-width: 3.5;
  opacity: 0.45;
}

.billiards-table-chrome__pocket-lip {
  stroke: color-mix(in srgb, var(--lab-general-text-muted) 72%, var(--lab-general-border));
  stroke-width: 3;
  stroke-linecap: round;
  opacity: 0.85;
}

.billiards-table-chrome__rail-bumper {
  stroke: var(--billiards-bumper-dark);
  stroke-width: 1.25;
  opacity: 1;
}

.billiards-table-chrome__rail-bumper-nose {
  stroke: var(--billiards-bumper-nose);
  stroke-width: 2;
  opacity: 0.9;
}

.billiards-table-chrome__rail-sight {
  fill: color-mix(in srgb, var(--lab-general-text-muted) 55%, var(--billiards-wood-highlight));
  stroke: color-mix(in srgb, var(--lab-general-text) 35%, var(--billiards-wood-grain-dark));
  stroke-width: 1.2;
}

</style>
