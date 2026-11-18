<script setup lang="ts">
import { DnDProvider } from '@vue-dnd-kit/core';
import CheckersGameBoard from './CheckersGameBoard.vue';
import type { BoardPiece } from './types';

/**
 * Checkers board shell — `DnDProvider` must wrap any component that calls `useDnDProvider()`.
 */
defineProps<{
  pieces: BoardPiece[];
  yourSeat?: number;
  currentSeat?: number;
  jumpChainPieceId?: number | null;
  disabled?: boolean;
  quarksHint?: {
    from: { row: number; col: number };
    to: { row: number; col: number };
    chainLandings?: { row: number; col: number }[];
    chainCaptureCount?: number;
  } | null;
  onMove: (pieceId: number, toRow: number, toCol: number) => void | Promise<void>;
}>();
</script>

<template>
  <DnDProvider>
    <CheckersGameBoard v-bind="$props" />
  </DnDProvider>
</template>
