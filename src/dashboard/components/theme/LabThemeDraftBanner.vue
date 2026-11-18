<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useLabThemeDraft } from '@/shared/composables/useLabThemeDraft';
import type { User } from '@/shared/types';

const props = defineProps<{
  user: User | null;
}>();

const { generateUniqueId } = useUniqueElementId();
const draft = useLabThemeDraft();

const isAdmin = computed(() => props.user?.role === 'owner' || props.user?.role === 'admin');

const visible = computed(() => isAdmin.value && draft.hasUnsavedChanges.value);

const saveId = generateUniqueId('theme-banner-save');
const discardId = generateUniqueId('theme-banner-discard');
const openId = generateUniqueId('theme-banner-open');

async function onSave() {
  await draft.saveThemeDraft();
}

function onDiscard() {
  draft.discardDraft();
}

function onOpenThemes() {
  draft.requestOpenThemesSettings();
}
</script>

<template>
  <div
    v-show="visible"
    class="lab-theme-draft-banner"
    role="status"
    aria-live="polite"
  >
    <div class="lab-theme-draft-banner__inner">
      <p class="lab-theme-draft-banner__message m-0">
        Theme changes are not saved yet.
        <span
          v-if="draft.contrastWarnings.value.length"
          class="lab-theme-draft-banner__warn"
        >
          ({{ draft.contrastWarnings.value.length }} contrast warning{{
            draft.contrastWarnings.value.length === 1 ? '' : 's'
          }})
        </span>
      </p>
      <div class="lab-theme-draft-banner__actions">
        <Button
          type="button"
          label="Open Themes"
          severity="secondary"
          size="small"
          :id="openId"
          :pt="{ root: { attrs: { id: openId } } }"
          @click="onOpenThemes"
        />
        <Button
          type="button"
          label="Discard"
          severity="secondary"
          size="small"
          text
          :id="discardId"
          :disabled="draft.saving.value"
          :pt="{ root: { attrs: { id: discardId } } }"
          @click="onDiscard"
        />
        <Button
          type="button"
          label="Save theme"
          size="small"
          :id="saveId"
          :loading="draft.saving.value"
          :pt="{ root: { attrs: { id: saveId } } }"
          @click="onSave"
        />
      </div>
    </div>
  </div>
</template>
