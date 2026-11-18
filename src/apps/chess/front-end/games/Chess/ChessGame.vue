<script setup lang="ts">
import { DnDProvider } from '@vue-dnd-kit/core';
import ChessGameBoard from './ChessGameBoard.vue';
import type { ChessBoardPiece, ChessColor, ChessSquareRef, PromotionChoice } from './types';

/**
 * Chess board shell — `DnDProvider` must wrap any component that calls `useDnDProvider()`.
 */
defineProps<{
  pieces: ChessBoardPiece[];
  yourColor?: ChessColor;
  youInCheck?: boolean;
  opponentInCheck?: boolean;
  disabled?: boolean;
  quarksHint?: { from: ChessSquareRef; to: ChessSquareRef } | null;
  onMove: (
    from: ChessSquareRef,
    to: ChessSquareRef,
    promotion?: PromotionChoice,
  ) => void | Promise<void>;
}>();
</script>

<template>
  <DnDProvider>
    <ChessGameBoard v-bind="$props" />
  </DnDProvider>
</template>
