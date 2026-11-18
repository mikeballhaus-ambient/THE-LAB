<script setup lang="ts">
import { computed, watch } from 'vue';
import Button from 'primevue/button';
import { getLabUserIdFromAccessToken } from '@/shared/composables/useLabPlatformAuth';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { filterRosterUsersForGameInvitePicker } from '@/shared/utils/lab-comms-ui';
import {
  GAME_LOBBY_LAB_ASSISTANT_DEFAULT_LEAD,
  GAME_LOBBY_LAB_ASSISTANT_SECTION_TITLE,
  GAME_LOBBY_PLAY_VS_LAB_ASSISTANT_BUTTON,
  LAB_ASSISTANT_FLASK_ICON_CLASSES,
} from '@/shared/constants/lab-game-assistant-opponent';
import { formatLabQuarksNumber, LAB_QUARKS_CURRENCY } from '@/shared/constants/lab-quarks-currency';
import { GAME_LOBBY_INVITE_FRAME_WAGER_LEAD } from '@/shared/constants/lab-game-quarks-practice';
import type { GameDifficulty } from '../types';
import GameLobbyQuarksSection from './GameLobbyQuarksSection.vue';

export interface GameLobbyRosterUser {
  id?: number;
  userId?: number;
  name?: string | null;
  email?: string | null;
}

function rosterUserId(u: GameLobbyRosterUser): number {
  return u.id ?? u.userId ?? 0;
}

const props = withDefaults(
  defineProps<{
    difficulty: GameDifficulty;
    difficultyOptions: ReadonlyArray<{ label: string; value: GameDifficulty }>;
    starting?: boolean;
    isAuthenticated?: boolean;
    roster: GameLobbyRosterUser[];
    aiSectionLead: string;
    inviteSectionLead?: string;
    /** When true, invite controls stay visible but cannot be used (e.g. mode still in development). */
    inviteDisabled?: boolean;
    inviteDisabledLead?: string;
    /** Optional Quarks frame wager (fixed amount supplied by host app). */
    showQuarksWager?: boolean;
    quarksWagerAmount?: number;
    /** Card games — opt in to real Quarks ledger (default off). */
    showQuarksOptInRealPlay?: boolean;
    /**
     * When true, allows a standalone {@link GameLobbyQuarksSection} when wager is not embedded in AI/invite
     * cards. Card-game practice opt-in always uses the section when {@link showQuarksOptInRealPlay} is set.
     */
    embedQuarksSection?: boolean;
    /** Vs–Lab Assistant wager checkbox inside the Lab Assistant section (amount follows difficulty). */
    embedAiQuarksWager?: boolean;
    /** Friend-invite optional Quarks wager (checkbox + stake select). */
    embedInviteQuarksWager?: boolean;
    inviteQuarksStakeOptions?: ReadonlyArray<{ label: string; value: number }>;
    /** `columns`: panel root uses `display: contents` so sections sit in a parent grid (e.g. Billiards lobby). */
    layout?: 'stack' | 'columns';
    /** When omitted, the signed-in lab user id is excluded from the invite list when authenticated. */
    excludeUserId?: number;
  }>(),
  {
    starting: false,
    isAuthenticated: false,
    inviteSectionLead: GAME_LOBBY_INVITE_FRAME_WAGER_LEAD,
    inviteDisabled: false,
    inviteDisabledLead: 'Not available yet.',
    showQuarksWager: false,
    quarksWagerAmount: 0,
    showQuarksOptInRealPlay: false,
    embedQuarksSection: false,
    embedAiQuarksWager: false,
    embedInviteQuarksWager: false,
    inviteQuarksStakeOptions: () => [],
    layout: 'stack',
  },
);

const panelRootClass = computed(() =>
  props.layout === 'columns'
    ? 'game-lobby-mode-panel game-lobby-mode-panel--columns contents w-full'
    : 'game-lobby-mode-panel flex flex-col gap-4 w-full max-w-lg',
);

const modeSectionClass = computed(() =>
  props.layout === 'columns'
    ? 'lab-form-section game-lobby-mode-section flex flex-col min-h-full min-w-0 h-full'
    : 'lab-form-section game-lobby-mode-section flex flex-col',
);

