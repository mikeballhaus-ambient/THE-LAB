<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import InputText from 'primevue/inputtext'
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId'

const { generateUniqueId } = useUniqueElementId()

interface SearchBarProps {
  modelValue: string
  placeholder?: string
}

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void; (e: 'clear'): void }>()

const emitValue = (value: string) => {
  emit('update:modelValue', value)
}

withDefaults(defineProps<SearchBarProps>(), {
  placeholder: 'Search by song, artist, or album',
  modelValue: ''
})

const debouncedUpdate = useDebounceFn((value: string) => {
  if (value == '') {
    emit('clear')
  } else {
    emitValue(value)
  }
}, 500)

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  debouncedUpdate(target.value)
}
</script>

<template>
  <div class="mp3-song-search flex! w-full! gap-2">
    <InputText
      type="text"
      :pt="{ root: { class: 'bg-lab-general-bg-muted! text-sm! px-4! py-2!', attrs: { id: generateUniqueId('ai-tunes-search-input') } } }"
      class="w-[250px]"
      :value="modelValue"
      :placeholder="placeholder"
      @input="handleInput"
    />
  </div>
</template>
