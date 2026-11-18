import { ref, computed } from 'vue'
import type { TaskList, FindTaskListsFilter } from '../../shared/types'
import { labAppFetch } from '@/shared/composables/useLabUserHeaders'

/**
 * useTaskLists - Task list state management and API calls
 * Provides reactive state management for task lists with API integration
 */
export function useTaskLists(serverBaseUrl: string) {
  const api_base_url = ref<string>(serverBaseUrl)
  // State
  const taskLists = ref<TaskList[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<FindTaskListsFilter>({})
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Computed properties
  const filteredTaskLists = computed(() => {
    if (taskLists.value) {
      let result = [...taskLists.value]

      // Apply filters
      if (filters.value.searchQuery) {
        const query = filters.value.searchQuery.toLowerCase()
        result = result.filter(list =>
          list.name.toLowerCase().includes(query) ||
          list.description?.toLowerCase().includes(query)
        )
      }

      return result
    }
    return []
  })

  const totalLists = computed(() => taskLists.value.length)
  const completedLists = computed(() =>
    taskLists.value.filter(list => list.completedCount > 0).length
  )

  // API Functions
  const fetchTaskLists = async (filter: FindTaskListsFilter = {}) => {
    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        ...(filter.searchQuery && { searchQuery: filter.searchQuery }),
        ...(filter.limit && { limit: filter.limit?.toString() }),
        ...(filter.offset !== undefined && { offset: filter.offset?.toString() }),
        ...(filter.page && { page: filter.page?.toString() })
      })

      const response = await labAppFetch(`${api_base_url.value}/api/task-lists?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch task lists: ${response.statusText}`)
      }

      const data = await response.json()
      taskLists.value = data.data.lists
      pagination.value = data.data.pagination
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
    } finally {
      loading.value = false
    }
  }

  const deleteTaskList = async (id: number) => {
    loading.value = true
    error.value = null

    try {
      const response = await labAppFetch(`${api_base_url.value}/api/task-lists/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete task list: ${response.statusText}`)
      }

      taskLists.value = taskLists.value.filter(list => list.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getTaskListWithTasks = async (id: string) => {
    try {
      const response = await labAppFetch(`${api_base_url.value}/api/task-lists/${id}/with-tasks`)
      if (!response.ok) {
        throw new Error(`Failed to fetch task list with tasks: ${response.statusText}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to fetch task list with tasks:', err)
      return null
    }
  }

  const getTaskListStats = async (id: string) => {
    try {
      const response = await labAppFetch(`${api_base_url.value}/api/task-lists/${id}/stats`)
      if (!response.ok) {
        throw new Error(`Failed to fetch task list stats: ${response.statusText}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to fetch task list stats:', err)
      return null
    }
  }

  // Public API
  return {
    // State
    taskLists: computed(() => filteredTaskLists.value),
    allTaskLists: taskLists,
    loading,
    error,
    filters,
    totalLists,
    completedLists,

    // Actions
    fetchTaskLists,
    deleteTaskList,
    getTaskListWithTasks,
    getTaskListStats
  }
}
