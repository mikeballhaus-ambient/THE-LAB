<script setup lang="ts">
import { onMounted } from 'vue';
import TaskList from './components/TaskList.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const { generateUniqueId } = useUniqueElementId();

interface Props {
  serverUrl: string;
}

const props = defineProps<Props>();

onMounted(() => {
  console.log('Task List App initialized');
});
</script>

<template>
  <div
    class="task-list-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-w-0 flex flex-col"
    :id="generateUniqueId('task-list-app-root')"
  >
    <header class="lab-app-header shrink-0" :id="generateUniqueId('task-list-app-header')">
      <div>
        <h1 :id="generateUniqueId('title')" class="text-2xl font-semibold m-0">Task Manager</h1>
        <p :id="generateUniqueId('subtitle')" class="text-sm text-lab-general-text-muted m-0 mt-1">
          Organize and track your tasks efficiently
        </p>
      </div>
    </header>

    <main class="lab-app-body w-full pb-6" :id="generateUniqueId('task-list-app-body')">
      <TaskList :server-url="props.serverUrl" />
    </main>
  </div>
</template>
