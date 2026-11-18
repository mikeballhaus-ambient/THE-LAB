<script setup lang="ts">
import { TodoList } from '../../../shared/types';
import { useTodoList } from '../../../shared/composables/components/useTodoList';

const props = defineProps<{
    isVisible: boolean
    todolistRef: Map<string, TodoList[]> | undefined
    saveTodoList: (sessionId: string, todolist: TodoList | undefined) => Promise<void>
    deleteSessionTodoLists: (sessionId: string, todoListId: string) => Promise<void>
    activeTodoLists: TodoList[] | undefined
}>()
const emit = defineEmits<{
    (e: 'toggle-item-expansion', todoListId: string, itemIndex: number): void;
    (e: 'todo-list-updated', toolcallData: string): void;
}>()

const { expandedTodoLists, expandedTodoItems, expandedTaskSections, expandedTodoListsToggled, debouncedTodoListUpdatedHandler } = useTodoList(props.saveTodoList, props.deleteSessionTodoLists)
const toggleTodoList = (todoListId: string) => {
    expandedTodoLists.value[todoListId] = !expandedTodoLists.value[todoListId];
}

const toggleTaskSection = (itemId: string, todoListId: string) => {
    const key = `${todoListId}:${itemId}`;
    expandedTaskSections.value[key] = !expandedTaskSections.value[key];
}

const toggleItemExpansion = (itemIndex: number, todoListId: string) => {
    const key = `${todoListId}:${itemIndex}`;
    expandedTodoItems.value[key] = !expandedTodoItems.value[key];
    emit('toggle-item-expansion', todoListId, itemIndex);
}

const todoListUpdatedHandler = async (toolcallData: string) => await debouncedTodoListUpdatedHandler(toolcallData, props.todolistRef);

