<script setup lang="ts">
/** Read-only Sidecar strip for session todo_list data (Dexie). */
import { ref, watch } from 'vue';
import type { TodoList } from '@/shared/types';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  activeTodoLists: TodoList[] | undefined;
  chatReady: boolean;
}>();

const { generateUniqueId } = useUniqueElementId();

const expandedPanel = ref(false);
const expandedTodoLists = ref<Record<string, boolean>>({});

const toggleTodoList = (todoListId: string): void => {
  expandedTodoLists.value[todoListId] = !expandedTodoLists.value[todoListId];
};

watch(
  () => props.activeTodoLists,
  (lists, previous) => {
    if (!lists?.length) {
      return;
    }
    const prevCount = previous?.length ?? 0;
    if (prevCount === 0 && lists.length > 0) {
      expandedPanel.value = true;
    }
    for (const list of lists) {
      if (expandedTodoLists.value[list.todoListId] === undefined) {
        expandedTodoLists.value[list.todoListId] = true;
      }
    }
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <section
    v-if="chatReady && activeTodoLists && activeTodoLists.length > 0"
    class="lab-sidecar-session-todos text-xxs"
    :class="{ 'lab-sidecar-session-todos--expanded': expandedPanel }"
    :aria-label="`${activeTodoLists.length} todo list(s) for this session`"
  >
    <button
      type="button"
      class="lab-sidecar-session-todos__summary"
      :id="generateUniqueId('lab-sidecar-todos-toggle')"
      :aria-expanded="expandedPanel"
      @click="expandedPanel = !expandedPanel"
    >
      <span class="lab-sidecar-session-todos__summary-icon" aria-hidden="true">
        <i class="fa-solid fa-list-ul" />
      </span>
      <span class="lab-sidecar-session-todos__summary-label">Tasks</span>
      <span class="lab-sidecar-session-todos__summary-count">{{ activeTodoLists.length }}</span>
      <i
        class="fa-solid lab-sidecar-session-todos__summary-chevron"
        :class="expandedPanel ? 'fa-chevron-up' : 'fa-chevron-down'"
        aria-hidden="true"
      />
    </button>
    <div v-show="expandedPanel" class="lab-sidecar-session-todos__body lab-chat-scrollbar">
      <article
        v-for="todoList in activeTodoLists"
        :key="todoList.todoListId"
        class="lab-sidecar-session-todos__list"
      >
        <button
          type="button"
          class="lab-sidecar-session-todos__list-toggle"
          :class="{ 'lab-sidecar-session-todos__list-toggle--done': todoList.completed }"
          :id="generateUniqueId('lab-sidecar-todo-list')"
          :aria-expanded="!!expandedTodoLists[todoList.todoListId]"
          @click="toggleTodoList(todoList.todoListId)"
        >
          <span class="lab-sidecar-session-todos__chevron" aria-hidden="true">
            <i
              class="fa-solid"
              :class="expandedTodoLists[todoList.todoListId] ? 'fa-chevron-down' : 'fa-chevron-right'"
            />
          </span>
          <span class="lab-sidecar-session-todos__list-icon" aria-hidden="true">
            <i
              class="fa-solid"
              :class="todoList.completed ? 'fa-circle-check' : 'fa-clipboard-list'"
            />
          </span>
          <span class="lab-sidecar-session-todos__list-name truncate">{{ todoList.name }}</span>
        </button>
        <ul
          v-show="expandedTodoLists[todoList.todoListId]"
          class="lab-sidecar-session-todos__items list-none m-0 p-0"
        >
          <li
            v-for="item in todoList.items"
            :key="item.itemId"
            class="lab-sidecar-session-todos__item"
            :class="{ 'lab-sidecar-session-todos__item--done': item.completed }"
          >
            <div class="lab-sidecar-session-todos__item-main">
              <span
                class="lab-sidecar-session-todos__status"
                :class="{ 'lab-sidecar-session-todos__status--done': item.completed }"
                aria-hidden="true"
              >
                <i v-if="item.completed" class="fa-solid fa-check" />
              </span>
              <div class="lab-sidecar-session-todos__item-copy min-w-0">
                <div class="lab-sidecar-session-todos__item-title">{{ item.item }}</div>
                <p
                  v-if="item.itemData"
                  class="lab-sidecar-session-todos__item-detail m-0"
                >
                  {{ item.itemData }}
                </p>
              </div>
            </div>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>
