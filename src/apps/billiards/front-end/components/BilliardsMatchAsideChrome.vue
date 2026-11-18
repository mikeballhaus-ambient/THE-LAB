<script setup lang="ts">
import { inject } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  BILLIARDS_MATCH_ASIDE_CHROME_KEY,
  type BilliardsMatchAsideChromeModel,
} from '../billiards-match-aside-chrome';
import BilliardsMatchPocketTrays from './BilliardsMatchPocketTrays.vue';
import BilliardsNineBallObjectTray from './BilliardsNineBallObjectTray.vue';
import BilliardsSpareCue from './BilliardsSpareCue.vue';
import { LabGameHintAsideControls } from '@/shared/game-platform/ui';

const chrome = inject<BilliardsMatchAsideChromeModel>(BILLIARDS_MATCH_ASIDE_CHROME_KEY);
const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <div
    v-if="
      chrome &&
        (chrome.showPocketTrays ||
          chrome.showNineBallTray ||
          chrome.tableStatusParts ||
          chrome.showSpareCue ||
          chrome.showConfirmCuePlace ||
          chrome.showQuarksHint)
    "
    class="billiards-match-aside-chrome flex w-full min-w-0 flex-col gap-3"
  >
    <div
      v-if="chrome.tableStatusParts"
      class="billiards-table-status m-0 shrink-0 flex flex-col gap-0.5 text-sm"
    >
      <p
        v-if="chrome.tableStatusParts.primary"
        class="m-0 font-medium text-lab-general-text"
      >
        {{ chrome.tableStatusParts.primary }}
      </p>
      <p
        v-if="chrome.tableStatusParts.secondary"
        class="billiards-table-status__hint m-0 leading-snug text-lab-general-text-muted"
      >
        {{ chrome.tableStatusParts.secondary }}
      </p>
    </div>

    <BilliardsNineBallObjectTray
      v-if="chrome.showNineBallTray"
      :balls="chrome.balls"
      :surface-style="chrome.surfaceStyle"
      :border-class="chrome.borderClass"
    />

    <BilliardsMatchPocketTrays
      v-if="chrome.showPocketTrays"
      stacked
      :human-tray-balls="chrome.humanTrayBalls"
      :opponent-tray-balls="chrome.opponentTrayBalls"
      :human-label="chrome.humanLabel"
      :opponent-label="chrome.opponentLabel"
      :rules-profile="chrome.rulesProfile"
      :human-progress-label="chrome.humanProgressLabel"
      :opponent-progress-label="chrome.opponentProgressLabel"
      :human-count-group-tag="chrome.humanCountGroupTag"
      :opponent-count-group-tag="chrome.opponentCountGroupTag"
      :show-progress-counts="chrome.showProgressCounts"
      :surface-style="chrome.surfaceStyle"
      :border-class="chrome.borderClass"
      @measure-human="chrome.measureHuman?.($event)"
      @measure-opponent="chrome.measureOpponent?.($event)"
    />

    <BilliardsSpareCue
      v-if="chrome.showSpareCue"
      class="billiards-match-aside-spare-cue max-w-full"
      :disabled="chrome.spareCueDisabled"
    />

    <div v-if="chrome.showConfirmCuePlace" class="flex gap-2">
      <Button
        label="Confirm cue placement"
        size="small"
        :pt="{ root: { attrs: { id: generateUniqueId('billiards-confirm-cue-aside') } } }"
        @click="chrome.confirmCuePlace?.()"
      />
    </div>

    <LabGameHintAsideControls
      v-if="chrome.showQuarksHint"
      :sku-label="chrome.hintSkuLabel"
      :cost-quarks="chrome.hintCostQuarks"
      :unlocked="chrome.hintUnlocked"
      :loading="chrome.hintLoading"
      :disabled="chrome.hintDisabled"
      :dev-mock-enabled="chrome.hintDevMockEnabled"
      class="w-full min-w-0"
      @purchase="chrome.onHintPurchase?.()"
      @mock-purchase="chrome.onHintMock?.()"
    />
  </div>
</template>

<style scoped>
.billiards-match-aside-spare-cue :deep(.billiards-spare-cue) {
  width: 100%;
  flex-wrap: wrap;
}
</style>
