<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import Hover from 'wavesurfer.js/dist/plugins/hover.js'
import { MP3Metadata } from '../../shared/types/mp3'

const props = defineProps<{
  mp3: MP3Metadata
  serverBaseUrl?: string
}>()

const waveform = ref<HTMLDivElement | null>(null)
const streamUrl = `${props.serverBaseUrl}/stream/${encodeURIComponent(props.mp3.file_path)}`

let ws: WaveSurfer | null = null

onMounted(() => {
  if (!waveform.value) return

  ws = WaveSurfer.create({
    container: waveform.value,
    waveColor: 'oklch(0.554 0.046 257.417)',
    progressColor: 'oklch(0.554 0.046 257.417)',
    hideScrollbar: false,
    cursorWidth: 2,
    cursorColor: 'oklch(0.554 0.046 257.417)',
    height: 75,
    interact: true, // Static UI container
    url: streamUrl,
    fetchParams: {
      mode: 'cors'
    },
    mediaControls: true,
    normalize: true,

    plugins: [
      Hover.create({
        lineColor: '#38bdf8',
        lineWidth: 2,
        labelBackground: '#1e293b',
        labelColor: '#f8fafc',
        labelSize: '11px'
      })
    ]
  })
})

onUnmounted(() => {
  if (ws) {
    ws.stop()
    ws.destroy()
  }
})

// Helper function to format numbers with thousand separators as per en-US locale
const formatBitrate = (value: number | string | null): string => {
  if (value === null) return '--'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '--'
  return new Intl.NumberFormat('en-US').format(parseInt(num.toFixed(0)))
}

// Helper function to convert total seconds to MM:SS format
const formatDuration = (secondsString: string | number | null): string => {
  if (secondsString === null) return '--:--'
  const duration = typeof secondsString === 'string' ? parseFloat(secondsString) : secondsString
  if (isNaN(duration)) return '--:--'
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes} mins : ${seconds.toFixed(0)} secs`
}

</script>

<template>
  <div class="mp3-song-item bg-lab-general-bg-muted border-lab-general-border p-3! border rounded-lg! shadow-lg!">
    <div class="mp3-song-item-card flex flex-col gap-2 text-xs">
      <div class="mp3-song-item-card-header flex justify-between">
        <div class="mp3-song-item-card-header-title px-3 py-0.5 rounded bg-lab-general-bg-muted text-lab-general-text text-sm">
          {{ props.mp3.title }}
        </div>
        <div class="mp3-song-item-card-header-album px-3 py-0.5 rounded bg-lab-general-bg-muted text-lab-general-text-muted text-sm">
          {{ props.mp3.album }} • {{ props.mp3.year }}
        </div>
      </div>
      <div class="mp3-song-item-card-content flex gap-2 items-center">
        <div
          class="min-h-[175px] h-[175px] flex flex-1 flex-col h-full shadow text-lab-general-text-muted/80 bg-lab-general-bg-muted/80 rounded-lg border border-lab-general-border">
          <div class="flex items-center border-b border-lab-general-border px-3 py-1.5">
            <div class="font-bold w-[75px] min-w-[75px]">Artist(s):</div>
            <div class="italic">
              {{ props.mp3.artist ? props.mp3.artist.join(' - ') : '' }}
            </div>
          </div>
          <div class="flex items-center border-b border-lab-general-border px-3 py-1.5">
            <div class="font-bold w-[75px] min-w-[75px]">Bitrate:</div>
            <div class="italic">
              {{ formatBitrate(props.mp3.bitrate) }}
            </div>
          </div>
          <div class="flex items-center border-b border-lab-general-border px-3 py-1.5">
            <div class="font-bold w-[75px] min-w-[75px]">Duration:</div>
            <div class="italic">
              {{ formatDuration(props.mp3.duration_seconds) }}
            </div>
          </div>
          <div class="flex items-center border-b border-lab-general-border px-3 py-1.5">
            <div class="font-bold w-[75px] min-w-[75px]">Track #:</div>
            <div class="italic">
              {{ props.mp3.track }}
            </div>
          </div>
          <div class="flex items-center px-3 py-1.5">
            <div class="font-bold w-[75px] min-w-[75px]">File:</div>
            <div class="italic">
              {{ props.mp3.file_path }}
            </div>
          </div>
        </div>
        <div class="mp3-song-item-card-content-media h-[175px] w-full flex-2 relative">
          <div
            class="w-full select-none rounded-lg border border-lab-general-border bg-[color-mix(in_srgb,var(--lab-general-bg)_80%,transparent)] p-4"
          >
            <div class="ai-tunes-wavesurfer-host relative block!">
              <div ref="waveform" class="w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-tunes-wavesurfer-host :deep(div::part(wrapper)) {
  margin-bottom: 8px !important;
}

.ai-tunes-wavesurfer-host :deep(audio[controls]) {
  position: relative !important;
  display: block !important;
}
</style>
