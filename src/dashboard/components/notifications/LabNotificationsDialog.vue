<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import ProgressSpinner from 'primevue/progressspinner';
import type { LabUserNotification } from '@/shared/types/lab-domain-event';
import type { LabNotificationAction } from '@/shared/types/lab-notification-action';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

/**
 * Lab notifications list, grouped by title.
 *
 * ## Why grouping
 *
 * A failing workflow produces the *same* notification on every run, so the list becomes twenty
 * identical rows and the one that matters is impossible to find. Grouping by title collapses those
 * into one entry with a count, expandable to the individual occurrences — the shape the data
 * actually has.
 *
 * Group key is the **title only**. Two notifications with the same title but different bodies are
 * still "the same alert firing repeatedly", which is the thing worth collapsing; including the body
 * in the key would defeat the purpose for any message that embeds a timestamp or an id.
 *
 * Styled with the canonical integration-form chrome (`lab-app-dialog lab-form-runtime`). PrimeVue
 * teleports to `<body>`, so every rule below is `:global()`.
 */

const props = defineProps<{
  visible: boolean;
  loading: boolean;
  connected: boolean;
  reconnecting: boolean;
  notifications: LabUserNotification[];
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  markRead: [notificationId: string];
  remove: [notificationId: string];
  removeMany: [notificationIds: string[]];
  runAction: [notification: LabUserNotification, action: LabNotificationAction];
  overlayDetail: [detail: { expandedTitles: string[]; selectedIds: string[] }];
}>();

const { generateUniqueId } = useUniqueElementId();

const dialogVisible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
});

/** Titles currently expanded. Collapsed by default so a long list stays scannable. */
const expandedTitles = ref<Set<string>>(new Set());
/** Notification ids ticked for bulk delete. */
const checkedIds = ref<Set<string>>(new Set());
const deleting = ref(false);

function emitOverlayDetail(): void {
  emit('overlayDetail', {
    expandedTitles: [...expandedTitles.value],
    selectedIds: [...checkedIds.value],
  });
}

watch([expandedTitles, checkedIds], () => emitOverlayDetail(), { deep: true });

watch(dialogVisible, (open) => {
  if (open) {
    emitOverlayDetail();
  }
});

interface NotificationGroup {
  title: string;
  items: LabUserNotification[];
  /** Newest first — the list already arrives that way, so index 0 is the latest occurrence. */
  latest: LabUserNotification;
  unreadCount: number;
}

/**
 * Group by title, preserving first-seen order.
 *
 * Order matters: the incoming list is newest-first, so the first time a title appears is its most
 * recent occurrence — which is what makes "latest" the representative row and keeps the groups
 * themselves in recency order without a second sort.
 */
const groups = computed<NotificationGroup[]>(() => {
  const byTitle = new Map<string, NotificationGroup>();
  for (const item of props.notifications) {
    const existing = byTitle.get(item.title);
    if (existing) {
      existing.items.push(item);
      if (!item.readAt) {
        existing.unreadCount += 1;
      }
      continue;
    }
    byTitle.set(item.title, {
      title: item.title,
      items: [item],
      latest: item,
      unreadCount: item.readAt ? 0 : 1,
    });
  }
  return [...byTitle.values()];
});

const hasChecked = computed(() => checkedIds.value.size > 0);
const allChecked = computed(
  () => props.notifications.length > 0 && checkedIds.value.size >= props.notifications.length,
);
const someChecked = computed(() => checkedIds.value.size > 0 && !allChecked.value);

function isExpanded(title: string): boolean {
  return expandedTitles.value.has(title);
}

function toggleExpanded(title: string): void {
  const next = new Set(expandedTitles.value);
  if (next.has(title)) {
    next.delete(title);
  } else {
    next.add(title);
  }
  expandedTitles.value = next;
}

function isChecked(id: string): boolean {
  return checkedIds.value.has(id);
}

function toggleChecked(id: string, next: boolean): void {
  const updated = new Set(checkedIds.value);
  if (next) {
    updated.add(id);
  } else {
    updated.delete(id);
  }
  checkedIds.value = updated;
}

/**
 * Select every occurrence in one group.
 *
 * Selecting a group selects its hidden members too. Ticking a collapsed group and deleting it must
 * remove all twenty, not just the visible representative — anything else would silently leave the
 * rows the user could not see.
 */
