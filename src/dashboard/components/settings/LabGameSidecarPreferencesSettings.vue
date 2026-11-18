<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import ToggleSwitch from 'primevue/toggleswitch';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  hydrateLabGameSidecarPreferences,
  labGameBanterDisabled,
  labGameSidecarAutoOpen,
  saveLabGameSidecarPreferences,
} from '@/shared/composables/lab-sidecar/lab-game-sidecar-preferences-state';

const { generateUniqueId } = useUniqueElementId();
const autoOpenInputId = generateUniqueId('lab-game-sidecar-auto-open');
const banterDisabledInputId = generateUniqueId('lab-game-banter-disabled');
const toast = useToast();

const loading = ref(true);
const saving = ref(false);

const autoOpen = ref(true);
const banterOff = ref(false);

async function loadPreferences(): Promise<void> {
  loading.value = true;
  try {
    await hydrateLabGameSidecarPreferences();
    autoOpen.value = labGameSidecarAutoOpen.value;
    banterOff.value = labGameBanterDisabled.value;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadPreferences();
});

watch(autoOpen, async (value, prev) => {
  if (loading.value || value === prev) {
    return;
  }
  saving.value = true;
  try {
    await saveLabGameSidecarPreferences({ autoOpenSidecar: value });
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: value
        ? 'Sidecar will open when you launch a vs–Lab Assistant game.'
        : 'Sidecar will stay closed until you open it yourself.',
      life: 4000,
    });
  } catch (err) {
    autoOpen.value = prev;
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: err instanceof Error ? err.message : 'Could not save preference',
      life: 6000,
    });
  } finally {
    saving.value = false;
  }
});

watch(banterOff, async (value, prev) => {
  if (loading.value || value === prev) {
    return;
  }
  saving.value = true;
  try {
    await saveLabGameSidecarPreferences({ banterDisabled: value });
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: value
        ? 'In-game banter is off; you can still chat in the Sidecar.'
        : 'In-game banter is on when Sidecar is open during vs matches.',
      life: 4000,
    });
  } catch (err) {
    banterOff.value = prev;
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: err instanceof Error ? err.message : 'Could not save preference',
      life: 6000,
    });
  } finally {
    saving.value = false;
  }
});
</script>

<template>
  <div class="flex flex-col gap-4 max-w-2xl">
    <Message severity="info" :closable="false">
      These preferences are stored in this browser only. They apply when you play catalog games against the
      Lab Assistant (chess, checkers, poker, and others in the games portfolio).
    </Message>

    <section class="lab-form-section">
      <h4 class="lab-form-section__title">
        <span class="lab-form-section__icon"><i class="pi pi-window-maximize" aria-hidden="true" /></span>
        Sidecar during games
      </h4>
      <p class="lab-form-section__lead">
        Chat with the Lab Assistant in the Sidecar without leaving the board. Auto-open does not start a match or
        spend tokens until you choose Play vs Lab Assistant and play begins.
      </p>
      <div class="lab-form-section__children">
        <section class="lab-form-section lab-form-section--nested">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-col gap-1 min-w-0 flex-1">
              <label :for="autoOpenInputId" class="font-medium text-lab-general-text">
                Auto-open Sidecar when a game app launches
              </label>
              <p class="text-sm text-lab-general-text-muted m-0">
                Opens the Lab Assistant panel when you launch a vs–Lab Assistant catalog game. You can collapse it
                anytime.
              </p>
            </div>
            <ToggleSwitch
              v-model="autoOpen"
              :input-id="autoOpenInputId"
              :disabled="loading || saving"
              :pt="{ root: { attrs: { id: autoOpenInputId } } }"
            />
          </div>
        </section>
        <section class="lab-form-section lab-form-section--nested">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-col gap-1 min-w-0 flex-1">
              <label :for="banterDisabledInputId" class="font-medium text-lab-general-text">
                Disable in-game banter
              </label>
              <p class="text-sm text-lab-general-text-muted m-0">
                Stops automatic Sidecar comments on captures, checks, match end, and slow-turn nudges. Your messages
                and the assistant’s replies in Sidecar still work.
              </p>
            </div>
            <ToggleSwitch
              v-model="banterOff"
              :input-id="banterDisabledInputId"
              :disabled="loading || saving"
              :pt="{ root: { attrs: { id: banterDisabledInputId } } }"
            />
          </div>
        </section>
      </div>
    </section>
  </div>
</template>
