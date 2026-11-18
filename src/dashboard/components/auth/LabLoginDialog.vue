<script setup lang="ts">
import { watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useOidcProviders } from '@/shared/composables/useOidcProviders.client';

const visible = defineModel<boolean>('visible', { default: false });

defineProps<{
  username: string;
  password: string;
  closable: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:username', value: string): void;
  (e: 'update:password', value: string): void;
  (e: 'login'): void;
  (e: 'cancel'): void;
}>();

const { oidcProviders, loadOidcProviders, startOidcLogin } = useOidcProviders();

watch(
  visible,
  (open) => {
    if (open) {
      void loadOidcProviders();
    }
  },
  { immediate: true },
);

function onUsernameInput(value: string | undefined): void {
  emit('update:username', value ?? '');
}

function onPasswordInput(value: string | undefined): void {
  emit('update:password', value ?? '');
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :closable="closable"
    modal
    class="lab-login-dialog"
    :style="{ width: 'min(420px, 94vw)' }"
    :pt="{
      root: { class: 'overflow-hidden! rounded-2xl! border border-lab-general-border shadow-xl' },
      header: { class: 'border-b border-lab-general-border bg-lab-general-bg px-5! py-4! rounded-t-2xl!' },
      content: { class: 'bg-lab-general-bg px-5! py-4! rounded-b-2xl!' },
      mask: { class: 'settings-modal-child' },
    }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-lab-general-bg text-lab-button-border-hover ring-1 ring-lab-general-border"
        >
          <i class="fa-solid fa-flask text-lg" aria-hidden="true"></i>
        </div>
        <div>
          <h3 class="text-lg font-semibold leading-tight text-lab-general-text">Sign in to THE-LAB</h3>
          <p class="mt-0.5 text-xs text-lab-general-text-muted">Apps, Laboratory, and your workspace</p>
        </div>
      </div>
    </template>

    <div class="flex flex-col gap-5" @keyup.enter="emit('login')">
      <section v-if="oidcProviders.length > 0" class="flex flex-col gap-2">
        <p class="text-xs font-medium uppercase tracking-wide text-lab-general-text-muted">Continue with</p>
        <div class="flex flex-col gap-2">
          <Button
            v-for="provider in oidcProviders"
            :key="provider.id"
            type="button"
            :label="`Continue with ${provider.label}`"
            :icon="provider.icon"
            severity="secondary"
            class="w-full lab-oidc-btn"
            :pt="{
              root: {
                class:
                  'w-full justify-center! border! border-lab-general-border! bg-lab-general-bg! text-lab-general-text! hover:border-lab-button-border-hover! hover:bg-lab-header-bg!',
              },
            }"
            @click="startOidcLogin(provider)"
          />
        </div>
      </section>

      <div
        v-if="oidcProviders.length > 0"
        class="flex items-center gap-3 text-xs text-lab-general-text-muted"
        role="separator"
      >
        <span class="h-px flex-1 bg-lab-general-border"></span>
        <span>or lab account</span>
        <span class="h-px flex-1 bg-lab-general-border"></span>
      </div>

      <section class="flex flex-col gap-3">
        <p v-if="oidcProviders.length === 0" class="text-xs font-medium uppercase tracking-wide text-lab-general-text-muted">
          Lab account
        </p>
        <InputText
          :model-value="username"
          placeholder="Username"
          autocomplete="username"
          class="w-full border-lab-general-border! bg-lab-general-bg!"
          @update:model-value="onUsernameInput"
        />
        <InputText
          :model-value="password"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
          class="w-full border-lab-general-border! bg-lab-general-bg!"
          @update:model-value="onPasswordInput"
        />
        <div class="flex gap-2 pt-1">
          <Button
            v-if="closable"
            type="button"
            label="Cancel"
            icon="fa fa-times-circle"
            severity="secondary"
            class="flex-1"
            @click="emit('cancel')"
          />
          <Button
            type="button"
            label="Sign in"
            icon="fa fa-sign-in-alt"
            class="flex-1"
            @click="emit('login')"
          />
        </div>
      </section>
    </div>
  </Dialog>
</template>

<style scoped>
.lab-login-dialog :deep([data-pc-section='root']),
.lab-login-dialog :deep(.p-dialog) {
  overflow: hidden;
  border-radius: 1rem;
}

.lab-login-dialog :deep([data-pc-section='header']),
.lab-login-dialog :deep(.p-dialog-header) {
  border-top-left-radius: 1rem;
  border-top-right-radius: 1rem;
}

.lab-login-dialog :deep([data-pc-section='content']),
.lab-login-dialog :deep(.p-dialog-content) {
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
}

.lab-login-dialog :deep(.p-dialog-header-icons),
.lab-login-dialog :deep([data-pc-section='headeractions']) {
  align-self: flex-start;
  margin-top: 0.25rem;
}
</style>
