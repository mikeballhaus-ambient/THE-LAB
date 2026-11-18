<script setup lang="ts">
import type { User } from '@/shared/types/user';
import type { TrainingCertBadge } from '@/apps/training-quizzes/shared/types';
import type { LabPresenceStatus } from '@/shared/types/lab-comms';
import LabTeamUserList from '@/shared/components/lab-comms/LabTeamUserList.vue';

defineProps<{
  users: User[];
  presenceForUser: (userId: number) => LabPresenceStatus;
  activePartnerId: number | null;
  trainingCertBadgesByUserId?: Record<number, TrainingCertBadge[]>;
}>();

const emit = defineEmits<{
  select: [userId: number];
}>();
</script>

<template>
  <LabTeamUserList
    :users="users"
    :presence-for-user="presenceForUser"
    :selected-user-id="activePartnerId"
    :training-cert-badges-by-user-id="trainingCertBadgesByUserId"
    list-label="Team"
    empty-message="No other active users."
    id-prefix="lab-messages-user"
    @select="emit('select', $event)"
  />
</template>
