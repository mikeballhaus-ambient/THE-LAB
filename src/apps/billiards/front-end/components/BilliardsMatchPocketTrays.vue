<script setup lang="ts">
import { LAB_ASSISTANT_FLASK_ICON_CLASSES } from '@/shared/constants/lab-game-assistant-opponent';
import type { BilliardsRulesProfile } from '../../shared/billiards-types';
import type { CollectedTrayBallView } from '../composables/useBilliardsCollectedTray';
import BilliardsCollectedBallTray from './BilliardsCollectedBallTray.vue';

defineProps<{
  humanTrayBalls: CollectedTrayBallView[];
  opponentTrayBalls: CollectedTrayBallView[];
  humanLabel: string;
  opponentLabel: string;
  rulesProfile: BilliardsRulesProfile;
  surfaceStyle: Record<string, string>;
  borderClass: string;
  /** Eight-ball: legal group balls sunk, e.g. `2/7`. Omitted on open table or nine-ball. */
  humanProgressLabel?: string | null;
  opponentProgressLabel?: string | null;
  humanCountGroupTag?: string | null;
  opponentCountGroupTag?: string | null;
  /** Nine-ball: group progress does not apply — hide title counts when empty. */
  showProgressCounts?: boolean;
  /** Vs match left column — stack You then opponent instead of side-by-side. */
  stacked?: boolean;
}>();

const emit = defineEmits<{
  measureHuman: [widthPx: number];
  measureOpponent: [widthPx: number];
}>();
</script>

<template>
  <div
    class="billiards-match-pocket-trays grid w-full max-w-full grid-cols-1 items-end gap-3"
    :class="stacked ? '' : 'min-[720px]:grid-cols-2'"
  >
    <BilliardsCollectedBallTray
      class="min-w-0 w-full max-w-full overflow-hidden"
      :balls="humanTrayBalls"
      :surface-style="surfaceStyle"
      :border-class="borderClass"
      :title="humanLabel"
      :lead="rulesProfile === 'eight-ball' ? undefined : 'Balls you sink roll in here.'"
      :count-label="showProgressCounts === false ? null : humanProgressLabel ?? undefined"
      :count-group-tag="rulesProfile === 'eight-ball' ? humanCountGroupTag ?? null : null"
      compact
      @measure="emit('measureHuman', $event)"
    />
    <BilliardsCollectedBallTray
      class="min-w-0 w-full max-w-full overflow-hidden"
      muted-title
      :title-icon-classes="LAB_ASSISTANT_FLASK_ICON_CLASSES"
      :balls="opponentTrayBalls"
      :surface-style="surfaceStyle"
      :border-class="borderClass"
      :title="opponentLabel"
      :lead="rulesProfile === 'eight-ball' ? undefined : 'Balls the opponent sinks roll in here.'"
      :count-label="showProgressCounts === false ? null : opponentProgressLabel ?? undefined"
      :count-group-tag="rulesProfile === 'eight-ball' ? opponentCountGroupTag ?? null : null"
      compact
      @measure="emit('measureOpponent', $event)"
    />
  </div>
</template>

<style scoped>
.billiards-match-pocket-trays {
  width: 100%;
  max-width: 100%;
}
</style>
