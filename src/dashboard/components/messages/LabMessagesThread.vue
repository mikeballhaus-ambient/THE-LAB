<script setup lang="ts">

import { computed, nextTick, ref, watch } from 'vue';

import Button from 'primevue/button';

import Textarea from 'primevue/textarea';

import type { LabCommsPartnerKind, LabEnvelope } from '@/shared/types/lab-comms';

import { LAB_COMMS_MESSAGE_TYPE_DM_TEXT } from '@/shared/types/lab-comms';

import {
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE,
  LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY,
  type GameInvitePayload,
} from '@/shared/types/lab-comms-game-invite';
import { resolveGameAppIdFromInvitePayload } from '@/shared/config/game-app-invite-registry';

import LabMessagesTwInviteCard from './LabMessagesTwInviteCard.vue';
import LabTrainingCertBadges from '@/shared/components/lab-comms/LabTrainingCertBadges.vue';
import type { TrainingCertBadge } from '@/apps/training-quizzes/shared/types';
import { isLabPlatformSystemUserId } from '@/shared/config/lab-platform-system-user';

const props = defineProps<{
  partnerUserId: number;
  partnerLabel: string;
  /** Actor kind from the channel summary — `automation` renders a read-only notification feed. */
  partnerKind?: LabCommsPartnerKind;
  selfUserId: number;
  selfDisplayName?: string;
  messages: LabEnvelope[];
  resolvedTwInviteIds?: ReadonlySet<string>;
  trainingCertBadgesByUserId?: Record<number, TrainingCertBadge[]>;
}>();

/**
 * Driven by the channel's `partnerKind`, not by comparing ids. The reserved automation account is a
 * feature of Messaging (a read-only feed), so the UI must not depend on which id that account happens
 * to hold — otherwise a reseed silently turns a workflow thread into an editable chat.
 */
const composerDisabled = computed(
  () => props.partnerKind === 'automation' || isLabPlatformSystemUserId(props.partnerUserId),
);



const emit = defineEmits<{

  send: [text: string];

  acceptInvite: [payload: { inviteId: string; appId: string }];

  declineInvite: [payload: { inviteId: string; appId: string }];

}>();



const draft = ref('');
const transcriptRef = ref<HTMLElement | null>(null);

async function scrollTranscriptToBottom(): Promise<void> {
  await nextTick();
  const el = transcriptRef.value;
  if (!el) {
    return;
  }
  el.scrollTop = el.scrollHeight;
}

watch(
  () => {
    const list = props.messages;
    const lastId = list.length > 0 ? list[list.length - 1]?.id : '';
    return `${props.partnerLabel}:${list.length}:${lastId}`;
  },
  () => {
    void scrollTranscriptToBottom();
  },
);

const ordered = computed(() =>

  [...props.messages].sort((a, b) => a.sentAt.localeCompare(b.sentAt)),

);



const closedInviteIdsFromTranscript = computed(() => {

  const ids = new Set<string>();

  for (const msg of ordered.value) {

    if (

      msg.type === LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE ||

      msg.type === LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL

    ) {

      const inviteId = (msg.payload as { inviteId?: string }).inviteId;

      if (inviteId) {

        ids.add(inviteId);

      }

    }

  }

  return ids;

});



function isInviteResolved(inviteId: string): boolean {

  return (

    props.resolvedTwInviteIds?.has(inviteId) === true ||

    closedInviteIdsFromTranscript.value.has(inviteId)

  );

}



watch(

  () => props.partnerLabel,

  () => {

    draft.value = '';

  },

);



function messageText(envelope: LabEnvelope): string {

  if (envelope.type !== LAB_COMMS_MESSAGE_TYPE_DM_TEXT) {

    return '';

  }

  const text = envelope.payload.text;

  return typeof text === 'string' ? text : '';

}

function senderLabel(userId: number): string {
  if (userId === props.selfUserId) {
    return props.selfDisplayName?.trim() || 'You';
  }
  return props.partnerLabel;
}

function badgesForUser(userId: number): TrainingCertBadge[] | undefined {
  return props.trainingCertBadgesByUserId?.[userId];
}



function isTwInvite(envelope: LabEnvelope): boolean {

  return envelope.type === LAB_COMMS_MESSAGE_TYPE_GAME_INVITE;

}



function isTwSystemLine(envelope: LabEnvelope): boolean {

  return (

    envelope.type === LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE ||

    envelope.type === LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL ||

    envelope.type === LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY

  );

}