defineExpose({
    todoListUpdatedHandler
})
</script>
<template>
    <div class="z-6 fixed right-1" :class="{
        'top-[-1000px] transition-all duration-500 blur-[5px] opacity-50': !(isVisible && (activeTodoLists && activeTodoLists.length > 0)),
        'top-[5px] transition-all duration-500 blur-[0px] opacity-100': isVisible && (activeTodoLists && activeTodoLists.length > 0)
    }">
        <div class="lab-chat-session-overlay">
            <div class="lab-chat-session-overlay__stack">
                <div
                    class="lab-chat-session-overlay__summary"
                    @click="() => expandedTodoListsToggled = !expandedTodoListsToggled"
                >
                    <i class="lab-chat-session-overlay__summary-icon fa-solid fa-list" aria-hidden="true" />
                    <div v-if="activeTodoLists && activeTodoLists.length > 0">
                        {{ activeTodoLists.length }} Todo List(s) in this chat
                    </div>
                </div>
                <div v-if="expandedTodoListsToggled" class="lab-chat-session-overlay__body text-sm">
                    <div
                        v-for="todoList in activeTodoLists"
                        :key="todoList.todoListId"
                        class="lab-chat-session-overlay__list-block"
                    >
                    <div
                        class="lab-chat-session-overlay__list-toggle text-xs"
                        :class="{ 'italic line-through text-lab-general-text-muted': todoList.completed }"
                        @click="toggleTodoList(todoList.todoListId)"
                    >
                        <i
                            class="lab-chat-session-overlay__chevron fa-solid"
                            :class="expandedTodoLists[todoList.todoListId] ? 'fa-chevron-down' : 'fa-chevron-right'"
                            aria-hidden="true"
                        />
                        <i
                            class="fa-solid"
                            :class="{
                                'fa-check text-lab-general-text-muted': todoList.completed,
                                'fa-clipboard-list': !todoList.completed,
                            }"
                            aria-hidden="true"
                        />
                        <span>{{ todoList.name }}</span>
                    </div>
                    <div
                        v-show="expandedTodoLists[todoList.todoListId]"
                        class="lab-chat-session-overlay__items lab-chat-scrollbar text-xs"
                    >
                        <div
                            v-for="(item, i) in todoList.items"
                            :key="item.itemId"
                            class="lab-chat-session-overlay__item"
                            :class="{ 'lab-chat-session-overlay__item--done': item.completed }"
                        >
                            <div class="lab-chat-session-overlay__item-row" @click="toggleItemExpansion(i, todoList.todoListId)">
                                <i
                                    class="lab-chat-session-overlay__item-pin fa-solid"
                                    :class="item.completed ? 'fa-thumbtack-slash' : 'fa-thumbtack'"
                                    aria-hidden="true"
                                />
                                <div>{{ item.item }}</div>
                            </div>
                            <div
                                v-if="expandedTodoItems[`${todoList.todoListId}:${i}`]"
                                class="lab-chat-session-overlay__item-detail"
                            >
                                <div>
                                    <div class="lab-chat-session-overlay__detail-label">Description</div>
                                    <div class="text-lab-general-text">{{ item.itemData }}</div>
                                </div>
                                <div v-if="item.task">
                                    <div
                                        class="lab-chat-session-overlay__task-toggle"
                                        @click="toggleTaskSection(item.itemId, todoList.todoListId)"
                                    >
                                        <div class="flex items-center gap-2 flex-1 min-w-0">
                                            <i class="fa-solid fa-code" aria-hidden="true" />
                                            <span>Code Task</span>
                                        </div>
                                        <div
                                            v-if="item.task.persona"
                                            class="text-lab-general-text-muted flex gap-1 items-center whitespace-nowrap text-xs"
                                        >
                                            <span>Assigned:</span>
                                            <i v-if="item.task.persona == 'Chat'" class="fa fa-comment-dots" aria-hidden="true" />
                                            <i v-if="item.task.persona == 'Orchestrator'" class="fa fa-diagram-project" aria-hidden="true" />
                                            <i v-if="item.task.persona == 'Architect'" class="fa fa-compass-drafting" aria-hidden="true" />
                                            <i v-if="item.task.persona == 'Code'" class="fa fa-code" aria-hidden="true" />
                                            <i v-if="item.task.persona == 'Debug'" class="fa fa-bug" aria-hidden="true" />
                                            <i v-if="item.task.persona == 'QA'" class="fa fa-user-shield" aria-hidden="true" />
                                            <span>{{ item.task.persona }}</span>
                                        </div>
                                    </div>
                                    <div
                                        v-if="expandedTaskSections[`${todoList.todoListId}:${item.itemId}`]"
                                        class="lab-chat-session-overlay__task-panel"
                                    >
                                        <div>
                                            <div class="lab-chat-session-overlay__detail-label">Overview</div>
                                            <div>{{ item.task.description }}</div>
                                        </div>
                                        <div class="lab-chat-session-overlay__task-meta">
                                            <div v-if="item.task.type" class="flex gap-1 items-center">
                                                <span class="text-lab-general-text-muted">Type:</span>
                                                <span>{{ item.task.type }}</span>
                                            </div>
                                            <div v-if="item.task.priority" class="flex gap-1">
                                                <span class="text-lab-general-text-muted">Priority:</span>
                                                <span :class="{
                                                    'lab-chat-session-overlay__priority--high': item.task.priority === 'high',
                                                    'lab-chat-session-overlay__priority--medium': item.task.priority === 'medium',
                                                    'lab-chat-session-overlay__priority--low': item.task.priority === 'low',
                                                }">{{ item.task.priority }}</span>
                                            </div>
                                            <div v-if="item.task.filePath" class="flex gap-1 flex-wrap">
                                                <span class="text-lab-general-text-muted">File Path:</span>
                                                <code class="text-lab-general-text">{{ item.task.filePath }}</code>
                                            </div>
                                            <div v-if="item.task.codeContent" class="flex flex-col">
                                                <span class="text-lab-general-text-muted">Code Content:</span>
                                                <span>{{ item.task.codeContent }}</span>
                                            </div>
                                            <div v-if="item.task.operationAction" class="flex gap-1">
                                                <span class="text-lab-general-text-muted">Operation:</span>
                                                <span>{{ item.task.operationAction }}</span>
                                            </div>
                                            <div
                                                v-if="item.task.operationRangeStartLine && item.task.operationRangeEndLine"
                                                class="flex gap-1"
                                            >
                                                <span class="text-lab-general-text-muted">Range:</span>
                                                <span>
                                                    Line {{ item.task.operationRangeStartLine }} – {{ item.task.operationRangeEndLine }}
                                                </span>
                                            </div>
                                            <div v-if="item.task.dependencies && item.task.dependencies.length > 0">
                                                <div class="text-lab-general-text-muted">Dependencies</div>
                                                <ul class="list-disc ps-4 m-0">
                                                    <li v-for="dep in item.task.dependencies" :key="dep">{{ dep }}</li>
                                                </ul>
                                            </div>
                                            <div v-if="item.task.createdAt" class="flex gap-1">
                                                <span class="text-lab-general-text-muted">Created:</span>
                                                <span>{{ item.task.createdAt }}</span>
                                            </div>
                                            <div v-if="item.task.updatedAt" class="flex gap-1">
                                                <span class="text-lab-general-text-muted">Updated:</span>
                                                <span>{{ item.task.updatedAt }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
