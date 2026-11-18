<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Badge from 'primevue/badge';
import ProgressSpinner from 'primevue/progressspinner';
import type { User } from '@/shared/types/user';
import type { TrainingCertBadge } from '@/apps/training-quizzes/shared/types';
import type {
  LabCommsPartnerKind,
  LabDmChannelSummary,
  LabEnvelope,
} from '@/shared/types/lab-comms';
import LabMessagesUserList from './LabMessagesUserList.vue';
import LabMessagesThread from './LabMessagesThread.vue';
import type { LabPresenceStatus } from '@/shared/types/lab-comms';
import { displayLabUserName } from '@/shared/utils/lab-comms-ui';
import { fetchTrainingCertBadgesByUserIds } from '@/shared/services/platform-training-cert-badges.client';
import LabTrainingCertBadges from '@/shared/components/lab-comms/LabTrainingCertBadges.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  visible: boolean;
  connected: boolean;
  reconnecting: boolean;
  selfUser: User | null;
  sortedUsers: User[];
  openPartnerIds: number[];
  activePartnerId: number | null;
  unreadByPartnerId: Record<number, number>;
  /** Channel summaries, used to classify a thread as `user` or `automation`. */
  channels?: LabDmChannelSummary[];
  messagesByChannelId: Record<string, LabEnvelope[]>;
  presenceForUser: (userId: number) => LabPresenceStatus;
  partnerLabel: (userId: number) => string;
  channelIdForPartner: (selfId: number, partnerId: number) => string;
  resolvedTwInviteIds?: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  focusPartner: [partnerUserId: number];
  closePartner: [partnerUserId: number];
  send: [payload: { partnerUserId: number; text: string }];
  acceptTwInvite: [payload: { inviteId: string; partnerUserId: number; appId: string }];
  declineTwInvite: [payload: { inviteId: string; partnerUserId: number; appId: string }];
  clearPartner: [partnerUserId: number];
}>();

const { generateUniqueId } = useUniqueElementId();

function onCloseTab(partnerId: number, event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  emit('closePartner', partnerId);
}

const clearConfirmVisible = ref(false);
const clearConfirmPartnerId = ref<number | null>(null);

function onClearTab(partnerId: number, event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  clearConfirmPartnerId.value = partnerId;
  clearConfirmVisible.value = true;
}

function cancelClearConfirm(): void {
  clearConfirmVisible.value = false;
  clearConfirmPartnerId.value = null;
}

function acceptClearConfirm(): void {
  const partnerId = clearConfirmPartnerId.value;
  clearConfirmVisible.value = false;
  clearConfirmPartnerId.value = null;
  if (partnerId != null) {
    emit('clearPartner', partnerId);
  }
}

const clearConfirmLabel = computed(() =>
  clearConfirmPartnerId.value != null ? props.partnerLabel(clearConfirmPartnerId.value) : '',
);

const dialogVisible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
});

/**
 * Actor kind for a thread, taken from the channel summary the server sent.
 *
 * Falls back to `'user'` for a partner with no summary yet (a tab opened from a not-yet-seen channel):
 * the thread then renders normally rather than guessing read-only from an id.
 */
function partnerKindFor(partnerId: number): LabCommsPartnerKind {
  return (
    props.channels?.find((c) => c.partnerUserId === partnerId)?.partnerKind ?? 'user'
  );
}

function messagesForPartner(partnerId: number): LabEnvelope[] {
  const selfId = props.selfUser?.userId;
  if (!selfId) {
    return [];
  }
  const channelId = props.channelIdForPartner(selfId, partnerId);
  return props.messagesByChannelId[channelId] ?? [];
}

function onTabValueChange(value: string | number | undefined): void {
  const partnerId = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  if (Number.isFinite(partnerId) && partnerId > 0) {
    emit('focusPartner', partnerId);
  }
}

const tabsValue = computed((): string => {
  if (props.activePartnerId != null) {
    return String(props.activePartnerId);
  }
  const first = props.openPartnerIds[0];
  return first != null ? String(first) : '';
});

const selfDisplayName = computed(() =>
  props.selfUser ? displayLabUserName(props.selfUser) : '',
);

const trainingCertBadgesByUserId = ref<Record<number, TrainingCertBadge[]>>({});