function twSystemLine(envelope: LabEnvelope): string {

  const fromSelf = envelope.senderUserId === props.selfUserId;

  switch (envelope.type) {

    case LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE:

      return fromSelf ? 'You declined the game invite.' : 'Declined the game invite.';

    case LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL:

      return fromSelf ? 'You cancelled the game invite.' : 'Cancelled the game invite.';

    case LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY:

      return fromSelf

        ? 'Match is ready — open the game app to play.'

        : 'Match is ready — open the game app to play.';

    default:

      return '';

  }

}



function twInvitePayload(envelope: LabEnvelope): GameInvitePayload {

  const raw = envelope.payload as GameInvitePayload;

  return {
    ...raw,
    appId: resolveGameAppIdFromInvitePayload(raw),
  };

}

function inviteActionPayload(inviteId: string, envelope: LabEnvelope): {
  inviteId: string;
  appId: string;
} {
  const payload = twInvitePayload(envelope);
  return { inviteId, appId: payload.appId };
}



function submit(): void {

  const text = draft.value.trim();

  if (!text) {

    return;

  }

  emit('send', text);

  draft.value = '';
  void scrollTranscriptToBottom();

}

</script>



<template>

  <div class="lab-messages-thread">

    <div
      class="px-3 py-2 border-b border-lab-general-border text-sm font-medium text-lab-general-text inline-flex flex-wrap items-center gap-2"
    >
      <span>{{ partnerLabel }}</span>
      <LabTrainingCertBadges :badges="badgesForUser(partnerUserId)" compact />
    </div>

    <div
      ref="transcriptRef"
      class="lab-messages-thread__transcript"
      role="log"
      aria-live="polite"
    >

      <div

        v-for="msg in ordered"

        :key="msg.id"

        class="mb-2 flex"

        :class="msg.senderUserId === selfUserId ? 'justify-end' : 'justify-start'"

      >

        <LabMessagesTwInviteCard

          v-if="isTwInvite(msg)"

          :payload="twInvitePayload(msg)"

          :from-self="msg.senderUserId === selfUserId"

          :resolved="isInviteResolved(twInvitePayload(msg).inviteId)"

          @accept="(id) => emit('acceptInvite', inviteActionPayload(id, msg))"

          @decline="(id) => emit('declineInvite', inviteActionPayload(id, msg))"

        />

        <p

          v-else-if="isTwSystemLine(msg)"

          class="m-0 w-full text-center text-xs text-lab-general-text-muted px-2"

        >

          {{ twSystemLine(msg) }}

        </p>

        <div
          v-else-if="msg.type === LAB_COMMS_MESSAGE_TYPE_DM_TEXT"
          class="max-w-[85%] flex flex-col gap-0.5"
          :class="msg.senderUserId === selfUserId ? 'items-end' : 'items-start'"
        >
          <div
            class="inline-flex flex-wrap items-center gap-2 text-xs font-medium text-lab-general-text-muted px-0.5"
          >
            <span>{{ senderLabel(msg.senderUserId) }}</span>
            <LabTrainingCertBadges :badges="badgesForUser(msg.senderUserId)" compact />
          </div>
          <div
            class="rounded px-2 py-1 text-sm whitespace-pre-wrap break-words w-full"
            :class="
              msg.senderUserId === selfUserId
                ? 'lab-chat-bubble-user shadow'
                : 'lab-chat-bubble-assistant shadow'
            "
          >
            {{ messageText(msg) }}
          </div>
        </div>

      </div>

      <p v-if="ordered.length === 0" class="text-sm text-lab-general-text-muted m-0">
        <template v-if="composerDisabled">No notifications yet.</template>
        <template v-else>No messages yet. Say hello.</template>
      </p>

    </div>

    <p
      v-if="composerDisabled"
      class="lab-messages-thread__system-notice m-0 border-t border-lab-general-border px-3 py-2 text-xs text-lab-general-text-muted"
    >
      This channel is for THE-LAB automation only. Replies are not available.
    </p>
    <div v-else class="lab-messages-thread__composer">
      <Textarea
        v-model="draft"
        class="flex-1 text-sm"
        rows="2"
        auto-resize
        placeholder="Message…"
        @keydown.enter.exact.prevent="submit"
      />
      <Button type="button" label="Send" size="small" @click="submit" />
    </div>

  </div>

</template>


