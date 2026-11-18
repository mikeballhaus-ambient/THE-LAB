import type { InjectionKey } from 'vue';
import type { CollectedTrayBallView } from './composables/useBilliardsCollectedTray';
import type { BilliardsBall, BilliardsRulesProfile } from '../shared/billiards-types';

export type BilliardsMatchAsideStatusParts = {
  primary?: string;
  secondary?: string;
};

/** Live view-model for vs-match chrome rendered in `App.vue` aside (owned by `BilliardsTable`). */
export type BilliardsMatchAsideChromeModel = {
  showPocketTrays: boolean;
  showNineBallTray: boolean;
  tableStatusParts: BilliardsMatchAsideStatusParts | null;
  balls: BilliardsBall[];
  rulesProfile: BilliardsRulesProfile;
  humanTrayBalls: CollectedTrayBallView[];
  opponentTrayBalls: CollectedTrayBallView[];
  humanLabel: string;
  opponentLabel: string;
  humanProgressLabel: string | null;
  opponentProgressLabel: string | null;
  humanCountGroupTag: string | null;
  opponentCountGroupTag: string | null;
  showProgressCounts: boolean;
  surfaceStyle: Record<string, string>;
  borderClass: string;
  measureHuman: ((widthPx: number) => void) | null;
  measureOpponent: ((widthPx: number) => void) | null;
  showSpareCue: boolean;
  spareCueDisabled: boolean;
  showConfirmCuePlace: boolean;
  confirmCuePlace: (() => void) | null;
  showQuarksHint: boolean;
  hintSkuLabel: string;
  hintCostQuarks: number;
  hintUnlocked: boolean;
  hintLoading: boolean;
  hintDisabled: boolean;
  hintDevMockEnabled: boolean;
  onHintPurchase: (() => void) | null;
  onHintMock: (() => void) | null;
};

export function createBilliardsMatchAsideChromeModel(): BilliardsMatchAsideChromeModel {
  return {
    showPocketTrays: false,
    showNineBallTray: false,
    tableStatusParts: null,
    balls: [],
    rulesProfile: 'eight-ball',
    humanTrayBalls: [],
    opponentTrayBalls: [],
    humanLabel: 'You',
    opponentLabel: 'Opponent',
    humanProgressLabel: null,
    opponentProgressLabel: null,
    humanCountGroupTag: null,
    opponentCountGroupTag: null,
    showProgressCounts: true,
    surfaceStyle: {},
    borderClass: '',
    measureHuman: null,
    measureOpponent: null,
    showSpareCue: false,
    spareCueDisabled: true,
    showConfirmCuePlace: false,
    confirmCuePlace: null,
    showQuarksHint: false,
    hintSkuLabel: 'Shot path preview',
    hintCostQuarks: 50,
    hintUnlocked: false,
    hintLoading: false,
    hintDisabled: true,
    hintDevMockEnabled: false,
    onHintPurchase: null,
    onHintMock: null,
  };
}

/** `Symbol.for` keeps a single key across Vite chunks (string keys break `InjectionKey` typing). */
export const BILLIARDS_MATCH_ASIDE_CHROME_KEY: InjectionKey<BilliardsMatchAsideChromeModel> =
  Symbol.for('billiards-match-aside-chrome');