function isGroupChecked(group: NotificationGroup): boolean {
  return group.items.every((item) => checkedIds.value.has(item.id));
}

function toggleGroup(group: NotificationGroup, next: boolean): void {
  const updated = new Set(checkedIds.value);
  for (const item of group.items) {
    if (next) {
      updated.add(item.id);
    } else {
      updated.delete(item.id);
    }
  }
  checkedIds.value = updated;
}

function toggleAll(next: boolean): void {
  checkedIds.value = next
    ? new Set(props.notifications.map((item) => item.id))
    : new Set();
}

async function deleteSelected(): Promise<void> {
  if (!hasChecked.value) {
    return;
  }
  const ids = [...checkedIds.value];
  deleting.value = true;
  try {
    emit('removeMany', ids);
    // Clear optimistically: the ids no longer refer to rows the user can act on either way, and the
    // composable only mutates its list once the server confirms.
    checkedIds.value = new Set();
  } finally {
    deleting.value = false;
  }
}

function onRemove(item: LabUserNotification): void {
  const updated = new Set(checkedIds.value);
  updated.delete(item.id);
  checkedIds.value = updated;
  emit('remove', item.id);
}

function onItemClick(item: LabUserNotification): void {
  if (!item.readAt) {
    emit('markRead', item.id);
  }
}

function onRunAction(item: LabUserNotification, action: LabNotificationAction): void {
  if (!item.readAt) {
    emit('markRead', item.id);
  }
  emit('runAction', item, action);
}

