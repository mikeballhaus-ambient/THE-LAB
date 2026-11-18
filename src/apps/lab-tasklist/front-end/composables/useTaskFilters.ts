import { ref, computed } from 'vue'
import type { TaskStatus, TaskPriority } from '../../shared/types'

/**
 * useTaskFilters - Filter logic and state management for tasks
 * Provides reactive filter state management for tasks
 */
export function useTaskFilters() {
  // State
  const statusFilter = ref<TaskStatus | 'all'>('all')
  const priorityFilter = ref<TaskPriority | 'all'>('all')
  const searchQuery = ref<string>('')
  const assigneeFilter = ref<string | null>(null)
  const dateRangeStart = ref<Date | null>(null)
  const dateRangeEnd = ref<Date | null>(null)
  const sortBy = ref<string>('createdAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  // Computed properties
  const filters = computed(() => ({
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    priority: priorityFilter.value === 'all' ? undefined : priorityFilter.value,
    assigneeId: assigneeFilter.value,
    startDate: dateRangeStart.value,
    endDate: dateRangeEnd.value,
    searchQuery: searchQuery.value
  }))

  const hasActiveFilters = computed(() => {
    return (
      statusFilter.value !== 'all' ||
      priorityFilter.value !== 'all' ||
      searchQuery.value.length > 0 ||
      assigneeFilter.value !== null ||
      dateRangeStart.value !== null ||
      dateRangeEnd.value !== null
    )
  })

  const clearFilters = computed(() => {
    return {
      status: 'all',
      priority: 'all',
      searchQuery: '',
      assigneeId: null,
      dateRangeStart: null,
      dateRangeEnd: null
    }
  })

  // Actions
  const setStatusFilter = (status: TaskStatus | 'all') => {
    statusFilter.value = status
  }

  const setPriorityFilter = (priority: TaskPriority | 'all') => {
    priorityFilter.value = priority
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  const setAssigneeFilter = (assigneeId: string | null) => {
    assigneeFilter.value = assigneeId
  }

  const setDateRangeStart = (date: Date | null) => {
    dateRangeStart.value = date
  }

  const setDateRangeEnd = (date: Date | null) => {
    dateRangeEnd.value = date
  }

  const setSortBy = (field: string) => {
    sortBy.value = field
  }

  const setSortOrder = (order: 'asc' | 'desc') => {
    sortOrder.value = order
  }

  const clearAllFilters = () => {
    statusFilter.value = 'all'
    priorityFilter.value = 'all'
    searchQuery.value = ''
    assigneeFilter.value = null
    dateRangeStart.value = null
    dateRangeEnd.value = null
  }

  const resetFilters = () => {
    clearAllFilters()
    setStatusFilter('all')
    setPriorityFilter('all')
  }

  // Public API
  return {
    // State
    statusFilter,
    priorityFilter,
    searchQuery,
    assigneeFilter,
    dateRangeStart,
    dateRangeEnd,
    sortBy,
    sortOrder,
    filters,
    hasActiveFilters,
    clearFilters,

    // Actions
    setStatusFilter,
    setPriorityFilter,
    setSearchQuery,
    setAssigneeFilter,
    setDateRangeStart,
    setDateRangeEnd,
    setSortBy,
    setSortOrder,
    clearAllFilters,
    resetFilters
  }
}