const inviteLead = computed(() =>
  props.inviteDisabled ? props.inviteDisabledLead : props.inviteSectionLead,
);

/** Frame wagers live on Lab Assistant / invite cards when embedded; avoid a duplicate top card. */
const standaloneQuarksWager = computed(
  () => props.showQuarksWager && !props.embedAiQuarksWager && !props.embedInviteQuarksWager,
);

const showStandaloneQuarksSection = computed(() => {
  if (props.showQuarksOptInRealPlay) {
    /** Card-game ledger opt-in lives in the Lab Assistant card when frame wagers are embedded there. */
    if (props.embedAiQuarksWager) {
      return false;
    }
    return true;
  }
  if (!props.embedQuarksSection) {
    return false;
  }
  return standaloneQuarksWager.value;
});

const quarksWagerEnabled = defineModel<boolean>('quarksWagerEnabled', { default: false });
const quarksRealPlayEnabled = defineModel<boolean>('quarksRealPlayEnabled', { default: false });
const inviteQuarksWagerEnabled = defineModel<boolean>('inviteQuarksWagerEnabled', { default: false });
const inviteQuarksWagerQuarks = defineModel<number>('inviteQuarksWagerQuarks', { default: 250 });

const emit = defineEmits<{
  'update:difficulty': [value: GameDifficulty];
  playAi: [];
  invite: [];
}>();

const selectedOpponentId = defineModel<number | null>('selectedOpponentId', { default: null });

const { generateUniqueId } = useUniqueElementId();

function onDifficultyInput(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as GameDifficulty;
  emit('update:difficulty', value);
}

const resolvedExcludeUserId = computed(() => {
  if (props.excludeUserId != null) {
    return props.excludeUserId;
  }
  if (!props.isAuthenticated) {
    return undefined;
  }
  return getLabUserIdFromAccessToken() ?? undefined;
});

const inviteRoster = computed(() => {
  const excludeId = resolvedExcludeUserId.value;
  if (excludeId == null) {
    return props.roster;
  }
  return filterRosterUsersForGameInvitePicker(props.roster, excludeId);
});

watch(inviteRoster, (list) => {
  const current = selectedOpponentId.value;
  if (current == null) {
    return;
  }
  if (!list.some((u) => rosterUserId(u) === current)) {
    selectedOpponentId.value = null;
  }
});

</script>

