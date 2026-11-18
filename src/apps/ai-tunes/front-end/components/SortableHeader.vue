<script setup lang="ts">
import { watch, ref } from 'vue'
import type { SortDirection, SortField } from '../../shared/types/mp3'
import Select from 'primevue/select'
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId'

const { generateUniqueId } = useUniqueElementId()

interface SortableHeaderProps {
  label: string
  isSorted?: boolean
  sortDirection?: 'asc' | 'desc'
  sortBy?: SortField | null
}

interface Emits {
  (e: 'update:sortBy', field: SortField | null): void
  (e: 'update:sortDirection', direction: SortDirection): void
}

const emit = defineEmits<Emits>()

const props = withDefaults(defineProps<SortableHeaderProps>(), {
  isSorted: false,
  sortDirection: 'asc',
  sortBy: null
})

// Local ref to track sortBy independently from prop
const localSortBy = ref<SortField | null>(null)

// Sync with prop when it changes
watch(() => props.sortBy, (value) => {
  if (!localSortBy.value) {
    localSortBy.value = value
  }
}, { immediate: true })

// Emit updated sortBy back to parent
const handleSortByChange = (value: SortField | null) => {
  localSortBy.value = value
  emit('update:sortBy', value)
}

// Local ref to track sortDirection independently from prop
const localSortDirection = ref<'asc' | 'desc'>('asc')

// Sync with prop when it changes
watch(() => props.sortDirection, (value) => {
  if (!localSortDirection.value) {
    localSortDirection.value = value
  }
}, { immediate: true })

// Emit updated sortDirection back to parent
const handleSortDirectionChange = (value: 'asc' | 'desc') => {
  localSortDirection.value = value
  emit('update:sortDirection', localSortDirection.value)
}

// Field display options
const fieldDisplayOptions = [
  { value: 'title', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'album', label: 'Album' }
]

// Direction options
const directionOptions = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' }
]
</script>

<template>
  <!-- Container instead of single button -->
  <div
    class="flex! items-center! gap-2! px-4! py-3! border-surface-300! hover:!bg-surface-50! dark:hover:!bg-surface-950! focus:outline-none! transition-colors! rounded!">
    <!-- Sort Field Select -->
    <Select v-model="localSortBy" :options="fieldDisplayOptions" option-label="label" option-value="value"
      @change="(event: any) => handleSortByChange(event.value)"
      :pt="{ root: { attrs: { id: generateUniqueId('select-field') } }}" />

    <!-- Sort Direction Select -->
    <Select v-model="localSortDirection" :options="directionOptions" placeholder="Direction" option-label="label"
      option-value="value" @change="(event: any) => handleSortDirectionChange(event.value)"
      :pt="{ root: { attrs: { id: generateUniqueId('select-direction') } }}" />

    <span class="!px-2!">
      <span class="flex! gap-0.5! items-center!">
        <span class="text-cyan-500">
          <span v-if="localSortDirection === 'asc'" class="pi pi-sort-amount-up text-xs"></span>
          <span v-if="localSortDirection === 'desc'" class="pi pi-sort-amount-down text-xs"></span>
        </span>
      </span>
    </span>
  </div>
</template>
