/** Platform hint SKU ids — see docs/platform/lab-quarks-hints.md */

export const LAB_GAME_HINT_SKU_BILLIARDS_SHOT_PATH = 'shot-path';
export const LAB_GAME_HINT_SKU_WIN_BLOCK = 'win-block';
export const LAB_GAME_HINT_SKU_THREAT_COLUMN = 'threat-column';
export const LAB_GAME_HINT_SKU_HUNT_LINE = 'hunt-line';
export const LAB_GAME_HINT_SKU_BEST_PLAY = 'best-play';
export const LAB_GAME_HINT_SKU_BASIC_STRATEGY = 'basic-strategy';
export const LAB_GAME_HINT_SKU_ONE_MOVE = 'one-move';
export const LAB_GAME_HINT_SKU_SAFE_LETTER = 'safe-letter';
export const LAB_GAME_HINT_SKU_STREET_COACH = 'street-coach';

export interface LabGameHintSkuDefinition {
  id: string;
  label: string;
  defaultCostQuarks: number;
}

export const LAB_GAME_HINT_SKUS: Readonly<Record<string, LabGameHintSkuDefinition>> = {
  [LAB_GAME_HINT_SKU_BILLIARDS_SHOT_PATH]: {
    id: LAB_GAME_HINT_SKU_BILLIARDS_SHOT_PATH,
    label: 'Shot path preview',
    defaultCostQuarks: 50,
  },
  [LAB_GAME_HINT_SKU_WIN_BLOCK]: {
    id: LAB_GAME_HINT_SKU_WIN_BLOCK,
    label: 'Win or block',
    defaultCostQuarks: 50,
  },
  [LAB_GAME_HINT_SKU_THREAT_COLUMN]: {
    id: LAB_GAME_HINT_SKU_THREAT_COLUMN,
    label: 'Threat check',
    defaultCostQuarks: 50,
  },
  [LAB_GAME_HINT_SKU_HUNT_LINE]: {
    id: LAB_GAME_HINT_SKU_HUNT_LINE,
    label: 'Hunt helper',
    defaultCostQuarks: 50,
  },
  [LAB_GAME_HINT_SKU_BEST_PLAY]: {
    id: LAB_GAME_HINT_SKU_BEST_PLAY,
    label: 'Best play',
    defaultCostQuarks: 50,
  },
  [LAB_GAME_HINT_SKU_BASIC_STRATEGY]: {
    id: LAB_GAME_HINT_SKU_BASIC_STRATEGY,
    label: 'Basic strategy flash',
    defaultCostQuarks: 25,
  },
  [LAB_GAME_HINT_SKU_ONE_MOVE]: {
    id: LAB_GAME_HINT_SKU_ONE_MOVE,
    label: 'Hint: one move',
    defaultCostQuarks: 25,
  },
  [LAB_GAME_HINT_SKU_SAFE_LETTER]: {
    id: LAB_GAME_HINT_SKU_SAFE_LETTER,
    label: 'Safe letter nudge',
    defaultCostQuarks: 25,
  },
  [LAB_GAME_HINT_SKU_STREET_COACH]: {
    id: LAB_GAME_HINT_SKU_STREET_COACH,
    label: 'Street coach+',
    defaultCostQuarks: 50,
  },
};

export function resolveLabGameHintSku(skuId: string): LabGameHintSkuDefinition | undefined {
  return LAB_GAME_HINT_SKUS[skuId];
}