/** Drop stale selections when the underlying list changes (a delete, or a socket refresh). */
watch(
  () => props.notifications,
  (list) => {
    const live = new Set(list.map((item) => item.id));
    const next = new Set([...checkedIds.value].filter((id) => live.has(id)));
    if (next.size !== checkedIds.value.size) {
      checkedIds.value = next;
    }
    const titles = new Set(list.map((item) => item.title));
    const expanded = new Set([...expandedTitles.value].filter((title) => titles.has(title)));
    if (expanded.size !== expandedTitles.value.size) {
      expandedTitles.value = expanded;
    }
  },
);

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    append-to="body"
    header="Notifications"
    class="lab-notifications-dialog lab-app-dialog lab-form-runtime text-lab-general-text"
    :style="{ width: 'min(32rem, 94vw)' }"
    :pt="{ root: { attrs: { id: generateUniqueId('lab-notifications-dialog') } } }"
  >
    <div class="lab-notifications">
      <p v-if="reconnecting && !connected" class="lab-notifications__status">Reconnecting…</p>

      <div v-if="loading" class="lab-notifications__loading">
        <ProgressSpinner style="width: 2rem; height: 2rem" />
      </div>

      <p v-else-if="notifications.length === 0" class="lab-notifications__empty">
        No notifications yet.
      </p>

      <template v-else>
        <!-- Selection header: select-all on the left, bulk delete on the right. -->
        <div class="lab-notifications__select-all">
          <Checkbox
            :model-value="allChecked"
            binary
            :indeterminate="someChecked"
            :input-id="generateUniqueId('lab-notifications-check-all')"
            aria-label="Select all notifications"
            @update:model-value="(v) => toggleAll(v === true)"
          />
          <span>Select all</span>
          <Button
            v-if="hasChecked"
            :label="`Delete ${checkedIds.size}`"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            text
            rounded
            :loading="deleting"
            :id="generateUniqueId('lab-notifications-delete-selected')"
            aria-label="Delete selected notifications"
            class="lab-notifications__delete-selected"
            @click="deleteSelected"
          />
        </div>

        <ul class="lab-notifications__list">
          <li v-for="group in groups" :key="group.title" class="lab-notifications__group">
            <!--
              One row per distinct title. The checkbox covers the whole group (including collapsed
              members), the body expands, and the delete button removes the whole group.
            -->
            <div class="lab-notifications__group-head">
              <Checkbox
                :model-value="isGroupChecked(group)"
                binary
                :input-id="generateUniqueId(`lab-notifications-check-${group.title}`)"
                :aria-label="`Select all ${group.items.length} notifications titled ${group.title}`"
                @update:model-value="(v) => toggleGroup(group, v === true)"
              />
              <button
                type="button"
                class="lab-notifications__group-toggle"
                :id="generateUniqueId(`lab-notifications-group-${group.title}`)"
                :aria-expanded="isExpanded(group.title)"
                :disabled="group.items.length === 1"
                @click="toggleExpanded(group.title)"
              >
                <i
                  class="pi"
                  :class="
                    group.items.length === 1
                      ? 'pi-blank'
                      : isExpanded(group.title)
                        ? 'pi-chevron-down'
                        : 'pi-chevron-right'
                  "
                  aria-hidden="true"
                />
                <span class="lab-notifications__title">{{ group.title }}</span>
                <span v-if="group.items.length > 1" class="lab-notifications__count">
                  {{ group.items.length }}
                </span>
                <span v-if="group.unreadCount > 0" class="lab-notifications__unread">
                  {{ group.unreadCount }} new
                </span>
              </button>
              <Button
                :id="generateUniqueId(`lab-notifications-remove-group-${group.title}`)"
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                :aria-label="`Delete all ${group.items.length} notifications titled ${group.title}`"
                class="lab-notifications__remove"
                @click="onRemove(group.latest)"
              />
            </div>

            <!--
              Body of the most recent occurrence, always visible: it is the context that tells you
              whether this group is worth opening, so hiding it behind the disclosure would defeat the
              point of collapsing.
            -->
            <p
              class="lab-notifications__text"
              :class="{ 'lab-notifications__text--indented': isExpanded(group.title) }"
            >
              {{ group.latest.body }}
            </p>
            <div
              v-if="group.latest.actions?.length"
              class="lab-notifications__actions"
              :class="{ 'lab-notifications__actions--indented': isExpanded(group.title) }"
            >
              <Button
                v-for="(action, actionIndex) in group.latest.actions"
                :key="`${group.latest.id}-${actionIndex}`"
                :label="action.label"
                size="small"
                :id="generateUniqueId(`lab-notifications-action-${group.latest.id}-${actionIndex}`)"
                @click="onRunAction(group.latest, action)"
              />
            </div>
            <time class="lab-notifications__time">{{ formatWhen(group.latest.createdAt) }}</time>

            <!--
              Individual occurrences. Ticking one of these selects just that row, so a group can be
              pruned selectively rather than only all-or-nothing.
            -->
            <ul v-if="isExpanded(group.title)" class="lab-notifications__occurrences">
              <li
                v-for="item in group.items"
                :key="item.id"
                class="lab-notifications__occurrence"
                :class="{ 'lab-notifications__occurrence--read': item.readAt }"
              >
                <Checkbox
                  :model-value="isChecked(item.id)"
                  binary
                  :input-id="generateUniqueId(`lab-notifications-check-${item.id}`)"
                  :aria-label="`Select notification from ${formatWhen(item.createdAt)}`"
                  @update:model-value="(v) => toggleChecked(item.id, v === true)"
                />
                <button
                  type="button"
                  class="lab-notifications__occurrence-body"
                  :id="generateUniqueId(`lab-notifications-occurrence-${item.id}`)"
                  :title="item.readAt ? item.body : `Mark read: ${item.body}`"
                  @click="onItemClick(item)"
                >
                  <span class="lab-notifications__occurrence-text">{{ item.body }}</span>
                  <div v-if="item.actions?.length" class="lab-notifications__actions">
                    <Button
                      v-for="(action, actionIndex) in item.actions"
                      :key="`${item.id}-${actionIndex}`"
                      :label="action.label"
                      size="small"
                      :id="generateUniqueId(`lab-notifications-occ-action-${item.id}-${actionIndex}`)"
                      @click.stop="onRunAction(item, action)"
                    />
                  </div>
                  <time class="lab-notifications__time">{{ formatWhen(item.createdAt) }}</time>
                </button>
                <Button
                  :id="generateUniqueId(`lab-notifications-remove-${item.id}`)"
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  aria-label="Delete notification"
                  class="lab-notifications__remove"
                  @click.stop="onRemove(item)"
                />
              </li>
            </ul>
          </li>
        </ul>
      </template>
    </div>
  </Dialog>
</template>

<style>
/*
 * Chrome copied from `.lab-integration-dialog` (lab-form-runtime.css) so this dialog matches the
 * Forms Builder dialogs. Unscoped because the dialog is teleported outside this component's scope.
 */
