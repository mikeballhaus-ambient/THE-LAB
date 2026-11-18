<script setup lang="ts">
import type { User } from '@/shared/types/user';
import type { LabPresenceStatus } from '@/shared/types/lab-comms';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { displayLabUserName } from '@/shared/utils/lab-comms-ui';

import type { TrainingCertBadge } from '@/apps/training-quizzes/shared/types';
import LabTrainingCertBadges from '@/shared/components/lab-comms/LabTrainingCertBadges.vue';

withDefaults(
  defineProps<{
    users: User[];
    presenceForUser: (userId: number) => LabPresenceStatus;
    selectedUserId?: number | null;
    listLabel?: string;
    emptyMessage?: string;
    idPrefix?: string;
    trainingCertBadgesByUserId?: Record<number, TrainingCertBadge[]>;
  }>(),
  {
    selectedUserId: null,
    listLabel: 'Team',
    emptyMessage: 'No other active users.',
    idPrefix: 'lab-team-user',
  },
);

const emit = defineEmits<{
  select: [userId: number];
}>();

const { generateUniqueId } = useUniqueElementId();

function presenceClass(status: LabPresenceStatus): string {
  return `lab-messages-presence lab-messages-presence--${status}`;
}
</script>

<template>
  <div
    class="lab-messages-user-list lab-messages-user-list-panel"
    :id="generateUniqueId('lab-team-user-list')"
  >
    <p class="px-3 pt-2 pb-1 text-xs text-lab-general-text-muted m-0">{{ listLabel }}</p>
    <button
      v-for="u in users"
      :key="u.userId"
      type="button"
      class="lab-messages-user-row"
      :class="{ 'bg-lab-general-bg-subtle': selectedUserId === u.userId }"
      :id="generateUniqueId(`${idPrefix}-${u.userId}`)"
      @click="emit('select', u.userId)"
    >
      <span
        class="lab-messages-presence"
        :class="presenceClass(presenceForUser(u.userId))"
        :title="presenceForUser(u.userId)"
        aria-hidden="true"
      />
      <span class="truncate text-sm inline-flex items-center gap-2 min-w-0">
        <span class="truncate">{{ displayLabUserName(u) }}</span>
        <LabTrainingCertBadges
          :badges="trainingCertBadgesByUserId?.[u.userId]"
          compact
        />
      </span>
    </button>
    <p v-if="users.length === 0" class="px-3 py-4 text-sm text-lab-general-text-muted m-0">
      {{ emptyMessage }}
    </p>
  </div>
</template>
