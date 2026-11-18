<script setup lang="ts">
import HoldemTableSurface, { type PokerAction } from './HoldemTableSurface.vue';
import type { PokerMove } from '../../back-end/rules';

defineProps<{
  holeCards: string[];
  opponentHoleCount: number;
  showOpponentHoles: boolean;
  opponentHoleCards: string[];
  opponentLabel: string;
  boardCards: string[];
  pot: number;
  toCall: number;
  minBet: number;
  minRaiseTo: number;
  legalActions: PokerMove['type'][];
  handLabel?: string;
  handOver?: boolean;
  disabled?: boolean;
  onAction: (action: PokerAction) => void | Promise<void>;
}>();
</script>

<template>
  <HoldemTableSurface v-bind="$props" />
</template>
