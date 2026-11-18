<script setup lang="ts">
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useForcePasswordChange } from '@/shared/composables/useForcePasswordChange';
import type { User } from '@/shared/types/user';

defineProps<{
  visible: boolean;
  user: User | null;
}>();

const emit = defineEmits<{
  (e: 'completed', user: User): void;
}>();

const { generateUniqueId } = useUniqueElementId();
const { submitting, errorMessage, submitPasswordChange } = useForcePasswordChange();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const canSubmit = computed(
  () =>
    currentPassword.value.length > 0 &&
    newPassword.value.length >= 8 &&
    newPassword.value === confirmPassword.value,
);

async function onSubmit() {
  if (!canSubmit.value) {
    return;
  }
  const result = await submitPasswordChange(currentPassword.value, newPassword.value);
  if (result.success && result.user) {
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    emit('completed', result.user);
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :closable="false"
    :draggable="false"
    header="Change your password"
    class="max-w-md"
  >
    <p class="text-lab-general-text-muted mb-4 text-sm">
      Production policy requires changing the default admin password before using THE-LAB.
    </p>
    <Message v-if="errorMessage" severity="error" class="mb-3">{{ errorMessage }}</Message>
    <div class="flex flex-col gap-3">
      <label class="text-sm text-lab-general-text-muted">Current password</label>
      <Password
        v-model="currentPassword"
        :feedback="false"
        toggle-mask
        class="w-full"
        input-class="w-full"
        :pt="{ root: { attrs: { id: generateUniqueId('force-pw-current') } } }"
      />
      <label class="text-sm text-lab-general-text-muted">New password (min 8 characters)</label>
      <Password
        v-model="newPassword"
        toggle-mask
        class="w-full"
        input-class="w-full"
        :pt="{ root: { attrs: { id: generateUniqueId('force-pw-new') } } }"
      />
      <label class="text-sm text-lab-general-text-muted">Confirm new password</label>
      <Password
        v-model="confirmPassword"
        :feedback="false"
        toggle-mask
        class="w-full"
        input-class="w-full"
        :pt="{ root: { attrs: { id: generateUniqueId('force-pw-confirm') } } }"
      />
      <Button
        label="Update password"
        icon="fa fa-key"
        :loading="submitting"
        :disabled="!canSubmit"
        @click="onSubmit"
        :pt="{ root: { attrs: { id: generateUniqueId('force-pw-submit') } } }"
      />
    </div>
  </Dialog>
</template>