.lab-notifications-dialog.lab-app-dialog {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  background: var(--lab-general-bg);
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 90%, transparent);
  color: var(--lab-general-text);
  border-radius: 0.5rem;
  --lab-integration-chrome-bg: color-mix(
    in srgb,
    var(--lab-prime-surface-800) 22%,
    var(--lab-general-bg)
  );
  --lab-integration-body-bg: color-mix(
    in srgb,
    var(--lab-general-bg) 72%,
    var(--lab-prime-surface-500)
  );
  --lab-integration-field-bg: var(--lab-integration-chrome-bg);
  --lab-integration-field-border: color-mix(
    in srgb,
    var(--lab-general-border) 65%,
    var(--lab-prime-surface-700)
  );
  --lab-form-control-bg: var(--lab-integration-chrome-bg);
  --lab-form-control-border: var(--lab-integration-field-border);
}

.lab-notifications-dialog.lab-app-dialog .p-dialog-header {
  flex-shrink: 0;
  padding: 0.85rem 1.25rem;
  color: var(--lab-general-text);
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: var(--lab-integration-chrome-bg);
}

.lab-notifications-dialog.lab-app-dialog .p-dialog-title {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.lab-notifications-dialog.lab-app-dialog .p-dialog-content {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
  overflow-y: auto;
  color: var(--lab-general-text);
  background: var(--lab-integration-body-bg);
}

.lab-notifications {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
}

.lab-notifications__status,
.lab-notifications__empty {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--lab-general-text-muted);
}

.lab-notifications__loading {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
}

.lab-notifications__select-all {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0 0.45rem;
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-text-muted) 22%, transparent);
  font-size: 0.75rem;
  color: var(--lab-general-text-muted);
}

.lab-notifications__delete-selected {
  margin-left: auto;
  font-size: 0.75rem;
}

/*
 * `!important` because `tailwind.css` sets `ol, ul { list-style: disc !important }` globally for
 * prose/chat content. A scoped `list-style: none` loses to it regardless of selector specificity, so
 * this dialog was rendering a bullet beside every group and every occurrence.
 *
 * Overridden here rather than removing the global rule: that rule is what makes markdown lists in
 * chat render as lists, and narrowing it would break prose in a much more visible place.
 */
.lab-notifications__list,
.lab-notifications__occurrences {
  display: flex;
  flex-direction: column;
  margin: 0;
  /* Both properties are `!important` in `tailwind.css`; clearing only one leaves the indent. */
  padding: 0 !important;
  list-style: none !important;
}

.lab-notifications__list {
  gap: 0.5rem;
}

.lab-notifications__occurrences {
  gap: 0.25rem;
  margin-top: 0.4rem;
  padding-top: 0.4rem;
  padding-left: 0.9rem;
  border-top: 1px dashed color-mix(in srgb, var(--lab-general-border) 70%, transparent);
}

/* One card per title group. */
.lab-notifications__group {
  padding: 0.6rem 0.5rem 0.6rem 0.7rem;
  border: 1px solid var(--lab-integration-field-border);
  border-left: 3px solid var(--lab-section-accent, var(--lab-button-border-hover, #3b82f6));
  border-radius: 0.5rem;
  background: var(--lab-integration-field-bg);
}

.lab-notifications__group-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.lab-notifications__group-toggle {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

/* A single-occurrence group has nothing to expand, so it must not read as clickable. */
.lab-notifications__group-toggle:disabled {
  cursor: default;
}

.lab-notifications__group-toggle:focus-visible {
  outline: 2px solid var(--lab-accent-primary);
  outline-offset: 2px;
  border-radius: 0.25rem;
}

.lab-notifications__title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--lab-general-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lab-notifications__count {
  flex: 0 0 auto;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  border: 1px solid var(--lab-integration-field-border);
  background: var(--lab-integration-chrome-bg);
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--lab-general-text);
}

.lab-notifications__unread {
  flex: 0 0 auto;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--lab-section-accent, var(--lab-button-border-hover, #3b82f6));
}

.lab-notifications__text {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--lab-general-text-muted);
}

/* Indent to line up with the group's controls once the occurrences are open. */
.lab-notifications__text--indented {
  padding-left: 1.35rem;
}

.lab-notifications__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.45rem;
}

.lab-notifications__actions--indented {
  padding-left: 1.35rem;
}

.lab-notifications__time {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  color: var(--lab-general-text-muted);
}

.lab-notifications__occurrence {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
}

.lab-notifications__occurrence--read {
  opacity: 0.7;
}

.lab-notifications__occurrence-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.lab-notifications__occurrence-text {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--lab-general-text-muted);
}

.lab-notifications__remove {
  flex: 0 0 auto;
}
</style>
