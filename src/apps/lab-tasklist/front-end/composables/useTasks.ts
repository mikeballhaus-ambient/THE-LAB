import { ref, computed } from 'vue'
import type { Task, TaskFilter, TaskSort } from '../../shared/types'
import { TaskStatus } from '../../shared/types'
import { labAppFetch } from '@/shared/composables/useLabUserHeaders'

/**
 * useTasks - Task state management and API calls
 * Provides reactive state management for tasks with API integration
 */
export function useTasks(serverBaseUrl: string) {
  const api_base_url = ref<string>(serverBaseUrl)
  // State
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<TaskFilter>({})
  const sort = ref<TaskSort>({
    field: 'createdAt',
    direction: 'desc'
  })
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Computed properties
  const filteredTasks = computed(() => {
    if (tasks.value) {
      let result = [...tasks.value]

      // Apply filters
      if (filters.value.status) {
        result = result.filter(task => task.status === filters.value.status)
      }

      if (filters.value.priority) {
        result = result.filter(task => task.priority === filters.value.priority)
      }

      if (filters.value.searchQuery) {
        const query = filters.value.searchQuery.toLowerCase()
        result = result.filter(task =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
        )
      }

      // Apply sorting
      result.sort((a, b) => {
        const aValue = a[sort.value.field] as string
        const bValue = b[sort.value.field] as string

        if (aValue && bValue) {
          if (aValue < bValue) return sort.value.direction === 'asc' ? -1 : 1
          if (aValue > bValue) return sort.value.direction === 'asc' ? 1 : -1
        }
        return 0
      })

      // Apply pagination
      const start = (pagination.value.page - 1) * pagination.value.limit
      const end = start + pagination.value.limit
      return result.slice(start, end)
    }
    return []
  })

  const totalTasks = computed(() => tasks.value.length)
  const completedTasks = computed(() =>
    tasks.value.filter(task => task.status === TaskStatus.COMPLETED).length
  )

  // API Functions
  const fetchTasks = async (
    page?: number,
    filter?: TaskFilter,
    sort?: TaskSort,
    limit?: number,
  ) => {
    loading.value = true
    error.value = null

    try {
      // Use default values if not provided
      const pageNum = page ?? 1
      const filterObj = filter ?? {}
      const sortObj = sort ?? { field: 'createdAt', direction: 'desc' }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: (limit ?? pagination.value.limit).toString(),
        sortField: sortObj.field,
        sortDirection: sortObj.direction,
        ...(filterObj.status && { status: filterObj.status }),
        ...(filterObj.priority && { priority: filterObj.priority }),
        ...(filterObj.assigneeId && { assigneeId: filterObj.assigneeId }),
        ...(filterObj.startDate && { startDate: filterObj.startDate instanceof Date ? filterObj.startDate.toISOString() : String(filterObj.startDate) }),
        ...(filterObj.endDate && { endDate: filterObj.endDate instanceof Date ? filterObj.endDate.toISOString() : String(filterObj.endDate) }),
        ...(filterObj.searchQuery && { searchQuery: filterObj.searchQuery })
      })

      const response = await labAppFetch(`${api_base_url.value}/api/tasks?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`)
      }

      const data = await response.json()
      tasks.value = data.data.tasks
      pagination.value = data.data.pagination
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
    } finally {
      loading.value = false
    }
  }

  const deleteTask = async (id: number) => {
    loading.value = true
    error.value = null

    try {
      const response = await labAppFetch(`${api_base_url.value}/api/tasks/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`)
      }

      tasks.value = tasks.value.filter(task => task.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getTaskStats = async () => {
    try {
      const response = await labAppFetch(`${api_base_url.value}/api/tasks/stats`)
      if (!response.ok) {
        throw new Error(`Failed to fetch task stats: ${response.statusText}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to fetch task stats:', err)
      return null
    }
  }

  // Public API
  return {
    // State
    tasks: computed(() => filteredTasks.value),
    allTasks: tasks,
    loading,
    error,
    filters,
    sort,
    pagination,
    totalTasks,
    completedTasks,

    // Actions
    fetchTasks,
    deleteTask,
    getTaskStats,

    // Getters
    getFilteredTasks: () => filteredTasks.value,
    getTaskById: (id: number) => tasks.value.find(task => task.id === id)
  }
}
