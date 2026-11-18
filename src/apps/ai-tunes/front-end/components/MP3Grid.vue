<script setup lang="ts">
import type { MP3Metadata } from '../../shared/types/mp3'
import MP3Card from './MP3Card.vue'

interface MP3GridProps {
  mp3s: MP3Metadata[]
  isLoading?: boolean
  hasError?: boolean
  isEmpty?: boolean
  serverBaseUrl?: string
}

const props = defineProps<MP3GridProps>()

</script>

<template>
  <div class="mp3-song-container w-full grid grid-cols-1 lg:grid-cols-2 gap-5 content-start">
    <MP3Card
      v-for="mp3 in props.mp3s"
      :server-base-url="props.serverBaseUrl"
      :key="mp3.file_path"
      :mp3="mp3"
    />
  </div>
</template>
