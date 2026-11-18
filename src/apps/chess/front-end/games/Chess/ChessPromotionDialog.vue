<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { ChessColor, ChessPieceType } from './types';

const props = defineProps<{
  visible: boolean;
  yourColor: ChessColor;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'choose', piece: ChessPieceType): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const options: Array<{ type: ChessPieceType; label: string }> = [
  { type: 'queen', label: 'Queen' },
  { type: 'rook', label: 'Rook' },
  { type: 'bishop', label: 'Bishop' },
  { type: 'knight', label: 'Knight' },
];

function pick(type: ChessPieceType): void {
  emit('choose', type);
  emit('update:visible', false);
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    header="Promote pawn"
    class="lab-app-dialog lab-form-runtime chess-promotion-dialog"
    :pt="{ root: { attrs: { id: generateUniqueId('chess-promo-dialog') } } }"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="m-0 text-sm text-lab-general-text-muted">
      Choose a piece for your promoted pawn.
    </p>
    <div class="flex flex-wrap gap-2 mt-3">
      <Button
        v-for="opt in options"
        :key="opt.type"
        :label="opt.label"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId(`chess-promo-${opt.type}`) } } }"
        @click="pick(opt.type)"
      />
    </div>
  </Dialog>
</template>

<style>
:global(.chess-promotion-dialog.lab-app-dialog) {
  --lab-integration-chrome-bg: var(--lab-general-bg-muted);
  --lab-integration-body-bg: var(--lab-general-bg);
  --lab-integration-field-bg: var(--lab-general-bg-muted);
  --lab-integration-field-border: var(--lab-general-border);
  --lab-form-control-bg: var(--lab-general-bg-muted);
  --lab-form-control-border: var(--lab-general-border);
}
</style>
