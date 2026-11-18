<script setup lang="ts">
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId'

const { generateUniqueId } = useUniqueElementId()

interface Props {
  message?: string
  timestamp?: number
}

const props = withDefaults(defineProps<Props>(), {
  message: 'An error occurred',
})

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="error-boundary w-full rounded-lg border border-red-500/40 bg-red-950/40 p-6 text-red-100">
    <h2 :id="generateUniqueId('error-boundary-message')" class="text-xl font-bold text-red-200 mb-2">{{ props.message }}</h2>
    <p v-if="props.timestamp" class="text-sm text-red-300/90 mb-2">
      Error occurred at: {{ formatDate(props.timestamp) }}
    </p>
    <p class="text-red-200/90">Please refresh the page or contact support.</p>
  </div>
</template>