<template>
  <div :class="panelRootClass">
    <GameLobbyQuarksSection
      v-if="showStandaloneQuarksSection"
      v-model:quarks-wager-enabled="quarksWagerEnabled"
      v-model:quarks-real-play-enabled="quarksRealPlayEnabled"
      :show-quarks-wager="standaloneQuarksWager"
      :show-quarks-opt-in-real-play="props.showQuarksOptInRealPlay"
      :quarks-wager-amount="props.quarksWagerAmount"
    />

    <section :class="modeSectionClass" :id="generateUniqueId('game-lobby-ai-section')">
      <h4 class="lab-form-section__title">
        <span class="lab-form-section__icon"><i :class="LAB_ASSISTANT_FLASK_ICON_CLASSES" aria-hidden="true" /></span>
        {{ GAME_LOBBY_LAB_ASSISTANT_SECTION_TITLE }}
      </h4>
      <p class="lab-form-section__lead">{{ props.aiSectionLead || GAME_LOBBY_LAB_ASSISTANT_DEFAULT_LEAD }}</p>
      <label class="flex flex-col gap-1 text-sm" :id="generateUniqueId('game-lobby-difficulty-label')">
        <span class="text-lab-general-text-muted">Difficulty</span>
        <select
          :value="props.difficulty"
          class="game-lobby-select"
          :id="generateUniqueId('game-lobby-difficulty')"
          @change="onDifficultyInput"
        >
          <option v-for="o in props.difficultyOptions" :key="o.value" :value="o.value">
            {{ o.label }}
          </option>
        </select>
      </label>
      <div
        v-if="props.embedAiQuarksWager && props.isAuthenticated"
        class="mt-2 flex flex-col gap-2"
      >
        <label
          class="inline-flex cursor-pointer items-center gap-2 text-sm"
          :id="generateUniqueId('game-lobby-ai-wager-label')"
        >
          <input
            v-model="quarksWagerEnabled"
            type="checkbox"
            class="game-lobby-wager-checkbox"
            :id="generateUniqueId('game-lobby-ai-wager-toggle')"
          />
          <span>
            Wager
            <span class="tabular-nums font-semibold">{{ formatLabQuarksNumber(props.quarksWagerAmount ?? 0) }}</span>
            {{ LAB_QUARKS_CURRENCY.name }} this frame
          </span>
        </label>
      </div>
      <div
        class="game-lobby-section-primary-action w-full"
        :class="
          props.layout === 'columns'
            ? 'game-lobby-section-primary-action--column'
            : 'mt-3'
        "
      >
        <Button
          class="w-full"
          :loading="props.starting"
          :pt="{ root: { attrs: { id: generateUniqueId('game-lobby-play-ai') } } }"
          @click="emit('playAi')"
        >
        <span class="game-lobby-play-lab-assistant">
          <i :class="LAB_ASSISTANT_FLASK_ICON_CLASSES" aria-hidden="true" />
          <span>{{ GAME_LOBBY_PLAY_VS_LAB_ASSISTANT_BUTTON }}</span>
        </span>
        </Button>
      </div>
    </section>

    <section
      v-if="props.isAuthenticated || props.inviteDisabled"
      :class="[modeSectionClass, 'game-lobby-invite-section', { 'game-lobby-invite-section--disabled': props.inviteDisabled }]"
      :id="generateUniqueId('game-lobby-invite-section')"
      :aria-disabled="props.inviteDisabled ? 'true' : undefined"
    >
      <h4 class="lab-form-section__title">
        <span class="lab-form-section__icon"><i class="pi pi-users" aria-hidden="true" /></span>
        Invite a friend
      </h4>
      <p class="lab-form-section__lead">{{ inviteLead }}</p>
      <label class="flex flex-col gap-1 text-sm" :id="generateUniqueId('game-lobby-opponent-label')">
        <span class="text-lab-general-text-muted">Opponent</span>
        <select
          v-model="selectedOpponentId"
          class="game-lobby-select"
          :id="generateUniqueId('game-lobby-opponent')"
          :disabled="props.inviteDisabled"
        >
          <option :value="null">Choose…</option>
          <option v-for="u in inviteRoster" :key="rosterUserId(u)" :value="rosterUserId(u)">
            {{ u.name || u.email }}
          </option>
        </select>
      </label>
      <div
        v-if="props.embedInviteQuarksWager && !props.inviteDisabled"
        class="mt-2 flex flex-col gap-2"
      >
        <label
          class="inline-flex cursor-pointer items-center gap-2 text-sm"
          :id="generateUniqueId('game-lobby-invite-wager-label')"
        >
          <input
            v-model="inviteQuarksWagerEnabled"
            type="checkbox"
            class="game-lobby-wager-checkbox"
            :id="generateUniqueId('game-lobby-invite-wager-toggle')"
          />
          <span>Wager {{ LAB_QUARKS_CURRENCY.name }} on this frame</span>
        </label>
        <label
          v-if="inviteQuarksWagerEnabled"
          class="flex flex-col gap-1 text-sm"
          :id="generateUniqueId('game-lobby-invite-wager-stake-label')"
        >
          <span class="text-lab-general-text-muted">Stake</span>
          <select
            v-model="inviteQuarksWagerQuarks"
            class="game-lobby-select"
            :id="generateUniqueId('game-lobby-invite-wager-stake')"
          >
            <option v-for="o in props.inviteQuarksStakeOptions" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </label>
      </div>
      <div
        class="game-lobby-section-primary-action w-full"
        :class="
          props.layout === 'columns'
            ? 'game-lobby-section-primary-action--column'
            : 'mt-3'
        "
      >
        <Button
          class="w-full"
          label="Send invite"
          icon="pi pi-send"
          severity="secondary"
          :loading="props.starting"
          :disabled="props.inviteDisabled"
          :pt="{ root: { attrs: { id: generateUniqueId('game-lobby-invite') } } }"
          @click="emit('invite')"
        />
      </div>
    </section>
  </div>
</template>
