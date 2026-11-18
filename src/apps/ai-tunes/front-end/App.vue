<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useDebounceFn } from '@vueuse/shared'
import { io } from 'socket.io-client';

import SearchBar from './components/SearchBar.vue'
import MP3Grid from './components/MP3Grid.vue'
import SortableHeader from './components/SortableHeader.vue'
import type { MP3Metadata, SortDirection, SortField } from '../shared/types/mp3'
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId'

interface Props {
  serverUrl?: string;
  formsBuilderUrl?: string;
}

const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();

// Reactive state declarations
const socket = ref<ReturnType<typeof io> | null>(null);
const mp3s = ref<MP3Metadata[]>([])
const loading = ref<boolean>(true)
const error = ref<string | null>(null)
const searchTerm = ref<string>('')
const sortBy = ref<SortField>('title')
const sortDirection = ref<SortDirection>('asc')

// Audio state tracking (for visual feedback in MP3Card)
const playingState = ref<Record<string, boolean>>({})

// Computed filtered & sorted results
const displayedMP3s = computed(() => {
  let result = [...mp3s.value]

  // Apply search filter
  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(mp3 =>
      mp3?.title != null ? mp3.title.toLowerCase().includes(term) : false ||
        mp3?.artist != null ? mp3.artist?.includes(term) : false ||
          mp3?.album != null ? mp3.album.toLowerCase().includes(term) : false
    )
  }

  // Apply sort
  if (sortBy.value) {
    result.sort((a, b) => {
      let aVal = a[sortBy.value]
      let bVal = b[sortBy.value]

      // Handle string conversion for comparison
      aVal = String(aVal).toLowerCase()
      bVal = String(bVal).toLowerCase()

      if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
      return 0
    })
  }

  return result
})

const landingStats = computed(() => ({
  libraryCount: mp3s.value.length,
  showingCount: displayedMP3s.value.length,
  playingCount: Object.values(playingState.value).filter(Boolean).length,
  connected: socket.value?.connected === true,
}))

// Search handler (debounced 500ms)
const handleSearchUpdate = useDebounceFn((value: string) => {
  searchTerm.value = value
}, 500)

// Sort handler
const handleSortByChange = (field: SortField | null): void => {
  sortBy.value = field as SortField
}

const handleSortDirectionChange = (direction: 'asc' | 'desc'): void => {
  sortDirection.value = direction
}

// WebSocket connection logic
onMounted(() => {
  // Remove outdated autoplay policy event listener - it was blocking user-initiated play
  document.removeEventListener('play', (event: Event) => {
    console.log('Autoplay attempt detected:', event)
  })

  // Initialize WebSocket client
  try {
    socket.value = io(props.serverUrl);

    socket.value.on('connect', () => {
      console.log('Connected to MP3 server')
      requestMP3List()
    })

    socket.value.on('mp3_data', (data: { mp3s: MP3Metadata[] }) => {
      loading.value = false
      error.value = null
      mp3s.value = data.mp3s
      for (const mp3 of data.mp3s) {
        playingState.value[mp3.file_path] = false
      }
    })

    socket.value.on('error', (data: { message: string }) => {
      console.error('Socket error:', data.message)
      error.value = data.message
      loading.value = false
    })

    socket.value.on('connect_error', (err: Error) => {
      console.error('Socket connection error:', err)
      error.value = 'WebSocket connection timeout - please refresh'
      loading.value = false
    })

  } catch (err) {
    console.error('WebSocket client error:', err)
    error.value = 'Failed to connect to MP3 server'
    loading.value = false
  }
})

onUnmounted(() => {
  // Clean up socket connection
  if (socket.value) socket.value.disconnect()

  // Clear playing states
  playingState.value = {}
})

// Helper: request MP3 list from server
const requestMP3List = async () => {
  try {
    if (socket.value) {
      socket.value.emit('get_mp3_list', {})
    }
  } catch (err) {
    console.error('Failed to request MP3 list:', err)
  }
}
</script>

<template>
  <div
    class="ai-tunes-app app-loaded-container w-full min-h-full min-w-0 flex flex-col text-lab-general-text"
    :id="generateUniqueId('ai-tunes-app-root')"
  >
    <header class="ai-tunes-header lab-app-header" :id="generateUniqueId('ai-tunes-app-header')">
      <div class="min-w-0">
        <h1 :id="generateUniqueId('ai-tunes-title')" class="text-2xl font-semibold m-0">AI Tunes</h1>
        <p class="m-0 mt-1 text-sm text-lab-general-text-muted">Browse, search, and play tracks from your library</p>
      </div>
      <div class="flex flex-wrap items-center gap-3 shrink-0 max-w-full">
        <SortableHeader
          :label="sortBy"
          :is-sorted="!!sortBy"
          :sort-direction="sortDirection"
          :sort-by="sortBy"
          @update:sort-by="handleSortByChange"
          @update:sort-direction="handleSortDirectionChange"
        />
        <SearchBar
          v-model="searchTerm"
          placeholder="Search by song, artist, or album"
          @update:model-value="handleSearchUpdate"
          @clear="searchTerm = ''"
        />
      </div>
    </header>

    <main
      class="lab-app-body lab-app-body--pane-scroll"
      :id="generateUniqueId('ai-tunes-app-body')"
    >
      <div class="lab-app-landing w-full">
        <div>
          <h2 :id="generateUniqueId('ai-tunes-dashboard-heading')" class="text-lg font-semibold m-0">Dashboard</h2>
          <p class="m-0 mt-1 text-sm text-lab-general-text-muted">
            Your MP3 library streams from the app server over WebSocket.
          </p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div class="lab-app-kpi" :id="generateUniqueId('ai-tunes-kpi-library')">
            <span class="lab-app-kpi-label">In library</span>
            <span class="lab-app-kpi-value">{{ landingStats.libraryCount }}</span>
          </div>
          <div class="lab-app-kpi" :id="generateUniqueId('ai-tunes-kpi-showing')">
            <span class="lab-app-kpi-label">Showing</span>
            <span class="lab-app-kpi-value">{{ landingStats.showingCount }}</span>
          </div>
          <div class="lab-app-kpi" :id="generateUniqueId('ai-tunes-kpi-playing')">
            <span class="lab-app-kpi-label">Playing</span>
            <span class="lab-app-kpi-value text-emerald-400">{{ landingStats.playingCount }}</span>
          </div>
          <div class="lab-app-kpi" :id="generateUniqueId('ai-tunes-kpi-socket')">
            <span class="lab-app-kpi-label">Server</span>
            <span class="lab-app-kpi-value">{{ landingStats.connected ? 'Live' : '—' }}</span>
          </div>
        </div>

        <section
          class="ai-tunes-searchresults lab-app-panel"
          :id="generateUniqueId('ai-tunes-searchresults')"
        >
          <MP3Grid
            :mp3s="displayedMP3s"
            :is-loading="loading"
            :is-empty="loading && mp3s.length === 0"
            :has-error="!!error"
            :server-base-url="props.serverUrl"
          />
        </section>
      </div>
    </main>
  </div>
</template>
