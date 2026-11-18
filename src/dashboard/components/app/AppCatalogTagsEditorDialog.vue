<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { RuntimeApp } from '@/shared/types';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';
import { setAppCatalogTags } from '@/shared/services/platform-app-tags.client';
import AppTagOrderEditor from '../settings/AppTagOrderEditor.vue';

const props = defineProps<{
  visible: boolean;
  app: RuntimeApp | null;
  tags: PlatformAppTag[];
}>();

export type AppCatalogTagsSavedPayload = {
  appId: string;
  tagIds: string[];
};

const emit = defineEmits<{
  'update:visible': [value: boolean];
  saved: [payload: AppCatalogTagsSavedPayload];
}>();

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

const draftTagIds = ref<string[]>([]);
const saving = ref(false);

watch(
  () => [props.visible, props.app] as const,
  ([open, app]) => {
    if (open && app) {
      draftTagIds.value = [...(app.catalogTagIds ?? [])];
    }
  },
  { immediate: true },
);

function close(): void {
  emit('update:visible', false);
}

async function save(): Promise<void> {
  if (!props.app) return;
  if (draftTagIds.value.length === 0) {
    toast.add({ severity: 'warn', summary: 'At least one tag required', life: 4000 });
    return;
  }
  saving.value = true;
  try {
    await setAppCatalogTags(props.app.id, draftTagIds.value);
    emit('saved', { appId: props.app.id, tagIds: [...draftTagIds.value] });
    toast.add({ severity: 'success', summary: 'Catalog tags saved', life: 3000 });
    close();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: err instanceof Error ? err.message : 'Error',
      life: 6000,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    class="lab-app-catalog-tags-dialog w-[32rem]"
    :header="app ? `Catalog tags — ${app.name}` : 'Catalog tags'"
    :pt="{ root: { attrs: { id: generateUniqueId('app-catalog-tags-dialog') } } }"
    @update:visible="(v) => emit('update:visible', v)"
  >
    <Message severity="info" class="mb-3 text-sm">
      First tag is the <strong>primary</strong> catalog section. Drag to reorder.
    </Message>
    <AppTagOrderEditor v-model="draftTagIds" :tags="tags" />
    <template #footer>
      <Button
        type="button"
        label="Cancel"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId('app-catalog-tags-cancel') } } }"
        @click="close"
      />
      <Button
        type="button"
        label="Save"
        :loading="saving"
        :pt="{ root: { attrs: { id: generateUniqueId('app-catalog-tags-save') } } }"
        @click="save"
      />
    </template>
  </Dialog>
</template>
