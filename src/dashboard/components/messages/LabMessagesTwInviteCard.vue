<script setup lang="ts">
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { formatLabQuarksNumber, LAB_QUARKS_CURRENCY } from '@/shared/constants/lab-quarks-currency';
import type { TwInvitePayload } from '@/shared/types/lab-comms-tw';

defineProps<{
  payload: TwInvitePayload;
  fromSelf: boolean;
  resolved?: boolean;
}>();

const emit = defineEmits<{
  accept: [inviteId: string];
  decline: [inviteId: string];
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <div
    class="rounded border border-lab-general-border bg-lab-general-bg-muted p-3 text-sm max-w-[85%]"
    :class="fromSelf ? 'ml-auto' : 'mr-auto'"
  >
    <p class="m-0 font-medium text-lab-general-text">
      Game invite: {{ payload.gameName ?? payload.gameId }}
    </p>
    <p v-if="payload.rules?.turnTimerMs" class="m-0 mt-1 text-lab-general-text-muted text-xs">
      Turn timer: {{ Math.round((payload.rules.turnTimerMs ?? 0) / 60000) }} min
    </p>
    <p
      v-if="(payload.rules?.wagerQuarks ?? 0) > 0"
      class="m-0 mt-1 text-lab-general-text text-xs font-medium"
    >
      Quarks wager:
      <span class="tabular-nums">{{ formatLabQuarksNumber(payload.rules!.wagerQuarks!) }}</span>
      {{ LAB_QUARKS_CURRENCY.name }} — winner takes the pot; loser is debited the same amount.
    </p>
    <p v-if="resolved" class="m-0 mt-2 text-xs text-lab-general-text-muted">
      {{ fromSelf ? 'Invite no longer active.' : 'Responded to this invite.' }}
    </p>
    <div v-else-if="!fromSelf" class="flex gap-2 mt-2">
      <Button
        label="Accept"
        size="small"
        :pt="{ root: { attrs: { id: generateUniqueId('tw-invite-accept') } } }"
        @click="emit('accept', payload.inviteId)"
      />
      <Button
        label="Decline"
        size="small"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId('tw-invite-decline') } } }"
        @click="emit('decline', payload.inviteId)"
      />
    </div>
  </div>
</template>
