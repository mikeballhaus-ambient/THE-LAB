<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';
import {
  deletePlatformAppTag,
  fetchPlatformAppTags,
  type DeleteTagBlockedError,
} from '@/shared/services/platform-app-tags.client';
import PlatformCatalogIntegrationHost from '@/shared/integration/components/PlatformCatalogIntegrationHost.vue';
import { usePlatformCatalogIntegrationBridge } from '@/shared/integration/usePlatformCatalogIntegrationBridge';
import { LAB_CATALOG_TAG_DIALOG_SLOTS } from '@/shared/lab-integrations/platform-catalog-integration-services';
import {
  PLATFORM_APP_BUILDER_APP_ID,
  PLATFORM_APP_BUILDER_SURFACE,
} from '@/shared/lab-integrations/platform-catalog-manifests';
import LabRecordRowActions from '@/shared/ui/LabRecordRowActions.vue';

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const { hostRef, integrationContext, openIntegrationSlot } = usePlatformCatalogIntegrationBridge();

const tags = ref<PlatformAppTag[]>([]);
const loading = ref(false);
const bindingHint = ref('');
const deleteBlockedApps = ref<Array<{ appId: string; appName: string }>>([]);
const deleteBlockedVisible = ref(false);

async function loadTags(): Promise<void> {
  loading.value = true;
  try {
    const payload = await fetchPlatformAppTags();
    tags.value = payload.tags;
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Load failed',
      detail: err instanceof Error ? err.message : 'Could not load tags',
      life: 6000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadTags();
});

function notifyMissingBinding(slot: string): void {
  bindingHint.value = `No Forms Builder binding for slot "${slot}". Restart the main backend after :3000 init or wire via lab_integrations_upsert_binding.`;
  toast.add({
    severity: 'warn',
    summary: 'Integration not wired',
    detail: bindingHint.value,
    life: 8000,
  });
}

function openCreateTag(): void {
  bindingHint.value = '';
  void openIntegrationSlot(LAB_CATALOG_TAG_DIALOG_SLOTS.create, {}, () =>
    notifyMissingBinding(LAB_CATALOG_TAG_DIALOG_SLOTS.create),
  );
}

function openEditTag(tag: PlatformAppTag): void {
  bindingHint.value = '';
  void openIntegrationSlot(
    LAB_CATALOG_TAG_DIALOG_SLOTS.edit,
    { tagId: tag.id },
    () => notifyMissingBinding(LAB_CATALOG_TAG_DIALOG_SLOTS.edit),
  );
}

function openDeleteTag(tag: PlatformAppTag): void {
  bindingHint.value = '';
  void openIntegrationSlot(
    LAB_CATALOG_TAG_DIALOG_SLOTS.delete,
    { tagId: tag.id },
    () => void tryDeleteTagDirect(tag),
  );
}

async function tryDeleteTagDirect(tag: PlatformAppTag): Promise<void> {
  try {
    await deletePlatformAppTag(tag.id);
    tags.value = tags.value.filter((t) => t.id !== tag.id);
    toast.add({ severity: 'success', summary: 'Tag deleted', life: 3000 });
  } catch (err) {
    const blocked = err as DeleteTagBlockedError;
    if (blocked.code === 'TAG_IN_USE') {
      deleteBlockedApps.value = blocked.apps;
      deleteBlockedVisible.value = true;
      return;
    }
    toast.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: err instanceof Error ? err.message : 'Error',
      life: 6000,
    });
  }
}

function onIntegrationSuccess(): void {
  bindingHint.value = '';
  void loadTags();
  hostRef.value?.refresh?.();
}
</script>

<template>
  <div class="app-catalog-tags-admin p-4 lab-theme-app flex flex-col gap-6">
    <PlatformCatalogIntegrationHost
      ref="hostRef"
      :host-app-id="PLATFORM_APP_BUILDER_APP_ID"
      :surface-id="PLATFORM_APP_BUILDER_SURFACE"
      :context="integrationContext"
      @integration-success="onIntegrationSuccess"
    />
    <Message v-if="bindingHint" severity="warn">{{ bindingHint }}</Message>
    <section>
      <div class="flex items-center justify-between gap-4 mb-3">
        <div>
          <h3 class="m-0 text-base font-semibold">Tag definitions</h3>
          <p class="text-sm text-lab-general-text-muted m-0 mt-1">
            Create and edit catalog tags. Assign tags to each app from the app card in the lab home catalog.
          </p>
        </div>
        <Button
          type="button"
          label="New tag"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('catalog-tag-new') } } }"
          @click="openCreateTag"
        />
      </div>
      <DataTable :value="tags" :loading="loading" size="small" striped-rows>
        <Column field="id" header="Id" />
        <Column field="label" header="Label" />
        <Column field="description" header="Description" />
        <Column field="sortOrder" header="Order" />
        <Column header="Actions">
          <template #body="{ data }">
            <LabRecordRowActions
              :record-id="data.id"
              :record-name="data.label"
              id-prefix="catalog-tag"
              @edit="openEditTag(data)"
              @delete="openDeleteTag(data)"
            />
          </template>
        </Column>
      </DataTable>
    </section>

    <Dialog
      v-model:visible="deleteBlockedVisible"
      header="Cannot delete tag"
      modal
      :pt="{ root: { attrs: { id: generateUniqueId('catalog-tag-delete-blocked-dialog') } } }"
    >
      <Message severity="warn" class="mb-3">
        Remove this tag from every app below before deleting it.
      </Message>
      <ul class="m-0 pl-4 text-sm">
        <li v-for="app in deleteBlockedApps" :key="app.appId">
          {{ app.appName }} <span class="text-lab-general-text-muted">({{ app.appId }})</span>
        </li>
      </ul>
    </Dialog>
  </div>
</template>
