<script setup lang="ts">
import Button from 'primevue/button';
import { ref } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import LabTeamUserList from '@/shared/components/lab-comms/LabTeamUserList.vue';
import type { LabPresenceStatus } from '@/shared/types/lab-comms';
import type { User } from '@/shared/types/user';
import {
  GAME_LOBBY_LAB_ASSISTANT_DEFAULT_LEAD,
  GAME_LOBBY_LAB_ASSISTANT_SECTION_TITLE,
  GAME_LOBBY_PLAY_VS_LAB_ASSISTANT_BUTTON,
  LAB_ASSISTANT_FLASK_ICON_CLASSES,
} from '@/shared/constants/lab-game-assistant-opponent';
import type { GameDifficulty } from '../types';

/** Tiers offered by every catalogue game — kept here so apps do not restate it. */
const DIFFICULTY_OPTIONS: ReadonlyArray<{ label: string; value: GameDifficulty }> = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
  { label: 'Boss', value: 'boss' },
];

const props = withDefaults(
  defineProps<{
    inviteUsers: User[];
    presenceForUser: (userId: number) => LabPresenceStatus;
    invitePending: boolean;
    pendingInviteeName: string | null;
    cancelInviteLoading?: boolean;
    aiLoading?: boolean;
    /** Short rules blurb under the Lab Assistant lobby section. */
    aiSectionLead?: string;
    inviteSectionLead?: string;
    showInviteSection?: boolean;
  }>(),
  {
    aiSectionLead: GAME_LOBBY_LAB_ASSISTANT_DEFAULT_LEAD,
    inviteSectionLead: 'Send a Lab Messages invite; the match opens when they accept.',
    showInviteSection: true,
  },
);

const emit = defineEmits<{
  vsAi: [difficulty: string];
  vsFriend: [inviteeId: number];
  cancelInvite: [];
}>();

const { generateUniqueId } = useUniqueElementId();
const difficulty = ref<GameDifficulty>('medium');
const inviteeId = ref<number | null>(null);

const difficultyOptions = [...DIFFICULTY_OPTIONS];

function startVsAi(): void {
  emit('vsAi', difficulty.value);
}

function inviteFriend(): void {
  if (inviteeId.value != null) {
    emit('vsFriend', inviteeId.value);
  }
}

function onSelectInvitee(userId: number): void {
  inviteeId.value = userId;
}
</script>

<template>
  <div
    class="game-lobby-mode-panel flex flex-col gap-4 w-full max-w-lg"
    :id="generateUniqueId('game-lobby-mode-panel')"
  >
    <section class="lab-form-section">
      <h4 class="lab-form-section__title">
        <span class="lab-form-section__icon"><i :class="LAB_ASSISTANT_FLASK_ICON_CLASSES" aria-hidden="true" /></span>
        {{ GAME_LOBBY_LAB_ASSISTANT_SECTION_TITLE }}
      </h4>
      <p class="lab-form-section__lead">{{ props.aiSectionLead }}</p>
      <label class="flex flex-col gap-1 text-sm" :id="generateUniqueId('game-lobby-difficulty-label')">
        <span class="text-lab-general-text-muted">Difficulty</span>
        <select
          v-model="difficulty"
          class="game-lobby-select"
          :id="generateUniqueId('game-lobby-difficulty')"
        >
          <option v-for="o in difficultyOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <Button
        class="mt-3"
        :loading="props.aiLoading"
        :pt="{ root: { attrs: { id: generateUniqueId('game-lobby-play-ai') } } }"
        @click="startVsAi"
      >
        <span class="game-lobby-play-lab-assistant">
          <i :class="LAB_ASSISTANT_FLASK_ICON_CLASSES" aria-hidden="true" />
          <span>{{ GAME_LOBBY_PLAY_VS_LAB_ASSISTANT_BUTTON }}</span>
        </span>
      </Button>
    </section>

    <section v-if="props.showInviteSection" class="lab-form-section">
      <h4 class="lab-form-section__title">
        <span class="lab-form-section__icon"><i class="pi pi-users" aria-hidden="true" /></span>
        Invite a friend
      </h4>
      <p class="lab-form-section__lead">{{ props.inviteSectionLead }}</p>
      <LabTeamUserList
        :users="inviteUsers"
        :presence-for-user="presenceForUser"
        :selected-user-id="inviteeId"
        list-label="Teammates"
        empty-message="No other active users to invite right now."
        id-prefix="game-lobby-invite-user"
        class="game-lobby-mode-panel__user-list min-h-32 max-h-[min(40vh,280px)] border-[color-mix(in_srgb,var(--lab-general-border)_70%,transparent)]! bg-[color-mix(in_srgb,var(--lab-general-bg)_88%,var(--lab-general-border))]!"
        @select="onSelectInvitee"
      />
      <Button
        class="mt-3"
        label="Send invite"
        icon="pi pi-send"
        severity="secondary"
        :disabled="invitePending || inviteUsers.length === 0 || inviteeId == null"
        :pt="{ root: { attrs: { id: generateUniqueId('game-lobby-invite') } } }"
        @click="inviteFriend"
      />
      <div
        v-if="invitePending && pendingInviteeName"
        class="flex flex-wrap items-center gap-2 mt-3"
      >
        <p
          :id="generateUniqueId('game-lobby-invite-waiting')"
          class="text-sm text-lab-general-text-muted m-0"
        >
          Invite sent — waiting for {{ pendingInviteeName }} to respond.
        </p>
        <Button
          label="Cancel invite"
          icon="pi pi-times"
          severity="secondary"
          outlined
          size="small"
          :loading="cancelInviteLoading"
          :pt="{ root: { attrs: { id: generateUniqueId('game-lobby-invite-cancel') } } }"
          @click="emit('cancelInvite')"
        />
      </div>
    </section>
  </div>
</template>