async function loadTrainingCertBadges(): Promise<void> {
  const ids = new Set<number>();
  if (props.selfUser?.userId) {
    ids.add(props.selfUser.userId);
  }
  for (const user of props.sortedUsers) {
    ids.add(user.userId);
  }
  if (ids.size === 0) {
    trainingCertBadgesByUserId.value = {};
    return;
  }
  trainingCertBadgesByUserId.value = await fetchTrainingCertBadgesByUserIds([...ids]);
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      void loadTrainingCertBadges();
    }
  },
  { immediate: true },
);

watch(
  () => props.sortedUsers.map((user) => user.userId).join(','),
  () => {
    if (props.visible) {
      void loadTrainingCertBadges();
    }
  },
);
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    header="Messages"
    class="lab-settings-dialog lab-messages-dialog w-[min(960px,92vw)]! max-h-[90vh]!"
    :pt="{
      mask: { class: 'settings-modal' },
      content: { class: 'flex! flex-col! flex-1! min-h-0! overflow-hidden!' },
      root: { class: 'flex! flex-col! max-h-[90vh]!' },
    }"
    :breakouts="{ disabled: true }"
  >
    <div class="lab-messages-shell text-sm text-lab-general-text">
      <div class="flex flex-wrap items-center gap-2 lab-messages-status">
        <span
          v-if="selfDisplayName"
          class="text-lab-general-text font-medium inline-flex items-center gap-2 flex-wrap"
        >
          {{ selfDisplayName }}
          <LabTrainingCertBadges
            :badges="trainingCertBadgesByUserId[selfUser?.userId ?? 0]"
            compact
          />
        </span>
        <span
          v-if="selfDisplayName"
          class="lab-messages-status__sep"
          aria-hidden="true"
        >
          ·
        </span>
        <template v-if="reconnecting && !connected">
          <ProgressSpinner style="width: 1rem; height: 1rem" stroke-width="4" />
          <span>Reconnecting…</span>
        </template>
        <template v-else-if="connected">
          <span class="lab-messages-presence lab-messages-presence--green" aria-hidden="true" />
          <span>Connected</span>
        </template>
        <template v-else>
          <span>Offline</span>
        </template>
      </div>

      <div class="lab-messages-shell__body">
        <LabMessagesUserList
          :users="sortedUsers"
          :presence-for-user="presenceForUser"
          :active-partner-id="activePartnerId"
          :training-cert-badges-by-user-id="trainingCertBadgesByUserId"
          @select="(id) => emit('focusPartner', id)"
        />

        <div
          class="lab-messages-conversation-pane min-h-0 flex flex-col"
          :class="{ 'lab-messages-conversation-pane--empty': openPartnerIds.length === 0 }"
        >
          <Tabs
            v-if="openPartnerIds.length > 0"
            class="lab-messages-tabs flex min-h-0 flex-1 flex-col"
            :value="tabsValue"
            @update:value="onTabValueChange"
          >
            <TabList>
              <Tab
                v-for="partnerId in openPartnerIds"
                :key="partnerId"
                :value="String(partnerId)"
              >
                <span class="lab-messages-tab-label inline-flex items-center gap-1">
                  <span class="truncate">{{ partnerLabel(partnerId) }}</span>
                  <Badge
                    v-if="
                      partnerId !== activePartnerId &&
                      (unreadByPartnerId[partnerId] ?? 0) > 0
                    "
                    class="lab-messages-tab-badge"
                    :value="unreadByPartnerId[partnerId]"
                    severity="danger"
                  />
                  <button
                    type="button"
                    class="lab-messages-tab-clear"
                    :id="generateUniqueId(`lab-messages-tab-clear-${partnerId}`)"
                    :aria-label="`Clear message history with ${partnerLabel(partnerId)}`"
                    title="Clear your history with this user"
                    @click="onClearTab(partnerId, $event)"
                    @mousedown.stop
                  >
                    <i class="fa fa-eraser" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="lab-messages-tab-close"
                    :id="generateUniqueId(`lab-messages-tab-close-${partnerId}`)"
                    :aria-label="`Close conversation with ${partnerLabel(partnerId)}`"
                    @click="onCloseTab(partnerId, $event)"
                    @mousedown.stop
                  >
                    <i class="fa fa-times" aria-hidden="true" />
                  </button>
                </span>
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel
                v-for="partnerId in openPartnerIds"
                :key="partnerId"
                :value="String(partnerId)"
              >
                <LabMessagesThread
                  v-if="selfUser"
                  :partner-user-id="partnerId"
                  :partner-label="partnerLabel(partnerId)"
                  :partner-kind="partnerKindFor(partnerId)"
                  :self-user-id="selfUser.userId"
                  :self-display-name="selfDisplayName"
                  :messages="messagesForPartner(partnerId)"
                  :resolved-tw-invite-ids="resolvedTwInviteIds"
                  :training-cert-badges-by-user-id="trainingCertBadgesByUserId"
                  @send="(text) => emit('send', { partnerUserId: partnerId, text })"
                  @accept-invite="(payload) => emit('acceptTwInvite', { ...payload, partnerUserId: partnerId })"
                  @decline-invite="(payload) => emit('declineTwInvite', { ...payload, partnerUserId: partnerId })"
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
          <p v-else class="m-0 px-2 text-sm">
            Select a teammate to start a conversation.
          </p>
        </div>
      </div>
    </div>
  </Dialog>

  <!--
    Chrome deliberately mirrors the integration-form dialogs (`lab-app-dialog` shell +
    `lab-form-runtime` control treatment) rather than default PrimeVue dialog chrome, so a
    hand-built confirm looks like every other form in the lab. See
    `src/apps/weather-dashboard/front-end/components/CityPickerDialog.vue` for the reference.
    Mask must use `settings-modal-child` (not `lab-app-dialog`) so stacking stays above the
    Messages shell (1200) without jumping to the in-app modal tier (10000).
  -->
  <Dialog
    v-model:visible="clearConfirmVisible"
    modal
    append-to="body"
    header="Clear conversation"
    :class="['lab-messages-clear-dialog', 'lab-app-dialog', 'lab-form-runtime']"
    :style="{ width: 'min(30rem, 92vw)' }"
    :pt="{
      mask: { class: 'settings-modal-child' },
      root: { attrs: { id: generateUniqueId('lab-messages-clear-confirm') } },
    }"
    @hide="cancelClearConfirm"
  >
    <div class="px-5 py-4">
      <p class="m-0 text-sm leading-relaxed text-lab-general-text">
        Clear your message history with {{ clearConfirmLabel }}? This only hides messages on
        your side; their copy is unchanged.
      </p>
    </div>
    <template #footer>
      <Button
        type="button"
        label="Cancel"
        icon="fa fa-times-circle"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId('lab-messages-clear-confirm-cancel') } } }"
        @click="cancelClearConfirm"
      />
      <Button
        type="button"
        label="Clear"
        icon="fa fa-eraser"
        severity="danger"
        :pt="{ root: { attrs: { id: generateUniqueId('lab-messages-clear-confirm-accept') } } }"
        @click="acceptClearConfirm"
      />
    </template>
  </Dialog>
</template>

<style>
/*
 * Unscoped on purpose: PrimeVue teleports the dialog to `<body>`, so a scoped selector would never
 * match. Only the chrome that `lab-app-dialog` / `lab-form-runtime` do not already provide is set
 * here — the tokens and header/footer strips come from the shared integration-dialog rules.
 */
.lab-messages-clear-dialog.lab-app-dialog {
  display: flex;
  flex-direction: column;
  background: var(--lab-general-bg);
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 90%, transparent);
  border-radius: 0.5rem;
  color: var(--lab-general-text);
}

.lab-messages-clear-dialog.lab-app-dialog .p-dialog-header {
  padding: 0.85rem 1.25rem;
  color: var(--lab-general-text);
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: var(--lab-integration-chrome-bg, var(--lab-general-bg));
}

.lab-messages-clear-dialog.lab-app-dialog .p-dialog-title {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.lab-messages-clear-dialog.lab-app-dialog .p-dialog-content {
  padding: 0;
  color: var(--lab-general-text);
  background: var(--lab-integration-body-bg, var(--lab-general-bg));
}

.lab-messages-clear-dialog.lab-app-dialog .p-dialog-footer {
  margin: 0;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: var(--lab-integration-chrome-bg, var(--lab-general-bg));
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

</style>
